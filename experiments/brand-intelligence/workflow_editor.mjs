/* PRY-128 browser-only workflow editor, no third-party network access. */
import {validateGraph} from './workflow_engine.mjs';
import {exampleState, importDraft, exportDraft, addNode, updateNode, deleteNode, sourceOptions, parseInputs, runLocalDraft} from './workflow_model.mjs';
let state=exampleState(), selected='brief', lastRun=null, dirtyInput=false;
const by=id=>document.getElementById(id);
function element(tag,className,content){const el=document.createElement(tag);if(className)el.className=className;if(content!==undefined)el.textContent=content;return el;}
function message(value,isError=false){const el=by('notice');el.textContent=value;el.className='message '+(isError?'error':'ok');}
function resetRun(){lastRun=null;by('runstatus').textContent='Not run';by('runstatus').className='status INCOMPLETE';by('result').replaceChildren(element('p','muted','Not run. Run the actual local engine to inspect states. Outputs require an independent signed host approval.'));}
function commitGraph(next,pick=selected){state.graph=next;selected=pick;resetRun();render();}
function tryEdit(fn,notice){try{fn();message(notice||'Change validated.');}catch(err){message(String(err.message).slice(0,260),true);}}
function listNodes(){
  const root=by('nodes');root.replaceChildren();const trace=new Map((lastRun?.trace||[]).map(item=>[item.id,item]));
  for (const [index,node] of state.graph.nodes.entries()) {
    if(index)root.append(element('div','flow-arrow','↓'));
    const btn=element('button','flow-node'+(selected===node.id?' active':''));btn.type='button';btn.dataset.node=node.id;btn.setAttribute('aria-pressed',String(selected===node.id));btn.setAttribute('aria-label','Inspect '+node.id+', '+node.type);
    const row=element('div','flow-node-top');row.append(element('code','',node.id));const type=element('span','type'+(node.type==='approval'?' review':''),node.type);row.append(type);btn.append(row);
    const from=Array.isArray(node.from)?node.from.join(' · '):node.from;
    btn.append(element('small','',from?'Reads ← '+from:node.type==='input'?'Input: '+node.key:node.type==='constant'?'Local constant':'No source'));
    if(node.when)btn.append(element('span','node-note','Guard: '+node.when.node+' == '+node.when.equals));
    const latest=trace.get(node.id);if(latest) btn.append(element('span','status '+latest.status,latest.status));
    root.append(btn);
  }
  by('nodecount').textContent=state.graph.nodes.length+' / 64 nodes';
  const errors=validateGraph(state.graph);
  by('validation').textContent=errors.length?'Invalid: '+errors[0]:'Valid graph structure. Signed approval is still required.';
  by('validation').className='message '+(errors.length?'error':'ok');
}
function field(container,name,title,value,handle,{type='text',options=[],hint}={}){
  const label=element('label','field');label.append(element('span','',title));let control;
  if(type==='select') {control=document.createElement('select');for(const item of options){const opt=document.createElement('option');opt.value=String(item.value);opt.textContent=item.label;if(String(item.value)===String(value))opt.selected=true;control.append(opt);}}
  else {control=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')control.type='text';control.value=value===undefined?'':String(value);}
  control.dataset.property=name;control.addEventListener('change',()=>handle(control.value));label.append(control);if(hint)label.append(element('small','',hint));container.append(label);return control;
}
const parseLiteral=s=>{try{return JSON.parse(s);}catch{return s;}};
function inspector(){
  const parent=by('editor');parent.replaceChildren();const node=state.graph.nodes.find(n=>n.id===selected);
  if(!node){parent.append(element('p','muted','Select a node.'));return;}
  by('selected-description').textContent=node.id+' · '+node.type.toUpperCase();
  const changes=(updates,success)=>tryEdit(()=>commitGraph(updateNode(state.graph,node.id,updates),node.id),success);
  if(node.type==='input')field(parent,'key','Input field key',node.key,value=>changes({key:value}));
  if(node.type==='constant')field(parent,'value','Constant · JSON or string',JSON.stringify(node.value),value=>changes({value:parseLiteral(value)}));
  if(['transform','foreach'].includes(node.type)){
    field(parent,'operation','Operation',node.operation,value=>changes({operation:value}),{type:'select',options:['trim','lower','upper','prefix','suffix','unique'].map(x=>({value:x,label:x}))});
    if(['prefix','suffix'].includes(node.operation))field(parent,'argument','Text argument',node.argument??'',value=>changes({argument:value}));
  }
  if(node.type==='condition'){
    field(parent,'test','Condition',node.test,value=>changes({test:value}),{type:'select',options:['contains','equals','nonempty','gte'].map(x=>({value:x,label:x}))});
    if(node.test!=='nonempty')field(parent,'expected','Expected · JSON or text',JSON.stringify(node.expected??''),value=>changes({expected:parseLiteral(value)}));
  }
  if(node.type==='select'){
    field(parent,'from','Upstream node IDs (comma separated)',node.from.join(', '),value=>changes({from:value.split(',').map(v=>v.trim()).filter(Boolean)}),{hint:'Use preceding IDs only. First active branch wins.'});
  } else if(!['input','constant'].includes(node.type)){
    const options=sourceOptions(state.graph,node.id).map(n=>({value:n.id,label:n.id+' · '+n.type}));
    field(parent,'from','Read from',node.from,value=>changes({from:value}),{type:'select',options});
  }
  if(!['input','constant','approval','output'].includes(node.type)){
    const guardValue=node.when?node.when.node+':'+node.when.equals:'none';
    const conditions=sourceOptions(state.graph,node.id).filter(x=>x.type==='condition');
    const opts=[{value:'none',label:'No branch guard'},...conditions.flatMap(c=>[{value:c.id+':true',label:c.id+' is true'},{value:c.id+':false',label:c.id+' is false'}])];
    field(parent,'when','Optional branch guard',guardValue,value=>{
      const draft=structuredClone(state.graph),n=draft.nodes.find(x=>x.id===node.id);
      if(value==='none')delete n.when;else{const [id,val]=value.split(':');n.when={node:id,equals:val==='true'};}
      const errors=validateGraph(draft);if(errors.length)throw Error(errors[0]);commitGraph(draft,node.id);
    },{type:'select',options:opts});
  }
  const remove=element('button','btn danger-button','Remove disconnected node');remove.type='button';remove.style.marginTop='16px';remove.disabled=['approval','output'].includes(node.type);
  remove.addEventListener('click',()=>tryEdit(()=>{const next=deleteNode(state.graph,node.id);commitGraph(next,next.nodes[0].id);},'Node removed.'));
  parent.append(remove);
}
function render(){listNodes();inspector();if(!dirtyInput)by('inputs').value=JSON.stringify(state.inputs,null,2);}
by('nodes').addEventListener('click',event=>{const node=event.target.closest('[data-node]');if(!node)return;selected=node.dataset.node;render();});
by('add').addEventListener('click',()=>tryEdit(()=>{const {graph,nodeId}=addNode(state.graph,by('kind').value);commitGraph(graph,nodeId);},'Node added and graph validated.'));
by('reset').addEventListener('click',()=>{state=exampleState();selected='brief';dirtyInput=false;message('Reset to original offline example.');resetRun();render();});
by('inputs').addEventListener('input',()=>{dirtyInput=true;resetRun();});
by('inputs').addEventListener('change',()=>tryEdit(()=>{state.inputs=parseInputs(by('inputs').value);dirtyInput=false;resetRun();render();},'Local input JSON validated.'));
function resolveInputs(){state.inputs=parseInputs(by('inputs').value);dirtyInput=false;}
by('run').addEventListener('click',async()=>{
  try{
    resolveInputs();const result=await runLocalDraft(state);lastRun=result;by('runstatus').textContent=result.status;by('runstatus').className='status '+result.status;
    const panel=by('result');panel.replaceChildren();panel.append(element('div','micro','Execution: '+(result.execution??'INVALID')+' · '+result.status));
    if(result.errors?.length)panel.append(element('p','muted',result.errors.join('; ').slice(0,450)));
    const list=element('ul','trace');for(const item of result.trace){const li=element('li');li.append(element('code','',item.id));li.append(element('small','',item.detail||item.kind));li.append(element('span','status '+item.status,item.status));list.append(li);}panel.append(list);
    const withheld=result.status!=='COMPLETED';
    panel.append(element('p','caption',withheld?'No final outputs or intermediate values released. Valid human-signed approval is not provisioned in this browser.':'Signed host outputs returned.'));
    if(!withheld)panel.append(element('pre','',JSON.stringify(result.outputs,null,2)));
    message('Actual local engine result: '+result.status+'. '+(withheld?'Output withheld.':'Output signed.'),false);
    render();
  }catch(err){message(String(err.message).slice(0,260),true);resetRun();}
});
by('export').addEventListener('click',()=>tryEdit(()=>{
  resolveInputs();const content=exportDraft(state);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='pryntor-workflow-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
},'Validated draft exported. Contains local graph and inputs only.'));
by('import').addEventListener('click',()=>by('draftfile').click());
by('draftfile').addEventListener('change',async e=>{
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  if(f.size>32768){message('Draft exceeds 32 KB. Import refused.',true);return;}
  try{const draft=importDraft(await f.text());state=draft;selected=state.graph.nodes[0].id;dirtyInput=false;resetRun();render();message('Validated local draft imported. Receipts/credentials ignored.');}catch(err){message('Import rejected: '+String(err.message).slice(0,240),true);}
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();by('run').click();}});
resetRun();render();
