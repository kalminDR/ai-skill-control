import assert from 'node:assert/strict';
import {presets,books,gate,savedPromptGate,bookGate,compose,stagePrompt} from '../web/workflows.js';
import {tr,setLanguage} from '../web/locale.js';
const project={id:'fixture',name:'Objective',dir:'/local/fixture'};
const book=books.find(x=>x.id==='full-ui-redesign');
const flows=book.stages.map(s=>presets.find(p=>p.id===s.id));
const skills=[...new Set(flows.flatMap(p=>p.names))].map(inv=>({name:inv,inv,valid:true,status:'Enabled',workflowReviewed:true,scope:'User',deps:[],modes:[]}));
assert.equal(bookGate(book,project,skills),'');
const first=flows[0],name=first.names[0];
for(const patch of [{status:'Disabled'},{duplicate:true},{workflowReviewed:false},{valid:false},{deps:['tool missing']}]){
 const changed=skills.map(s=>s.inv===name?{...s,...patch}:s);
 assert(gate(first,null,project,changed));
 assert(bookGate(book,project,changed));
}
assert(bookGate(book,project,skills.filter(s=>s.inv!==name)));
assert(gate({...first,id:'saved',templateId:first.id,names:[]},{override:true,names:[]},project,skills));
assert(gate(first,null,{...project,scopeUnavailable:true},skills));
const manual=presets.find(p=>p.names.length===0);
assert.equal(gate(manual,null,project,[]),'Manual checkpoint');
assert.equal(gate(manual,null,project,[],true),'');
const saved={...first,id:'saved-example',templateId:first.id};
const editedText='Retain this exact acceptance note.';
assert.equal(savedPromptGate(saved,{},editedText,project,skills),'');
assert(savedPromptGate(saved,{},editedText,project,skills.filter(s=>s.inv!==name)));
assert(savedPromptGate(saved,{},editedText,project,skills.map(s=>({...s,status:'Disabled'}))));
assert(savedPromptGate(saved,{},'$absent-example\n'+editedText,project,skills));
assert(savedPromptGate(saved,{},'$'+name+' unknown-mode',project,skills));
assert(savedPromptGate(saved,{},'   ',project,skills));
setLanguage('hu');
for(const p of presets){
 assert.notEqual(tr(p.title),p.title);
 for(const k of ['goal','inputs','deliverable','acceptance','when','avoid','approval'])assert.notEqual(tr(p[k]),p[k]);
 const text=compose({mode:p.mode,task:'My task',extra:'Objective'},p,project,skills);
 assert(text.includes('Cél\nMy task'));
 assert(text.includes('Projekt\nObjective'));
 assert(text.includes('További utasítások\nObjective'));
}
assert(stagePrompt(book,book.stages[0],project,skills).includes('Előfeltétel:'));
console.log('Availability gates and translation checks passed.');
