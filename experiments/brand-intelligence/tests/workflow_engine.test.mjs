import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { exampleGraph, validateGraph, runGraph, NODE_TYPES, MAX_ITEMS } from '../workflow_engine.mjs';
import { approvalPayload, approvalRunDigest, createApprovalVerifier } from '../approval_verifier.mjs';

const {publicKey, privateKey} = generateKeyPairSync('ed25519');
const {privateKey: attacker} = generateKeyPairSync('ed25519');
const RUN = 'ci-test-run-v1';
const NOW = 1792360000000;
const trustedKeys = {independent_reviewer:publicKey.export({type:'spki',format:'pem'})};
const verifier = createApprovalVerifier({trustedPublicKeys:trustedKeys,runId:RUN,now:()=>NOW});
const policy = {verifyApproval:verifier};

function makeApproval(graph,inputs,extra={}) {
  const claim = {approved:true,key_id:'independent_reviewer',reviewer:'Test reviewer',
    node_id:'review',run_id:RUN,run_digest:approvalRunDigest(graph,inputs,RUN),
    issued_at:NOW-1000,expires_at:NOW+50000,...extra};
  claim.signature=sign(null,Buffer.from(approvalPayload(claim),'utf8'),privateKey).toString('base64');
  return {review:claim};
}
function execute(brief, override, options=policy) {
  const graph=exampleGraph(), inputs={brief};
  return runGraph(graph,inputs,override===undefined?makeApproval(graph,inputs):override,options);
}
function graphWithList() {
  return {schema_version:1,nodes:[
    {id:'items',type:'input',key:'items'},
    {id:'mapped',type:'foreach',from:'items',operation:'upper'},
    {id:'review',type:'approval',from:'mapped'},
    {id:'out',type:'output',from:'review'}
  ]};
}
test('graph schema validates and has only offline-approved nodes',()=>{
  assert.deepEqual(validateGraph(exampleGraph()),[]);
  for(const disallowed of ['shell','script','http','model','publish']) assert.ok(!NODE_TYPES.includes(disallowed));
});
test('signed regional workflow returns actual transformed text',()=>{
  const x=execute('South Africa launch');
  assert.equal(x.status,'COMPLETED');
  assert.equal(x.outputs[0].value,'Original regional concept: South Africa launch');
  assert.equal(x.execution,'LOCAL_DETERMINISTIC_ONLY');
});
test('signed other-market branch works',()=>{
  assert.equal(execute('Canada').outputs[0].value,'Original generic concept: Canada');
});
test('missing input fails without partial output',()=>{
  const x=runGraph(exampleGraph(),{},{}); assert.equal(x.status,'FAILED'); assert.equal(x.outputs[0].value,null);
});
test('unsigned reviewer name is not an approval',()=>{
  const x=execute('South Africa',{review:{approved:true,reviewer:'Fake'}},{});
  assert.equal(x.status,'WAITING_APPROVAL'); assert.equal(x.outputs[0].value,null);
});
test('signed receipt rejected without trusted host verifier',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'};
  const x=runGraph(g,ins,makeApproval(g,ins));
  assert.equal(x.status,'WAITING_APPROVAL');
});
test('altering inputs invalidates signature',()=>{
  const g=exampleGraph(),old={brief:'South Africa'};
  const x=runGraph(g,{brief:'Canada'},makeApproval(g,old),policy);
  assert.equal(x.status,'WAITING_APPROVAL');
});
test('altering graph invalidates signature',()=>{
  const original=exampleGraph(),changed=structuredClone(original),ins={brief:'South Africa'};
  changed.nodes[3].argument='Changed: ';
  assert.equal(runGraph(changed,ins,makeApproval(original,ins),policy).status,'WAITING_APPROVAL');
});
test('reviewer impersonation invalidates signature',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'},receipt=makeApproval(g,ins);
  receipt.review.reviewer='Attacker';
  assert.equal(runGraph(g,ins,receipt,policy).status,'WAITING_APPROVAL');
});
test('unapproved or missing key ID fails closed',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'},receipt=makeApproval(g,ins,{key_id:'outsider'});
  assert.equal(runGraph(g,ins,receipt,policy).status,'WAITING_APPROVAL');
});
test('signature made by another key fails closed',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'},receipt=makeApproval(g,ins);
  receipt.review.signature=sign(null,Buffer.from(approvalPayload(receipt.review)),attacker).toString('base64');
  assert.equal(runGraph(g,ins,receipt,policy).status,'WAITING_APPROVAL');
});
test('expired signed receipt fails closed',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'},receipt=makeApproval(g,ins,{expires_at:NOW-1});
  assert.equal(runGraph(g,ins,receipt,policy).status,'WAITING_APPROVAL');
});
test('new run ID does not accept old signature',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'},receipt=makeApproval(g,ins);
  const other=createApprovalVerifier({trustedPublicKeys:trustedKeys,runId:'new-run-id',now:()=>NOW});
  assert.equal(runGraph(g,ins,receipt,{verifyApproval:other}).status,'WAITING_APPROVAL');
});
test('workflow output cannot bypass approval through select',()=>{
  const g={schema_version:1,nodes:[
    {id:'a',type:'input',key:'x'},{id:'review',type:'approval',from:'a'},
    {id:'other',type:'constant',value:'bypass'},
    {id:'pick',type:'select',from:['review','other']},
    {id:'out',type:'output',from:'pick'}]};
  assert.ok(validateGraph(g).some(e=>e.includes('every output path')));
});
test('iterator bounds prevent unreviewed bulk output',()=>{
  const g=graphWithList(),ins={items:Array(MAX_ITEMS+1).fill('x')};
  const x=runGraph(g,ins,makeApproval(g,ins),policy);
  assert.equal(x.status,'FAILED'); assert.equal(x.outputs[0].value,null);
});
test('signed array transform works under quota',()=>{
  const g=graphWithList(),ins={items:['za','uk']},x=runGraph(g,ins,makeApproval(g,ins),policy);
  assert.equal(x.status,'COMPLETED'); assert.deepEqual(x.outputs[0].value,['ZA','UK']);
});
test('unsafe identifiers and arbitrary node kinds are rejected',()=>{
  const a=exampleGraph();a.nodes[0].id='__proto__'; assert.notDeepEqual(validateGraph(a),[]);
  const b=exampleGraph();b.nodes[3].type='network';assert.notDeepEqual(validateGraph(b),[]);
});
test('approval callback throwing can never leak output',()=>{
  const g=exampleGraph(),ins={brief:'South Africa'};
  const x=runGraph(g,ins,makeApproval(g,ins),{verifyApproval:()=>{throw Error('unavailable')}});
  assert.equal(x.status,'WAITING_APPROVAL');assert.equal(x.outputs[0].value,null);
});
test('blank trusted key registry rejected',()=>{
  assert.throws(()=>createApprovalVerifier({trustedPublicKeys:{},runId:RUN}),/key/);
});
