/*
 * Pryntor original local workflow execution kernel, PRY-128.
 * No external model/API calls, scripts, eval, network, or autonomous publication.
 * Implements a bounded deterministic subset of user-facing graph functionality.
 * NOT a clone of any third-party proprietary execution backend.
 */
export const GRAPH_VERSION = 1;
export const MAX_NODES = 64;
export const MAX_ITEMS = 200;
export const MAX_DATA_CHARS = 32768;
export const NODE_TYPES = Object.freeze([
  "input", "constant", "transform", "condition",
  "foreach", "select", "approval", "output"
]);
const OPS = new Set(["trim", "lower", "upper", "prefix", "suffix", "unique"]);
const TESTS = new Set(["contains", "equals", "nonempty", "gte"]);
const VALID_ID = /^[a-z][a-z0-9_-]{0,39}$/;
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);

const plain = value => value !== null && typeof value === "object"
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

function sizeGuard(value) {
  let serial;
  try { serial = JSON.stringify(value); }
  catch { throw new Error("Data must be JSON-serialisable"); }
  if (serial === undefined || serial.length > MAX_DATA_CHARS) {
    throw new Error("Data exceeds the local 32 KB run budget");
  }
  return JSON.parse(serial);
}

function scalarText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  if (value === null) return "";
  throw new Error("This node requires a text, number or boolean input");
}

function transformed(operation, data, argument) {
  if (operation === "unique") {
    if (!Array.isArray(data)) throw new Error("Unique requires an array");
    return [...new Set(data.map(scalarText))];
  }
  const text = scalarText(data);
  if (operation === "trim") return text.trim();
  if (operation === "lower") return text.toLocaleLowerCase("en");
  if (operation === "upper") return text.toLocaleUpperCase("en");
  if (operation === "prefix") return scalarText(argument ?? "") + text;
  if (operation === "suffix") return text + scalarText(argument ?? "");
  throw new Error("Unapproved transformation");
}

function condition(test, value, expected) {
  if (test === "nonempty") {
    return Array.isArray(value) ? value.length > 0 : scalarText(value).trim().length > 0;
  }
  if (test === "equals") return value === expected;
  if (test === "contains") {
    if (Array.isArray(value)) return value.includes(expected);
    return scalarText(value).includes(scalarText(expected));
  }
  if (test === "gte") {
    if (typeof value !== "number" || !Number.isFinite(value) ||
        typeof expected !== "number" || !Number.isFinite(expected)) {
      throw new Error("GTE requires two finite numbers");
    }
    return value >= expected;
  }
  throw new Error("Unknown condition");
}

