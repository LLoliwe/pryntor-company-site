/*
 * PRY-128 original workflow-graph editor model. Local, deterministic, R0.
 * This is an editing surface, not a third-party implementation or a claim of parity.
 * No credentials, tool calls, network access, provider output or approvals here.
 */
import { exampleGraph, validateGraph, MAX_NODES } from './workflow_engine.mjs';
const EDITABLE = new Set(['input','constant','transform','condition','foreach','select','approval','output']);
const CONNECTABLE = new Set(['transform','condition','foreach','select','approval','output']);
const ID = /^[a-z][a-z0-9_-]{0,39}$/;
const BLOCKED_KEYS = new Set(['__proto__','constructor','prototype']);
const MAX_FILE = 32768;
export const FIELD_LIMITS = Object.freeze({ input: 'key', constant: 'value', transform: 'operation', condition: 'test', foreach: 'operation' });
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function own(obj,key) {return Object.prototype.hasOwnProperty.call(obj,key);}
function checked(graph) {
  const errors=validateGraph(graph);
  if(errors.length) throw new Error(errors.slice(0,3).join('; '));
  return graph;
}
export function exampleState() {
  return { graph: exampleGraph(), inputs: {brief: 'South Africa launch'} };
}
export function importDraft(raw) {
  if (typeof raw!=='string' || raw.length > MAX_FILE) throw new Error('Only local JSON up to 32 KB is supported');
  const parsed=JSON.parse(raw);
  if(!parsed||Array.isArray(parsed)||typeof parsed!=='object') throw new Error('A draft must be an object');
  const {graph,inputs}=parsed;
  checked(graph);
  if(!inputs || Array.isArray(inputs) || typeof inputs!=='object') throw new Error('Inputs must be a JSON object');
  for (const k of Object.keys(inputs)) if (!ID.test(k)||BLOCKED_KEYS.has(k)) throw new Error('Unsafe input key');
  if (JSON.stringify(inputs).length>MAX_FILE) throw new Error('Input data exceeds 32 KB');
  // Reject application-local receipts/provider claims and keep only graph+inputs.
  return {graph:clone(graph), inputs:clone(inputs)};
}
export function exportDraft(state) {
  checked(state.graph);
  if (!state.inputs || Array.isArray(state.inputs) || typeof state.inputs!=='object') throw new Error('Inputs must be an object');
  return JSON.stringify({format:'pryntor-local-workflow-draft',schema_version:1,graph:state.graph,inputs:state.inputs},null,2);
}
function nextId(nodes,type){
  for(let n=1;n<1000;n++) {const id=type+'_'+n;if(!nodes.some(node=>node.id===id))return id;}
  throw new Error('No available node IDs');
}
export function addNode(graph,type) {
  if(!EDITABLE.has(type)) throw new Error('Unapproved node type');
  const draft=clone(graph);
  if(draft.nodes.length>=MAX_NODES) throw new Error('64-node limit reached');
  const firstApproval=draft.nodes.findIndex(node=>node.type==='approval');
  const insertion=firstApproval>=0?firstApproval:draft.nodes.length;
  const prev=insertion>0?draft.nodes[insertion-1].id:null;
  const id=nextId(draft.nodes,type);
  const node={id,type};
  if(type==='input') node.key=nextId(draft.nodes,'input');
  else if(type==='constant') node.value='Original local value';
  else if(type==='select') node.from=[prev];
  else if(type==='output') node.from=draft.nodes.findLast(n=>n.type==='approval')?.id??prev;
  else { node.from=prev; if(type==='condition'){node.test='nonempty';}if(['foreach','transform'].includes(type))node.operation='trim'; }
  if(type==='output') draft.nodes.push(node);
  else {draft.nodes.splice(insertion,0,node);if(firstApproval>=0 && firstApproval<draft.nodes.length-1)draft.nodes[insertion+1].from=id;}
  checked(draft);
  return {graph:draft,nodeId:id};
}
export function updateNode(graph,id,changes) {
  if(!changes || typeof changes!=='object' || Array.isArray(changes)) throw new Error('Changes must be a plain object');
  const draft=clone(graph),index=draft.nodes.findIndex(n=>n.id===id);
  if(index<0) throw new Error('Unknown node');
  const node=draft.nodes[index];
  for (const [key,value] of Object.entries(changes)) {
    if (!['from','key','value','test','operation','argument','expected','when'].includes(key)) throw new Error('Field not editable');
    if(key==='from' && !CONNECTABLE.has(node.type)) throw new Error('Source nodes cannot connect upstream');
    if(key==='from' && node.type==='select' && !Array.isArray(value)) throw new Error('Select needs a list of preceding source IDs');
    node[key]=value;
  }
  checked(draft);
  return draft;
}
export function disconnectGuard(graph,id) {
  const draft=clone(graph),node=draft.nodes.find(n=>n.id===id);
  if(!node)throw new Error('Unknown node');
  delete node.when;checked(draft);return draft;
}
export function deleteNode(graph,id) {
  const draft=clone(graph),index=draft.nodes.findIndex(n=>n.id===id);
  if(index<0)throw new Error('Unknown node');
  const node=draft.nodes[index];
  if(node.type==='approval'||node.type==='output')throw new Error('Required approval and output nodes are protected');
  const used=draft.nodes.some(n=>n.id!==id && (n.from===id || (Array.isArray(n.from)&&n.from.includes(id)) || n.when?.node===id));
  if(used)throw new Error('Node is connected. Reconnect downstream nodes before removing it');
  draft.nodes.splice(index,1);checked(draft);return draft;
}
export function sourceOptions(graph,id) {
  const index=graph.nodes.findIndex(n=>n.id===id);
  if(index<0)return [];
  return graph.nodes.slice(0,index).map(n=>({id:n.id,type:n.type}));
}
export function parseInputs(raw) {
  if(typeof raw!=='string'||raw.length>MAX_FILE)throw new Error('Input JSON exceeds 32 KB');
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Inputs must be a JSON object');
  for(const key of Object.keys(parsed)) if(!ID.test(key)||BLOCKED_KEYS.has(key))throw new Error('Unsafe input key');
  return clone(parsed);
}
export function runLocalDraft(state) {
  // Browser drafts never accept self-declared approvals or a user supplied verifier.
  // The signed Node-host verifier path remains isolated outside the UI.
  return import('./workflow_engine.mjs').then(({runGraph})=>runGraph(state.graph,state.inputs,{},{}));
}
