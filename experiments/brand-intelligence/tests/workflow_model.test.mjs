import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleState,addNode,updateNode,deleteNode,sourceOptions,importDraft,exportDraft} from '../workflow_model.mjs';
import {validateGraph} from '../workflow_engine.mjs';
const ex=()=>exampleState();
test('valid baseline',()=>assert.deepEqual(validateGraph(ex().graph),[]));
test('add transform and connect review',()=>{
  const {graph,nodeId}=addNode(ex().graph,'transform');
  assert.equal(graph.nodes.find(n=>n.id==='review').from,nodeId);
  assert.equal(graph.nodes.find(n=>n.id===nodeId).from,'chosen');
  assert.deepEqual(validateGraph(graph),[]);
});
test('all eight node types can be added',()=>{
  for(const kind of ['input','constant','transform','condition','foreach','select','approval','output']){
    const {graph,nodeId}=addNode(ex().graph,kind);
    assert.ok(graph.nodes.some(n=>n.id===nodeId));
    assert.deepEqual(validateGraph(graph),[]);
  }
});
test('branch-select gets a preceding source',()=>{
  const {graph,nodeId}=addNode(ex().graph,'select');
  assert.deepEqual(graph.nodes.find(n=>n.id===nodeId).from,['chosen']);
});
test('connection update accepts preceding source',()=>{
  const {graph,nodeId}=addNode(ex().graph,'transform');
  assert.equal(updateNode(graph,nodeId,{from:'brief'}).nodes.find(n=>n.id===nodeId).from,'brief');
});
test('connection update rejects unknown, future, and self',()=>{
  const {graph,nodeId}=addNode(ex().graph,'transform');
  for(const id of ['missing',nodeId,'final']) assert.throws(()=>updateNode(graph,nodeId,{from:id}),/preceding|cycle/);
});
test('cannot bypass mandatory review',()=>{
  assert.throws(()=>updateNode(ex().graph,'final',{from:'brief'}),/approval/);
  assert.throws(()=>updateNode(ex().graph,'review',{when:{node:'has_region',equals:true}}),/approval/);
});
test('unsupported node kind denied',()=>{
  assert.throws(()=>addNode(ex().graph,'remote'),/Unapproved/);
});
test('protected and connected nodes cannot be removed',()=>{
  for(const id of ['review','final']) assert.throws(()=>deleteNode(ex().graph,id),/protected/);
  assert.throws(()=>deleteNode(ex().graph,'chosen'),/connected/);
});
test('disconnected node can be removed',()=>{
  const {graph,nodeId}=addNode(ex().graph,'constant');
  const next=updateNode(graph,'review',{from:'chosen'});
  assert.deepEqual(validateGraph(deleteNode(next,nodeId)),[]);
});
test('source selector lists only preceding nodes',()=>{
  const options=sourceOptions(ex().graph,'review').map(x=>x.id);
  assert.ok(options.includes('chosen'));assert.ok(!options.includes('final'));
});
test('export and import round trip',()=>{
  const state=ex();
  const raw=exportDraft(state);
  assert.deepEqual(importDraft(raw),state);
});