/* Requires topologically ordered nodes. No loops, arbitrary commands or recursion. */
export function validateGraph(graph) {
  const errors = [];
  if (!plain(graph) || graph.schema_version !== GRAPH_VERSION || !Array.isArray(graph.nodes)) {
    return ["Expected a schema_version 1 graph containing nodes"];
  }
  if (graph.nodes.length < 1 || graph.nodes.length > MAX_NODES) {
    return ["Graph must contain 1 to 64 nodes"];
  }
  const known = new Map();
  for (const [index, node] of graph.nodes.entries()) {
    const p = "node[" + index + "]";
    if (!plain(node)) { errors.push(p + ": node must be an object"); continue; }
    if (typeof node.id !== "string" || !VALID_ID.test(node.id) || RESERVED.has(node.id)) {
      errors.push(p + ": unsafe or invalid node ID"); continue;
    }
    if (known.has(node.id)) errors.push(node.id + ": duplicate ID");
    if (!NODE_TYPES.includes(node.type)) errors.push(node.id + ": unapproved node kind");
    let deps = [];
    if (node.type === "select") {
      if (!Array.isArray(node.from) || node.from.length < 1 || node.from.length > 8) {
        errors.push(node.id + ": select needs 1 to 8 upstream nodes");
      } else deps = node.from;
    } else if (node.type !== "input" && node.type !== "constant") {
      deps = [node.from];
    } else if (node.from !== undefined) {
      errors.push(node.id + ": source node must not take a dependency");
    }
    for (const dep of deps) {
      if (typeof dep !== "string" || !known.has(dep)) {
        errors.push(node.id + ": dependency must be a preceding node");
      }
      if (dep === node.id) errors.push(node.id + ": self-cycle prohibited");
    }
    if (node.when !== undefined) {
      if (!plain(node.when) || typeof node.when.equals !== "boolean" ||
          !known.has(node.when.node) || known.get(node.when.node) !== "condition") {
        errors.push(node.id + ": guard needs preceding condition and boolean match");
      }
    }
    if (node.type === "input" &&
        (typeof node.key !== "string" || !VALID_ID.test(node.key) || RESERVED.has(node.key))) {
      errors.push(node.id + ": unsafe or missing input key");
    }
    if (node.type === "constant") {
      try { sizeGuard(node.value); } catch { errors.push(node.id + ": invalid constant"); }
    }
    if ((node.type === "transform" || node.type === "foreach") &&
        !OPS.has(node.operation)) errors.push(node.id + ": unapproved operation");
    if (node.type === "condition" && !TESTS.has(node.test)) {
      errors.push(node.id + ": unapproved condition");
    }
    if (node.type === "approval" && node.when) {
      errors.push(node.id + ": approval may not be guarded or bypassed");
    }
    if (node.type === "output" && node.when) {
      errors.push(node.id + ": output may not be conditional");
    }
    known.set(node.id, node.type);
  }
  const hasOutput = graph.nodes.some(node => node && node.type === "output");
  if (!hasOutput) errors.push("A final output node is required");
  // Mandatory approval cut: every path to every exported output crosses a review.
  // A detached review node or a side-channel output does not count as approval.
  const reviewedPaths = new Map();
  for (const node of graph.nodes) {
    if (!plain(node) || typeof node.id !== "string") continue;
    const refs = node.type === "select" ? (Array.isArray(node.from) ? node.from : []) :
      (node.type === "input" || node.type === "constant") ? [] : [node.from];
    const verifiedLineage = refs.length > 0 && refs.every(ref => reviewedPaths.get(ref) === true);
    const crossesApproval = node.type === "approval" || verifiedLineage;
    reviewedPaths.set(node.id, crossesApproval);
    if (node.type === "output" && !crossesApproval) {
      errors.push(node.id + ": every output path must cross a human approval node");
    }
  }
  try { sizeGuard(graph); } catch { errors.push("Graph exceeds the local 32 KB budget"); }
  return errors;
}

