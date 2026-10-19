import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleState,addNode,updateNode,importDraft,exportDraft,parseInputs,runLocalDraft} from '../workflow_model.mjs';
import {validateGraph} from '../workflow_engine.mjs';
const ex=()=>exampleState();
test('invalid import cannot change caller graph',()=>{
  const original=ex().graph, snapshot=JSON.stringify(original);
  assert.throws(()=>importDraft(JSON.stringify({graph:{schema_version:1,nodes:[]},inputs:{}})),/Graph/);
  assert.equal(JSON.stringify(original),snapshot);
});
test('unrelated imported fields discarded',()=>{
  const state=ex(),raw=JSON.stringify({...state,unrelated:{review:true}});
  assert.deepEqual(importDraft(raw),state);
});
test('draft export excludes unrelated fields',()=>{
  const state=ex(),raw=exportDraft({...state,unrelated:{review:true}});
  assert.equal(raw.includes('unrelated'),false);
});
test('invalid keys and oversized inputs rejected',()=>{
  assert.throws(()=>parseInputs('{"__proto__":1}'),/Unsafe/);
  assert.throws(()=>parseInputs('a'.repeat(40000)),/exceeds/);
});
test('invalid and oversized draft rejected',()=>{
  assert.throws(()=>importDraft('{invalid'),SyntaxError);
  assert.throws(()=>importDraft('x'.repeat(50000)),/32 KB/);
});
test('normal draft has actual engine trace and hold',async()=>{
  const out=await runLocalDraft(ex());
  assert.equal(out.status,'WAITING_APPROVAL');
  assert.equal(out.outputs[0].value,null);
  assert.equal(out.trace.find(row=>row.id==='has_region').status,'SUCCESS');
});
test('missing input fails without releasing outputs',async()=>{
  const state=ex();state.inputs={};
  const out=await runLocalDraft(state);
  assert.equal(out.status,'FAILED');
  assert.equal(out.outputs[0].value,null);
});
test('draft cannot carry unauthorised approval to the engine',async()=>{
  const state=ex();state.approvals={review:{approved:true,reviewer:'unit fixture'}};
  assert.equal((await runLocalDraft(state)).status,'WAITING_APPROVAL');
});
test('failed mutation leaves existing graph unchanged',()=>{
  const original=ex().graph,snapshot=JSON.stringify(original);
  assert.throws(()=>updateNode(original,'final',{from:'brief'}));
  assert.equal(JSON.stringify(original),snapshot);
});
test('invalid graph never serialises as an accepted draft',()=>{
  const state=ex();
  state.graph.nodes[0].id='bad identifier';
  assert.throws(()=>exportDraft(state),/invalid|unsafe/i);
});