/* Returns a trace rather than throwing on workflow execution errors. */
export function runGraph(graph, inputs = {}, approvals = {}, options = {}) {
  const issues = validateGraph(graph);
  if (issues.length) return { status:"INVALID", errors:issues, trace:[], outputs:[] };
  if (!plain(inputs) || !plain(approvals) || !plain(options)) {
    return { status:"INVALID", errors:["Inputs, approvals and options must be plain objects"], trace:[], outputs:[] };
  }
  try { sizeGuard(inputs); sizeGuard(approvals); }
  catch { return { status:"INVALID", errors:["Input or approval envelope exceeds the local budget"], trace:[], outputs:[] }; }
  const states = Object.create(null);
  const values = Object.create(null);
  const trace = [];
  let failures = 0, holds = 0;
  const record = (node, status, detail = "") => {
    states[node.id] = status;
    trace.push({ id:node.id, kind:node.type, status, detail });
    if (status === "FAILED") failures++;
    if (status === "WAITING_APPROVAL") holds++;
  };
  for (const node of graph.nodes) {
    if (node.when) {
      const upstream = states[node.when.node];
      if (upstream !== "SUCCESS") {
        record(node, upstream === "FAILED" ? "FAILED" : upstream === "WAITING_APPROVAL" ? "WAITING_APPROVAL" : "SKIPPED", "Condition unavailable");
        continue;
      }
      if (values[node.when.node] !== node.when.equals) {
        record(node, "SKIPPED", "Condition did not match"); continue;
      }
    }
    const deps = node.type === "select" ? node.from :
      (node.type === "input" || node.type === "constant") ? [] : [node.from];
    if (deps.some(id => states[id] === "FAILED")) {
      record(node, "FAILED", "Upstream failure"); continue;
    }
    if (deps.some(id => states[id] === "WAITING_APPROVAL")) {
      record(node, "WAITING_APPROVAL", "Human approval required upstream"); continue;
    }
    if (node.type !== "select" && deps.some(id => states[id] === "SKIPPED")) {
      record(node, "SKIPPED", "Inactive branch"); continue;
    }
    const fromValue = deps.length ? values[deps[0]] : undefined;
    try {
      let output;
      if (node.type === "input") {
        if (!Object.prototype.hasOwnProperty.call(inputs, node.key)) throw new Error("Missing required input: " + node.key);
        output = sizeGuard(inputs[node.key]);
      } else if (node.type === "constant") {
        output = sizeGuard(node.value);
      } else if (node.type === "transform") {
        output = transformed(node.operation, fromValue, node.argument);
      } else if (node.type === "condition") {
        output = condition(node.test, fromValue, node.expected);
      } else if (node.type === "foreach") {
        if (!Array.isArray(fromValue)) throw new Error("Iterator expects a list");
        if (fromValue.length > MAX_ITEMS) throw new Error("Iterator maximum 200 items exceeded");
        output = fromValue.map(item => transformed(node.operation, item, node.argument));
      } else if (node.type === "select") {
        const good = deps.find(id => states[id] === "SUCCESS");
        if (good === undefined) { record(node, "SKIPPED", "No active branch"); continue; }
        output = values[good];
      } else if (node.type === "approval") {
        const receipt = approvals[node.id];
        // A user-supplied name and boolean cannot certify a real reviewer.
        // Only the approved host's verifier, never the graph, controls release.
        let trusted = false;
        if (plain(receipt) && receipt.approved === true &&
            typeof receipt.reviewer === "string" && receipt.reviewer.trim() &&
            typeof options.verifyApproval === "function") {
          try {
            trusted = options.verifyApproval({
              nodeId: node.id,
              receipt: sizeGuard(receipt),
              graph: sizeGuard(graph),
              inputs: sizeGuard(inputs),
            }) === true;
          } catch { trusted = false; }
        }
        if (!trusted) {
          record(node, "WAITING_APPROVAL", "Operator-authenticated, exact-run approval required"); continue;
        }
        output = fromValue;
      } else if (node.type === "output") {
        output = fromValue;
      } else {
        throw new Error("Unimplemented node type");
      }
      values[node.id] = sizeGuard(output);
      record(node, "SUCCESS");
    } catch (err) {
      record(node, "FAILED", err instanceof Error ? err.message : "Unknown execution error");
    }
  }
  const outputs = graph.nodes.filter(n => n.type === "output").map(n => ({
    node:n.id, status:states[n.id], value:states[n.id] === "SUCCESS" ? values[n.id] : null
  }));
  const status = failures ? "FAILED" : holds ? "WAITING_APPROVAL" :
    outputs.every(o => o.status === "SUCCESS") ? "COMPLETED" : "INCOMPLETE";
  // Atomic output release: no partially successful values leak on held/failed runs.
  if (status !== "COMPLETED") outputs.forEach(o => { o.value = null; });
  return { status, trace, outputs, errors:[], execution:"LOCAL_DETERMINISTIC_ONLY" };
}

export function exampleGraph() {
  return { schema_version:1, name:"Original creative-brief review", nodes:[
    {id:"brief", type:"input", key:"brief"},
    {id:"clean", type:"transform", from:"brief", operation:"trim"},
    {id:"has_region", type:"condition", from:"clean", test:"contains", expected:"South Africa"},
    {id:"regional", type:"transform", from:"clean", operation:"prefix", argument:"Original regional concept: ", when:{node:"has_region", equals:true}},
    {id:"general", type:"transform", from:"clean", operation:"prefix", argument:"Original generic concept: ", when:{node:"has_region", equals:false}},
    {id:"chosen", type:"select", from:["regional","general"]},
    {id:"review", type:"approval", from:"chosen"},
    {id:"final", type:"output", from:"review"}
  ]};
}
