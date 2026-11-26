import {language,setLanguage,tr,reasonText} from './locale.js';
import {categories, modes, security, presets, projects, eligible, compose, books, availability, workflowFacts, gate, savedPromptGate, bookGate, dependency, stageKey, stagePrompt, playbookPrompt} from './workflows.js';

let launchKey=sessionStorage.getItem('launchKey')||'';
if(location.hash.startsWith('#key=')){
  launchKey=location.hash.slice(5);sessionStorage.setItem('launchKey',launchKey);history.replaceState(null,'',location.pathname);
}
let storagePath='';
const $=selector=>document.querySelector(selector);
const raw=value=>document.createTextNode(value??'');
function h(tag, attrs={}, ...children) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)){
    if(value===undefined || value===null || value===false) continue;
    if(key.startsWith('on')) node.addEventListener(key.slice(2),value);
    else if(key==='class') node.className=value;
    else if(key==='checked') node.checked=value;
    else node.setAttribute(key,value===true?'':['title','aria-label','placeholder'].includes(key)?tr(value):value);
  }
  node.append(...children.flat(Infinity).filter(v=>v!=null && v!==false).map(tr));
  return node;
}
const btn=(label,fn,cls='')=>h('button',{class:cls,onclick:fn,type:'button'},label);
const sub=(text)=>h('p',{class:'muted'},text);
const code=(text)=>h('code',{},text);
const title=(text)=>h('h2',{},text);
const row=(...items)=>h('div',{class:'actions'},...items);
const stack=(...items)=>h('div',{class:'stack'},...items);
const panel=(...items)=>h('section',{class:'panel'},...items);
const field=(label,input)=>h('label',{class:'field'},h('span',{},label),input);
const blank=(message)=>h('p',{class:'empty'},message);
const date=v=>v ? new Date(v).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'}) : 'Unverified';
const pages=['Overview','Skill Library','Workflow Studio','Playbook Studio','Security','Plugins & MCP','Projects','Favorites','Settings','Governance'];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const routes=Object.fromEntries(pages.map(p=>[slug(p),p]));
const paths=[
 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 'M3 4h4v16H3z M10 4h4v16h-4z M16 5l3-1 4 15-3 1z',
 'M3 6h18 M3 12h18 M3 18h18 M8 3v6 M16 9v6 M10 15v6',
 'M12 3l8 3v6q0 5-8 9-8-4-8-9V6z M8 12l3 3 5-6',
 'M8 3v5 M16 3v5 M5 8h14v3a7 7 0 0 1-14 0z M12 18v4',
 'M3 7V5h7l2 3h9v12H3z','M12 3l2.8 5.9 6.5.9-4.7 4.6 1.1 6.5-5.7-3-5.7 3 1.1-6.5L2.7 9.8l6.5-.9z',
 'M3 6h18 M3 12h18 M3 18h18 M7 4v4 M16 10v4 M9 16v4','M4 3h15v18H4z M7 8h9 M7 12h9 M7 16h5'];
const navigation = [
  ['Tools',['Overview','Skill Library','Workflow Studio','Playbook Studio']],
  ['Project controls',['Governance','Security','Plugins & MCP']],
  ['Workspace',['Projects','Favorites','Settings']]
];
const pageIcons = {'Overview':0,'Skill Library':1,'Workflow Studio':2,'Playbook Studio':9,'Governance':8,
  'Security':3,'Plugins & MCP':4,'Projects':5,'Favorites':6,'Settings':7};
paths.push('M8 5h13 M8 12h13 M8 19h13 M3 4v3 M2 11h2l-2 3h2 M2 18h2v3H2');
const categoryPaths = {
  'Project Lifecycle':'M20 10a8 8 0 1 0-2 8 M20 4v6h-6',
  'Architecture':'M9 3h6v5H9z M3 16h6v5H3z M15 16h6v5h-6z M12 8v4 M6 16v-4h12v4',
  'Security':paths[3], 'Infrastructure & Cloudflare':'M6 18a5 5 0 0 1 0-10 6 6 0 0 1 11-2 6 6 0 1 1 1 12z',
  'Design & Anti-Slop':'M4 16 16 4l4 4L8 20l-5 1z M13 7l4 4',
  'Frontend Development':'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  'Testing & QA':'M2 6l2 2 4-5 M11 6h10 M2 16l2 2 4-5 M11 16h10',
  'Code Quality':'M5 4h14v16H5z M8 12l3 3 5-6',
  'Deployment & Release':'M3 8l9-5 9 5v9l-9 5-9-5z M3 8l9 5 9-5 M12 13v9',
  'Framer':'M5 3h14v6h-7l7 6h-7v6l-7-6z', 'Skill Management':paths[7]
};
function icon(i){
  const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg'),p=document.createElementNS(ns,'path');
  for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:18,height:18,fill:'none',stroke:'currentColor','stroke-width':1.6,'stroke-linejoin':'round','stroke-linecap':'round','aria-hidden':'true'}))s.setAttribute(k,v);
  p.setAttribute('d',categoryPaths[i]||paths[i]||paths[8]);s.append(p);return s;
}
function select(options,current,change,label){
  const el=h('select',{'aria-label':label,'data-picker':label,onchange:e=>{
    const hadFocus=document.activeElement===el;
    change(e.target.value);
    if(hadFocus && !el.isConnected){
      document.querySelector('select[data-picker="'+CSS.escape(label)+'"]')?.focus({preventScroll:true});
    }
  }});
  for(const v of options){const [value,text]=Array.isArray(v)?v:[v,v];el.append(h('option',{value},text));}
  el.value=current;return el;
}
function input(value,fn,options={}){
  const el=h(options.multi?'textarea':'input',{type:options.multi?null:options.type||'text',rows:options.rows||null,
    maxlength:options.max||6000,placeholder:options.placeholder,autocomplete:'off',oninput:e=>fn(e.target.value)});
  el.value=value||'';return el;
}

let inv,token,rev,db,checks,tab='Overview',noticeTimer,queue=Promise.resolve(),busy=false,conflict=false;
let currentPreset=presets.find(p=>p.id==='new-frontend-feature'),form,preview='',groupFilter='';
const filters={q:'',category:'',publisher:'',status:'',scope:'',favorites:false,sort:'Scope, then name'};
function fresh(p){return {mode:p.mode,task:'',module:'',files:'',constraints:'',extra:'',override:false,names:[...p.names]};}
const active=()=>db.projects.find(p=>p.id===db.active)||db.projects[0];
const scopedProject=()=>({...active(),scopeUnavailable:!!active().dir&&!inv.project,dir:inv.project});
const sk=()=>inv.skills;
const matchSkill=name=>sk().find(s=>s.inv===name && eligible(s));
const favor=(id)=>db.stars.includes(id);
const lifecyclePresets=()=>presets.filter(p=>p.lifecycleMode);
const allPresets=()=>[...presets,...db.saved.filter(x=>x.kind==='Preset').map(x=>x.preset)];
function toast(message){const el=$('#notice');el.textContent=reasonText(message);el.classList.add('shown');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('shown'),5500);}
async function request(path,data){
  const r=await fetch('/api/'+path,data===undefined?{headers:{'X-Skill-Control':launchKey}}:{
    method:'POST',headers:{'Content-Type':'application/json','X-Skill-Token':token},body:JSON.stringify(data)});
  const result=await r.json();
  if(!r.ok){if(r.status===409)conflict=true;throw new Error(result.error||'Local request failed.');}
  return result;
}
function persist(){
  const snapshot=structuredClone(db);
  const work=queue.then(async()=>{
    if(conflict)throw new Error('Reload this window to retrieve the latest workspace.');
    const r=await request('workspace',{rev,state:snapshot});rev=r.rev;
  });
  queue=work.catch(e=>toast(e.message));
  return work;
}
function toggle(id){
  db.stars=favor(id)?db.stars.filter(x=>x!==id):[...db.stars,id];
  persist().catch(()=>{});render();
  if(!$('#dialog').open)document.querySelector('[data-star="'+CSS.escape(id)+'"]')?.focus();
}
function star(id,name){
  const b=btn(favor(id)?'★':'☆',()=>toggle(id),'star');b.setAttribute('aria-label',(favor(id)?'Remove favorite ':'Favorite ')+name);b.setAttribute('aria-pressed',String(favor(id)));b.dataset.star=id;return b;
}
function badge(text){return h('span',{class:'badge '+(['Enabled','Current','Found','Ready'].includes(text)?'ok':['Disabled','Unverified','Upstream differs','Disabled dependency','Missing required skill','Pending verification','Partially available'].includes(text)?'warn':'')},text);}
function link(label,page){return h('a',{href:'#'+slug(page),class:'textlink'},label);}
function go(page){if(tab===page)render();else location.hash=slug(page);}
function startPreset(p,stored){
  const saved=db.saved.find(x=>x.kind==='Preset' && x.id===p.id);
  currentPreset=p;expanded.add(p.group);groupFilter=p.group;form=structuredClone(stored||saved?.form||fresh(p));preview='';closeDialog();go('Workflow Studio');
}
async function copy(value){
  try{await navigator.clipboard.writeText(value);toast('Copied to clipboard.');}
  catch{const el=h('textarea',{readonly:true,rows:8,'aria-label':'Text to copy'});el.value=value;
    modal('Copy text',sub(/Mac/.test(navigator.platform)?'Select the text and press Command-C.':'Select the text and press Ctrl+C.'),el);el.select();}
}
function gated(label,verify,make,cls='',after){
  const hint=h('small',{id:'gate-'+crypto.randomUUID(),class:'gate-reason',hidden:true});
  function showReason(reason){
    button.disabled=!!reason;
    hint.hidden=!reason;
    if(!reason){button.removeAttribute('aria-describedby');return;}
    const parts=reason.split(' · ');
    const action=parts.includes('Choose a project directory')?'Select a directory in Projects, then retry.':
      parts.includes('Manual checkpoint')?'Complete this step manually.':
      'Check the skill and its settings, then refresh the inventory.';
    hint.textContent=reasonText(reason)+' — '+tr(action);
    button.setAttribute('aria-describedby',hint.id);
  }
  const button=btn(label,async()=>{
    const id=active().id,dir=active().dir;
    button.disabled=true;
    try{
      const latest=await request('inventory',{project:dir});
      if(!button.isConnected || id!==active().id || dir!==active().dir)return;
      inv=latest;
      const why=verify(latest);
      if(why){
        showReason(why);
        if(!$('#dialog').open)render();
        toast(why);
        return;
      }
      await copy(make(latest));
      if(after)await after();
    }catch(e){toast(e.message);}
    finally{showReason(verify(inv));}
  },cls);
  showReason(verify(inv));
  return h('div',{class:'gated-action'},button,hint);
}
const scopeFor=i=>({...active(),dir:i.project,scopeUnavailable:!!active().dir&&!i.project});
const workflowGate=(p,f,i)=>gate(p,f,scopeFor(i),i.skills);
function modal(name,...children){
  const d=$('#dialog');
  $('#dialogbody').replaceChildren(h('div',{class:'modalhead'},h('h2',{id:'modal-title'},name),btn('Close',closeDialog)),...children);
  d.setAttribute('aria-labelledby','modal-title');if(!d.open)d.showModal();
}
function closeDialog(){if($('#dialog').open)$('#dialog').close();}
function confirmAction(name,details,action,label){
  modal(name,sub(details),row(btn('Cancel',closeDialog),btn(label,async()=>{closeDialog();try{await action();}catch(e){toast(e.message);}},'primary')));
}
function facts(items){return h('dl',{class:'facts'},items.map(([k,v])=>[h('dt',{},k),h('dd',{},v||'Unverified')]));}
function footerLink(label,href){return href?h('a',{href,target:'_blank',rel:'noreferrer noopener',class:'textlink'},label):null;}
function sectionHead(heading,action){return h('div',{class:'sectionhead'},title(heading),action);}
function issue(s){return s.issue || (s.duplicate?'Shared invocation':s.deps.some(x=>x.includes('missing on'))?'Missing dependency':'');}
function overview(){
  const skills=sk(),enabled=skills.filter(s=>s.status==='Enabled').length,disabled=skills.filter(s=>s.status==='Disabled').length;
  const attention=skills.filter(issue), installed=new Set(inv.plugins.filter(x=>x.installed).map(x=>x.id)).size;
  const starterNames=['New Frontend Feature','Quick Security Check','Regression Testing','Cloudflare Architecture Planning'];
  const counts=[['Skills on disk',skills.length,'Skill Library'],['Installed plugins',installed,'Plugins & MCP'],['Configured MCP servers',inv.mcps.filter(x=>x.source==='User config').length,'Plugins & MCP'],['Workflows',allPresets().length,'Workflow Studio'],['Playbooks',books.length,'Playbook Studio']];
  const workflows=allPresets().filter(p=>favor('p:'+p.id));
  return [
    h('div',{class:'stats'},counts.map(([label,value,page])=>h('a',{href:'#'+slug(page)},h('strong',{},String(value)),h('span',{},label)))),
    h('div',{class:'overview-grid'},
      h('div',{class:'studio-panel'},h('div',{class:'studio-symbol'},icon(2)),h('h2',{},'Workflow Studio'),h('p',{},'Build a Codex prompt from your project context and installed skills.'),
        h('div',{class:'studio-start'},starterNames.map(n=>btn(n,()=>startPreset(presets.find(p=>p.title===n)),'preset-link'))),row(link('Browse workflows','Workflow Studio'),link('Browse playbooks','Playbook Studio'))),
      panel(sectionHead('Inventory status',link('Inspect library','Skill Library')),
        facts([['Enabled under local rules',String(enabled)],['Disabled',String(disabled)],['Prior evidence or unverified',String(skills.length-enabled-disabled)],['Custom / third-party',skills.filter(s=>s.origin==='Custom').length+' / '+skills.filter(s=>s.origin==='Third-party').length],['OpenAI / unattributed',skills.filter(s=>s.origin==='OpenAI').length+' / '+skills.filter(s=>s.origin==='Unverified').length],['Update evidence',skills.some(s=>checkFor(s))?skills.filter(s=>checkFor(s)?.status==='Upstream differs').length+' upstream differences':'No checks recorded']]))),
    h('div',{class:'split'},panel(sectionHead('Favorite workflows',link('Manage','Favorites')),workflows.length?workflows.map(p=>presetRow(p)):blank('Star a workflow in the studio to keep it here.')),
      panel(sectionHead('Recent prompts',link('View all','Favorites')),db.history.length?db.history.slice(0,3).map(x=>savedRow(x,true)):blank('Generated prompts will appear here.'))),
    panel(sectionHead('Needs attention',badge(String(attention.length))),inv.warnings.map(sub),attention.length?attention.slice(0,8).map(s=>h('div',{class:'listrow'},btn(raw(s.name),()=>detail(s),'plain'),sub(issue(s)))):sub('No installation or declared dependency issues detected.')),
    sub('Inventory refreshed '+date(inv.refreshed))];
}
function checkFor(s){const result=checks[s.id];return result?.installed===s.version?result:null;}
function detail(s){
  const related=presets.filter(p=>p.names.includes(s.inv)||p.optional?.[0]===s.inv);
  const partners=[...new Set(related.flatMap(p=>[...p.names,...(p.optional?.length?[p.optional[0]]:[])]))].filter(n=>n!==s.inv && matchSkill(n)).slice(0,4);
  const example=(eligible(s)&&s.inv?'$'+s.inv+' ':'')+(related[0]?.goal||'Review the relevant project files for this task. State your scope and verification criteria.');
  const check=checkFor(s);
  modal(s.name,row(badge(s.scope),badge(s.status)),sub(s.description?raw(s.description):s.issue||'Description unavailable.'),
    row(code(s.inv?'$'+s.inv:'Unavailable'),s.inv&&gated('Copy invocation',i=>dependency(s.inv,i.skills,'',false).skill?'':'Unavailable',()=>'$'+s.inv)),
    title('Installed instructions'),facts([
      ['Activation',s.implicit?'Eligible for description-based matching when enabled.':'Explicit invocation only.'],
      ['Usage guidance',s.usage||'See the installed description above.'],['Exclusions',s.exclusions||'No separate exclusion section identified.'],['Modes',s.modes.length?s.modes.join(', '):'No formal modes verified.'],
      ['Dependencies',s.deps.join('\\n')||'No tool requirements verified.'],
      ['Installation',s.path],['Discovery evidence',s.discovery],['Valid metadata',s.valid?'Yes':'No'],['Publisher',s.publisher],['Evidence',s.source],
      ['Version or commit',s.version],['Modified',date(s.modified)],['Status detail',issue(s)||s.status],
      ['Upstream',check?check.status+' · '+date(check.checked):'Not checked'],...(check?.latest?[['Latest checked revision',check.latest]]:[])]),
    row(footerLink('Source repository',s.repo),s.checkable&&btn('Check upstream…',()=>checkUpdate(s))),
    title('Local recommendations'),facts([
      ['Use cases',related.slice(0,4).map(p=>p.title).join(', ')||'Match the task to the installed description above.'],
      ['When to skip',s.status==='Disabled'?'This installation is disabled.':related.length?'Skip when the task falls outside the stated use cases.':'Skip when the task is outside the installed description or its prerequisites are unavailable.'],
      ['Complementary skills',partners.join(', ')||'No pairing curated.'],
      ['Potential overlap',s.duplicate?'Another installation has this invocation. Select its scope in Codex first.':sk().some(o=>o.id!==s.id && o.name===s.name)?'A separately namespaced copy exists. Choose one implementation.':'No specific overlap identified.'],
      ['Privacy','Read the installed instructions before granting tool, network or account access.']]),
    h('pre',{},example),row(gated('Copy example prompt',i=>dependency(s.inv,i.skills,'',false).skill?'':'Unavailable',()=>example),btn(favor('s:'+s.id)?'Unfavorite skill':'Favorite skill',()=>{toggle('s:'+s.id);detail(s);})));
}
function checkUpdate(s){
  confirmAction('Check official upstream?', 'Send anonymous HTTPS requests to api.github.com for '+s.repo+' and the public revisions. Only the repository, path and revision are sent.',async()=>{
    toast('Checking GitHub…');checks[s.id]=await request('check',{id:s.id,confirmed:true});render();detail(s);
  },'Check GitHub');
}
function library(){
  const result=h('div',{}), search=input(filters.q,v=>{filters.q=v;draw();},{placeholder:'Search names, descriptions or invocations…'});
  search.setAttribute('aria-label',tr('Search skills'));
  const filter=(label,key,choices)=>field(label,select([['','All '+label.toLowerCase()],...choices],filters[key],v=>{filters[key]=v;draw();},label));
  function draw(){
    const list=sk().filter(s=>(!filters.q||[s.name,s.inv,s.description,s.publisher].join(' ').toLowerCase().includes(filters.q.toLowerCase()))
      && ['scope','status','category','publisher'].every(k=>!filters[k]||s[k]===filters[k]) && (!filters.favorites||favor('s:'+s.id)));
    const priority={User:0,Project:1,Plugin:2,System:3,Admin:4,Legacy:5};
    list.sort((a,b)=>(filters.sort==='Recently modified' ? b.modified.localeCompare(a.modified) : filters.sort==='Scope, then name'?priority[a.scope]-priority[b.scope]:0)||a.name.localeCompare(b.name));
    result.replaceChildren(sub(list.length+' of '+sk().length+' installations'),list.length?table(['Skill','Publisher','Scope','Status','Favorite'],list.map(s=>[
      stack(btn(raw(s.name),()=>detail(s),'plain skillname'),h('small',{},s.category)),s.publisher,s.scope,badge(s.status),star('s:'+s.id,s.name)]),'Skill inventory'):blank('No matching skills. Change the search or filters.'));
  }
  draw(); const choices=k=>[...new Set(sk().map(s=>s[k]))].sort();
  return [h('div',{class:'filterbox'},search,h('div',{class:'filters'},filter('Categories','category',choices('category')),filter('Publishers','publisher',choices('publisher')),filter('Statuses','status',choices('status')),filter('Scopes','scope',choices('scope')),
    field('Sort',select(['Scope, then name','Name','Recently modified'],filters.sort,v=>{filters.sort=v;draw();},'Sort skills')),
    h('label',{class:'check'},h('input',{type:'checkbox',checked:filters.favorites,onchange:e=>{filters.favorites=e.target.checked;draw();}}),'Favorites'))),result];
}
function table(headers,rows,name){return h('div',{class:'tablewrap',tabindex:0,role:'region','aria-label':name},
  h('table',{},h('thead',{},h('tr',{},headers.map(v=>h('th',{scope:'col'},v)))),h('tbody',{},rows.map(cells=>h('tr',{},cells.map((v,i)=>h(i?'td':'th',i?{}:{scope:'row'},v)))))));}
function presetRow(p){return h('div',{class:'listrow'},stack(btn(p.title,()=>startPreset(p),'plain'),h('small',{},p.group)),star('p:'+p.id,p.title));}
function savedRow(x,recent=false){return h('div',{class:'listrow'},stack(btn(raw(x.name),()=>openSaved(x,recent),'plain'),h('small',{},[x.kind,x.projectName,date(x.at)].filter(Boolean).join(' · '))));}


let governanceScope='selected', specialistPick='';
function targetEvidence(){
  return inv.governance.selected;
}
function targetPicker(){
  return targetEvidence()?sub(active().name):link('Choose a project directory','Projects');
}
async function copyLifecycle(mode){
  const path=targetEvidence()?.path;
  const freshInventory=await request('inventory',{project:path});
  const target=freshInventory.governance.selected;
  const verified=freshInventory.governance.presets.find(p=>p.id===mode && p.invocation);
  if(!verified || !path || target?.path!==path){toast('Refresh the inventory and review availability for this project.');return;}
  const p=presets.find(x=>x.lifecycleMode===mode);
  const prompt=compose(fresh(p),p,{dir:path},freshInventory.skills);
  if(prompt && !gate(p,null,{dir:path},freshInventory.skills))await copy(prompt);
}
function lifecycleStudio(){
  const g=inv.governance, p=currentPreset, mode=g.presets.find(x=>x.id===p.lifecycleMode);
  const copyButton=btn('Copy read-only prompt',()=>copyLifecycle(p.lifecycleMode),'primary');
  copyButton.disabled=!targetEvidence()||!mode?.invocation;
  return [libraryBrowser(),h('section',{class:'panel',id:'composer'},title('Project Lifecycle'),field('Workflow preset',select(allPresets().map(x=>[x.id,x.title]),p.id,id=>startPreset(allPresets().find(x=>x.id===id)),'Workflow preset')),
    targetPicker(),code(targetEvidence()?.path||""),sub(p.goal),facts(workflowFacts(p,sk())),facts([['Installed skill',g.lifecycle],['Execution','Read-only preview']]),copyButton,link('Development Governance','Governance'))];
}
function governancePage(){
  const g=inv.governance,t=targetEvidence(),r=g.reference;
  const rec=g.recommendations.find(x=>x.name===specialistPick)||g.recommendations[0];
  return [panel(title('Development Governance'),facts([['Global instructions',g.policy+' · '+g.policyPath],['Project Lifecycle',g.lifecycle+(g.lifecyclePath?' · '+g.lifecyclePath:'')]])),
    panel(title('Project evidence'),targetPicker(),t&&code(t.path),t&&facts([
      ['Documentation',Object.entries(t.docs).map(([name,status])=>name+' · '+status).join('\n')],
      ['Repository',t.git.status],['Branch / HEAD',t.git.branch+' / '+t.git.head],['Working tree',t.git.tree],
      ['State owner',t.owner],['Recorded checkpoint',t.recorded],['Last verified checkpoint',t.checkpoint],['Handoff readiness',t.readiness]])),
    panel(title('Lifecycle presets'),sub('Prompts use read-only preview mode. Copy becomes available after verification of the installed instructions.'),
      g.presets.map(p=>h('div',{class:'listrow'},stack(h('strong',{},p.title),sub(p.goal)),
        btn('Inspect '+p.title,()=>startPreset(lifecyclePresets().find(v=>v.lifecycleMode===p.id)))))),
    panel(title('Specialist recommendations'),field('Task',select(g.recommendations.map(x=>[x.name,x.task]),rec.name,v=>{specialistPick=v;render();},'Specialist task')),
      row(code('$'+rec.name),badge(rec.available?'Available':'Unavailable'),rec.available&&gated('Copy specialist prompt',i=>i.governance.recommendations.some(x=>x.name===rec.name&&x.available)&&dependency(rec.name,i.skills,'',false).skill?'':'Unavailable',()=>'$'+rec.name+'\n'+rec.task+'. Use only the explicitly selected project scope. Report the evidence and the next step.'))),
    panel(title('Reference specifications'),facts([[r.name,r.status],['Local copy',r.path],['Validator',r.validator]]),footerLink('Pinned Google specification',r.url))];
}


let libraryQuery='',bookId=books[0].id,stageId='',expanded=new Set([currentPreset.group]),draftNotes=new Map();
function libraryBrowser(){
  const matches=h('div',{class:'catalog-items'});
  const search=input(libraryQuery,v=>{libraryQuery=v;drawRows();},{type:'search',placeholder:'Search by task, category or skill'});
  function drawRows(){
    const term=libraryQuery.toLowerCase().trim(), groups=new Map();
    for(const p of allPresets()){
      if(![p.title,p.group,p.goal,tr(p.title),tr(p.group),tr(p.goal),...p.names].join(' ').toLowerCase().includes(term))continue;
      if(!groups.has(p.group))groups.set(p.group,[]);
      groups.get(p.group).push(p);
    }
    matches.replaceChildren(...[...groups].map(([group,items])=>{
      const section=h('details',{open:!!term||expanded.has(group)},h('summary',{},icon(group),h('span',{},group),h('span',{class:'count'},String(items.length))),
        items.map(p=>h('button',{type:'button',class:'workflow-choice','aria-label':p.title,'aria-current':p.id===currentPreset.id?'true':null,
          title:p.goal,onclick:()=>{
            startPreset(p);
            const composer=document.getElementById('composer');
            if(composer){composer.tabIndex=-1;composer.focus({preventScroll:true});composer.scrollIntoView({block:'nearest'});}
          }},h('span',{},p.title),badge(p.names.length?availability(p,sk()).status:'Manual checkpoint'))));
      section.ontoggle=()=>{if(!term && section.isConnected){if(section.open)expanded.add(group);else expanded.delete(group);}};
      return section;
    }));
    if(!groups.size)matches.append(blank('No workflows match this search.'));
  }
  drawRows();
  return panel(title('Workflow library'),field('Search workflows',search),matches);
}
function playbookStudio(){
  const b=books.find(x=>x.id===bookId),s=b.stages.find(x=>x.id===stageId)||b.stages[0];
  const p=presets.find(x=>x.id===s.id),project=scopedProject(),key=stageKey(project,b,s);
  const notes=()=>({...db.stageNotes,...Object.fromEntries(draftNotes)});
  const prompt=()=>stagePrompt(b,s,project,sk(),notes()[key]);
  const preview=h('pre',{class:'prompt'},prompt());
  const stageNote=input(notes()[key],v=>{draftNotes.set(key,v);preview.textContent=prompt();},{multi:true,rows:3,max:2000,placeholder:'Scope, input paths or additional acceptance checks'});
  async function save(){const value=stageNote.value;db.stageNotes={...db.stageNotes,[key]:value};
    if(!value)delete db.stageNotes[key];await persist();draftNotes.delete(key);toast('Stage configuration saved for '+project.name+'.');}
  return [h('div',{class:'studio-grid'},stack(panel(title('Playbook library'),
    field('Playbook',select(books.map(x=>[x.id,x.title]),b.id,v=>{bookId=v;stageId='';render();},'Playbook')),
    sub(b.purpose),facts([['Intended outcome',b.outcome],['Prerequisites and inputs',b.inputs]])),
    panel(title('Ordered stages'),h('ol',{class:'stage-list'},b.stages.map((st,i)=>{
      const flow=presets.find(x=>x.id===st.id);
      return h('li',{},h('button',{type:'button','aria-label':flow.title,'data-stage':st.id,'aria-current':st===s?'step':null,
        onclick:()=>{stageId=st.id;render();document.querySelector('[data-stage="'+CSS.escape(st.id)+'"]').focus({preventScroll:true});}},
        h('span',{},flow.title),badge(flow.names.length?availability(flow,sk()).status:'Manual checkpoint')));
    })),gated('Copy complete playbook',i=>bookGate(b,scopeFor(i),i.skills),i=>playbookPrompt(b,scopeFor(i),i.skills,notes())))),
    panel(sectionHead(p.title,badge(p.names.length?availability(p,sk()).status:'Manual checkpoint')),sub(p.goal),
      facts([['Depends on',s.dependsOn?presets.find(x=>x.id===s.dependsOn).title+' · accepted deliverable':'Playbook prerequisites'],['Deliverable',p.deliverable],['Acceptance',p.acceptance],['Approval gate',p.approval]]),h('details',{},h('summary',{},'Inputs, skills and workflow stages'),facts(workflowFacts(p,sk()).filter(([label])=>!['Deliverable','Acceptance','Approval gate'].includes(label)))),field('Stage instructions',stageNote),row(btn('Save stage',save),gated('Copy stage prompt',i=>workflowGate(p,null,i),i=>stagePrompt(b,s,scopeFor(i),i.skills,notes()[key]),'primary')),
      h('details',{},h('summary',{},'Stage prompt preview'),preview)))];
}


function studio(){
  if(currentPreset.lifecycleMode)return lifecycleStudio();
  const p=currentPreset, eligibleSkills=sk().filter(eligible),picker=select(allPresets().filter(x=>!groupFilter||x.group===groupFilter).map(x=>[x.id,x.title]),p.id,id=>startPreset(allPresets().find(x=>x.id===id)),'Workflow preset');
  const recommendation=h('div',{class:'recs'}), output=h('div',{class:'output','aria-live':'polite'});
  function updatePreview(){
    preview=compose(form,p,scopedProject(),sk());
    output.replaceChildren(h('pre',{class:'prompt'},preview));
    const names=form.override?form.names:p.names;
    recommendation.replaceChildren(...names.map(n=>h('span',{class:'chip '+(matchSkill(n)?'':'unavailable')},'$'+n+(matchSkill(n)?'':' · unavailable'))));
    if(!names.length)recommendation.append(sub('No skill invocation required.'));
  }
  function edit(k,v){form[k]=v;updatePreview();}
  const editor=(label,k,opts)=>field(label,input(form[k],v=>edit(k,v),opts));
  function remember(){const item={id:crypto.randomUUID(),kind:'Prompt',name:form.task.trim().slice(0,70)||p.title,projectName:active().name,projectId:active().id,
    at:new Date().toISOString(),text:preview,preset:structuredClone(p),form:structuredClone(form)};
    db.history=[item,...db.history.filter(x=>x.text!==preview)].slice(0,24);return persist();}
  function copyButton(label){return gated(label,i=>workflowGate(p,form,i),i=>(preview=compose(form,p,scopeFor(i),i.skills)),'primary',remember);}
  updatePreview();
  const manual=h('details',{},h('summary',{},'Customize skill selection'),sub('Choose which available invocations to include.'),
    btn('Use preset recommendations',()=>{form.override=false;form.names=[...p.names];render();}),h('div',{class:'skillchoices'},eligibleSkills.map(s=>h('label',{class:'check'},
      h('input',{type:'checkbox',checked:(form.override?form.names:p.names).includes(s.inv),onchange:e=>{
        if(!form.override){form.names=p.names.filter(n=>matchSkill(n));form.override=true;}
        form.names=e.target.checked?[...new Set([...form.names,s.inv])]:form.names.filter(n=>n!==s.inv);render();
      }}),s.inv))));
  return [libraryBrowser(),h('div',{class:'studio-grid',id:'composer'},stack(panel(sectionHead(p.title,star('p:'+p.id,p.title)),
    h('div',{class:'picker-fields'},field('Workflow category',select([['','All categories'],...new Set([...categories,...allPresets().map(x=>x.group)])],groupFilter,v=>{groupFilter=v;const first=allPresets().find(x=>!v||x.group===v);if(v && p.group!==v)startPreset(first);else render();},'Workflow category')),
    field('Workflow preset',picker)),row(badge(p.names.length?availability(p,sk()).status:'Manual checkpoint'),sub(p.goal)),h('details',{},h('summary',{},'Workflow brief and dependencies'),facts(workflowFacts(p,sk()))),field('Execution mode',select(Object.keys(modes),form.mode,v=>{edit('mode',v);render();},'Execution mode')),sub(modes[form.mode]),row(btn('Review prompt',()=>{const section=document.getElementById('prompt-preview');section.focus();section.scrollIntoView({block:'start'});}),copyButton('Copy prompt'))),
    panel(title('Task details'),editor('Specific task','task',{multi:true,rows:3,placeholder:'What should Codex accomplish?'}),editor('Module or component','module',{}),
    editor('Relevant files or directories','files',{}),editor('Technical constraints','constraints',{multi:true,rows:2}),editor('Additional instructions','extra',{multi:true,rows:2})),
    panel(title('Skill selection'),recommendation,manual,row(btn('Save combination',()=>saveItem('Combination')),btn('Save custom preset',()=>saveItem('Preset'))))),
    h('section',{class:'preview panel',id:'prompt-preview',tabindex:-1},sectionHead('Prompt preview',badge(form.mode)),output,
      row(copyButton('Copy reviewed prompt'),btn('Save prompt',()=>saveItem('Prompt')),btn('Generate & record',async()=>{updatePreview();await remember();toast('Prompt added to recent history.');})),sub('Copy the prompt into Codex when you are ready.')))];
}
function saveItem(kind){
  let name=currentPreset.title,text=preview;
  const nameInput=input(name,v=>name=v,{max:90});
  modal('Save '+kind.toLowerCase(),field('Name',nameInput),kind==='Prompt'?field('Prompt text',input(text,v=>text=v,{multi:true,rows:8,max:50000})):sub(active().name),
    btn('Save',async()=>{
      if(!name.trim()){nameInput.focus();return;}
      const id=crypto.randomUUID(),preset={...currentPreset,templateId:currentPreset.templateId||currentPreset.id,id,title:name.trim(),mode:form.mode,
        names:form.override?[...form.names]:[...currentPreset.names],goal:form.task.trim()||currentPreset.goal};
      db.saved.push({id,kind,name:name.trim(),at:new Date().toISOString(),projectName:active().name,projectId:active().id,preset,form:structuredClone(form),text});
      try{await persist();closeDialog();toast(kind+' saved.');}catch{}
    },'primary'));
}
async function restore(x){
  if(!db.projects.some(p=>p.id===x.projectId)){toast('Choose a project directory');return;}
  if(db.projects.some(p=>p.id===x.projectId) && db.active!==x.projectId){
    if(!await chooseProject(x.projectId))return;
  }
  startPreset(x.preset,x.form);
}
async function reviewSavedPrompt(x,text){
  const target=db.projects.find(p=>p.id===x.projectId);
  if(!target){toast('The saved project is no longer in this workspace.');return;}
  const dialogTitle=$('#modal-title');
  try{
    if(target.id!==db.active && !await chooseProject(target.id))return;
    const latest=await request('inventory',{project:target.dir});
    if(!dialogTitle.isConnected || !$('#dialog').open || active().id!==target.id)return;
    inv=latest;
    const verify=i=>savedPromptGate(x.preset,x.form,text,scopeFor(i),i.skills);
    modal('Review saved prompt',sub(raw(target.name)),
      h('pre',{class:'prompt'},raw(text)),
      gated('Copy saved text',verify,()=>text,'primary'));
  }catch(e){toast(e.message);}
}
function openSaved(x,recent){
  let name=x.name,text=x.text||'';
  const names=x.preset?.names||[];
  modal(x.kind==='Combination'?'Saved combination':x.kind==='Preset'?'Custom preset':recent?'Recent prompt':'Saved prompt',
    recent?title(name):field('Name',input(name,v=>name=v,{max:90})),sub(x.projectName+' · '+date(x.at)),
    x.kind==='Prompt'?(recent?h('pre',{class:'prompt'},raw(text)):field('Prompt text',input(text,v=>text=v,{multi:true,rows:12,max:50000}))):sub(names.map(n=>'$'+n).join(', ')||'No invocations selected.'),
    row(x.kind==='Prompt' && btn('Review current dependencies',()=>reviewSavedPrompt(x,text),'primary'),
      btn(x.kind==='Combination'?'Use combination':x.kind==='Prompt'?'Open workflow template':'Open configuration',async()=>{
        if(x.kind==='Combination'){form.override=true;form.names=[...names];closeDialog();go('Workflow Studio');}
        else await restore(x);
      }),
      !recent&&btn('Save changes',async()=>{if(!name.trim())return; x.name=name.trim();x.text=text;x.preset.title=x.name;await persist();closeDialog();render();}),
      !recent&&x.kind!=='Prompt'&&btn('Edit configuration',()=>editSavedConfig(x)),
      btn('Remove',()=>confirmAction('Remove saved entry?',x.name,async()=>{
        const key=recent?'history':'saved';db[key]=db[key].filter(v=>v.id!==x.id);db.stars=db.stars.filter(v=>v!=='p:'+x.id);await persist();render();
      },'Remove'))));
}
function editSavedConfig(x){
  const draft=structuredClone(x.form), names=new Set(x.preset.names);
  modal('Edit '+x.kind.toLowerCase(),field('Execution mode',select(Object.keys(modes),draft.mode,v=>draft.mode=v,'Saved mode')),
    ...[['Task','task'],['Component','module'],['Files','files'],['Constraints','constraints'],['Instructions','extra']].map(([label,key])=>field(label,input(draft[key],v=>draft[key]=v))),
    h('div',{class:'skillchoices'},sk().filter(eligible).map(s=>h('label',{class:'check'},h('input',{type:'checkbox',checked:names.has(s.inv),onchange:e=>e.target.checked?names.add(s.inv):names.delete(s.inv)}),s.inv))),
    btn('Save configuration',async()=>{draft.override=true;draft.names=[...names];x.form=draft;x.preset={...x.preset,goal:draft.task.trim()||x.preset.goal,mode:draft.mode,names:[...names]};await persist();closeDialog();render();},'primary'));
}
function securityPage(){
  const app=sk().find(s=>s.inv==='appsec-validation'&&s.scope==='User');
  return [panel(sectionHead('Application security validation',badge(app?.status||'Missing')),sub(app?.path||'No local installation found.'),
    sub('Mode definitions come from the installed skill. Opening a workflow prepares a prompt.')),
    h('div',{class:'split'},Object.entries(security).map(([id,[name,timing,scope,inputs,deliverables]])=>{
      const confirmed=app?.modes.includes(id),p=presets.find(p=>p.securityMode===id&&p.group==='Security');
      return panel(sectionHead(name,badge(confirmed?'Mode verified':'Unverified')),sub(timing),facts([['Purpose and scope',scope],['Required inputs',inputs],['Deliverables',deliverables],
        ['Complementary tools',p.names.filter(n=>n!=='appsec-validation'&&matchSkill(n)).join(', ')||'No eligible pairing.']]),
        sub('Review authorized source only. Runtime scans require separate target-specific approval. CI and release changes require explicit approval.'),
        confirmed&&code('$appsec-validation '+id),row(btn('Open workflow',()=>startPreset(p),'primary'),confirmed&&gated('Copy invocation',i=>workflowGate(p,null,i),()=>'$appsec-validation '+id)));
    }))];
}
function pluginsPage(){
  return [panel(title('Configured MCP servers'),sub('Configuration and executable presence are local observations. Connection health is unverified.'),
    table(['Server','Source','Transport','Configuration','Executable'],inv.mcps.map(m=>[m.name,m.source,m.transport,badge(m.status),m.executable]),'MCP servers')),
    panel(title('Plugin installations'),sub('Installed status uses local configuration and package metadata.'),
    table(['Plugin','Version','Publisher','Installation','Activation'],inv.plugins.map(p=>[p.name,p.version,p.publisher,p.installed?'Installed':'Cache only',badge(p.status)]),'Plugin inventory'))];
}
async function chooseProject(id){
  const target=db.projects.find(p=>p.id===id);if(!target)return false;
  try{const next=await request('inventory',{project:target.dir});inv=next;db.active=id;await persist();render();return true;}
  catch(e){toast(e.message);render();return false;}
}
function projectEditor(existing){
  const p=structuredClone(existing||{id:crypto.randomUUID(),name:'',context:'',dir:'',preference:''});
  const err=h('p',{id:'project-error',role:'alert',class:'error'});
  const name=input(p.name,v=>{
    p.name=v;
    if(v.trim() && name.hasAttribute('aria-invalid')){
      name.removeAttribute('aria-invalid');name.removeAttribute('aria-describedby');err.textContent='';
    }
  },{max:90});
  modal(existing?'Edit project':'Add project',field('Project name',name),
    field('Project context',input(p.context,v=>p.context=v,{multi:true,rows:3})),
    field('Project directory (optional)',input(p.dir,v=>p.dir=v,{placeholder:'Absolute project directory'})),
    sub('Only .agents/skills under the selected directory and its repository ancestors are inventoried.'),
    field('Prompt preferences',input(p.preference,v=>p.preference=v,{multi:true,rows:2})),err,
    btn('Save project',async()=>{
      if(!p.name.trim()){
        err.textContent=tr('Enter a project name.');
        name.setAttribute('aria-invalid','true');name.setAttribute('aria-describedby',err.id);name.focus();
        return;
      }
      try{p.name=p.name.trim();p.dir=p.dir.trim();const next=await request('inventory',{project:p.dir});
        if(existing)db.projects=db.projects.map(v=>v.id===p.id?p:v);else db.projects.push(p);
        db.active=p.id;inv=next;await persist();closeDialog();render();}
      catch(e){err.textContent=e.message;}
    },'primary'));
}
function projectPage(){
  return [panel(sectionHead('Project profiles',btn('Add project',()=>projectEditor(),'primary')),db.projects.map(p=>h('div',{class:'listrow'},stack(h('strong',{},raw(p.name)),sub(p.context||p.dir?raw(p.context||p.dir):'No project context added.')),
    row(p.id===db.active?badge('Selected'):btn('Select',()=>chooseProject(p.id)),btn('Edit',()=>projectEditor(p)),db.projects.length>1&&btn('Remove',()=>confirmAction('Remove project profile?',p.name,async()=>{
      if(db.active===p.id && !await chooseProject(db.projects.find(x=>x.id!==p.id).id))return;
      db.projects=db.projects.filter(x=>x.id!==p.id);await persist();render();
    },'Remove'))))))];
}
function favoritesPage(){
  const favoriteSkills=sk().filter(s=>favor('s:'+s.id)),favoritePresets=allPresets().filter(p=>favor('p:'+p.id));
  return [h('div',{class:'split'},panel(title('Favorite skills'),favoriteSkills.length?favoriteSkills.map(s=>h('div',{class:'listrow'},btn(raw(s.name),()=>detail(s),'plain'),star('s:'+s.id,s.name))):blank('Star skills in the library.')),
    panel(title('Favorite workflows'),favoritePresets.length?favoritePresets.map(presetRow):blank('Star a preset in Workflow Studio.'))),
    panel(title('Personal workflows'),db.saved.length?db.saved.map(x=>savedRow(x)):blank('Save prompts, presets and skill combinations in Workflow Studio.')),
    panel(title('Recent prompts'),db.history.length?db.history.map(x=>savedRow(x,true)):blank('Copy or record a studio prompt to start your history.'))];
}
let catalogExamples=null;
function discoveryPanel(){
  let query='',folder='';
  const results=h('div',{'aria-live':'polite'});
  function draw(){
    if(!catalogExamples)return;
    const term=query.trim().toLowerCase();
    const found=catalogExamples.skills.filter(s=>s.path.toLowerCase().includes(term));
    results.replaceChildren(h('small',{},tr('Matches')+': '+found.length+' · '+catalogExamples.revision.slice(0,12)),
      ...found.slice(0,50).map(s=>h('div',{class:'listrow'},footerLink(s.name,s.url),h('small',{},raw(s.path)))));
  }
  const search=input('',v=>{query=v;draw();},{placeholder:'Search official examples'});
  const load=btn('Load official catalog',async()=>{
    load.disabled=true;
    try{catalogExamples=await request('catalog',{confirmed:true});draw();}
    catch(e){toast(e.message);}finally{load.disabled=false;}
  });
  draw();
  const path=input('',v=>folder=v,{placeholder:'Local folder containing SKILL.md'});
  async function review(){
    try{
      const r=await request('import-preview',{folder});
      const approve=btn('Install reviewed skill',async()=>{
        approve.disabled=true;
        try{await request('import-confirm',{ticket:r.ticket,sha256:r.sha256,confirmed:true});closeDialog();await refresh();toast('Skill installed. Check availability in Codex.');}
        catch(e){toast(e.message);}
      },'primary');
      modal('Review skill before installing',sub('Read the complete instructions. A skill can ask Codex to access files, tools or accounts when used.'),
        facts([['Name',r.name],['Destination',r.target],['SHA-256',r.sha256]]),h('pre',{class:'prompt'},raw(r.text)),approve);
    }catch(e){toast(e.message);}
  }
  return panel(title('Discover and install skills'),field('Search official examples',search),
    load,sub('Loads public file names from openai/plugins. Your search and inventory stay on this computer.'),results,
    field('Review a local package',path),btn('Preview files',review),
    sub('Import a standalone SKILL.md from a downloaded folder. Packages with additional files require a separate review.'));
}
function settingsPage(){
  const checked=sk().filter(s=>s.checkable);
  return [panel(title('Workspace'),facts([['Local address',location.origin],['Preferences and history',storagePath],['Configuration inspected',inv.config],['Last inventory refresh',date(inv.refreshed)]]),
    field('Appearance',select(['System','Light','Dark'],db.appearance,v=>{db.appearance=v;applyTheme();persist().catch(()=>{});},'Appearance'))),
    panel(title('Update checks'),sub('Select a verified installation to compare its pinned directory with the upstream default branch. Each check shows its destination before connecting.'),
      checked.length?checked.map(s=>h('div',{class:'listrow'},stack(h('strong',{},s.name),h('small',{},s.version.slice(0,12)+' · '+(checkFor(s)?.status||'Not checked'))),btn('Inspect update',()=>detail(s)))):blank('No installation has a verified upstream pin.')),
    panel(title('Manage installations'),sub('For standalone skills, back up your configuration before editing one matching [[skills.config]] entry. Set enabled to false to disable it, or true to enable it, then restart Codex.'),
      code('[[skills.config]]\npath = "/absolute/path/to/SKILL.md"\nenabled = false'),
      sub('To update a standalone skill, review the pinned official source and move the old copy outside its discovery root before using the Codex skill installer. To remove it, move the installation folder to Trash. Manage plugin updates and removal from the Codex plugin browser.'),
      row(footerLink('Codex skill documentation','https://learn.chatgpt.com/docs/build-skills'),footerLink('Plugin management','https://learn.chatgpt.com/docs/plugins'))),
    panel(title('Local server'),sub('Run the launcher again to reopen the local workspace.'),
      btn('Stop server…',()=>confirmAction('Stop Skill Control?', 'Your saved workspace will be available the next time you launch the application.',async()=>{await queue;await request('stop',{});document.body.replaceChildren(h('main',{},h('h1',{},'Skill Control stopped'),sub('Double-click the launcher to reopen your workspace.')));},'Stop server')))];
}
function applyTheme(){document.documentElement.dataset.theme=db.appearance.toLowerCase();}
function render(){
  if(!inv)return;
  tab=routes[location.hash.slice(1)]||'Overview';
  document.title=tr(tab)+' · Skill Control';
  document.documentElement.lang=language;
  $('#language').value=language;
  $('#refresh').textContent=tr('Refresh inventory');
  $('#project-label').textContent=tr('Project');
  $('.skip').textContent=tr('Skip to workspace');
  $('#nav-toggle').textContent=tr('Menu');
  $('#workspace-nav').setAttribute('aria-label',tr('Workspace navigation'));
  $('#project').setAttribute('aria-label',tr('Active project'));
  $('.machine').lastChild.textContent=tr('Local workspace');
  const nav=$('nav');
  nav.replaceChildren(...navigation.map(([label,items])=>h('div',{class:'navgroup',role:'group','aria-label':label},
    h('span',{class:'navlabel','aria-hidden':'true'},label),
    items.map(page=>h('a',{href:'#'+slug(page),'aria-current':tab===page?'page':null},icon(pageIcons[page]),page)))));
  $('#crumb').textContent=tr(navigation.find(([,items])=>items.includes(tab))[0])+' / '+tr(tab);
  const project=$('#project');project.replaceChildren(...db.projects.map(p=>h('option',{value:p.id},raw(p.name))));project.value=db.active;
  const pagesUI={'Governance':governancePage,'Playbook Studio':playbookStudio,'Overview':overview,'Skill Library':library,'Workflow Studio':studio,'Security':securityPage,'Plugins & MCP':pluginsPage,'Projects':projectPage,'Favorites':favoritesPage,'Settings':settingsPage};
  const subtitle={'Playbook Studio':'Prepare a staged plan, review dependencies and copy the agreed scope.','Governance':'Inspect project evidence and prepare a verified lifecycle workflow.','Overview':'Your local Codex environment at a glance.','Skill Library':'Inspect installed skills, activation settings and provenance.','Workflow Studio':'Compose a task with the right project, mode and skills.','Security':'Prepare a scoped application security review.','Plugins & MCP':'Inspect installed packages and declared server connections.','Projects':'Set the context and discovery scope for each workspace.','Favorites':'Retrieve your saved skills, workflows and prompts.','Settings':'Manage local preferences, update evidence and the server.'};
  const content=pagesUI[tab]();
  if(tab==='Skill Library')content.push(discoveryPanel());
  const main=$('#main'); main.dataset.page=slug(tab);
  main.replaceChildren(h('div',{class:'pagehead'},h('h1',{},tab),sub(subtitle[tab])),...(tab==='Overview'?[]:inv.warnings.map(message=>h('p',{class:'warning'},message))),...(tab==='Workflow Studio'?[h('div',{class:'workflow-layout'},...content)]:content));
}
async function refresh(){
  if(busy)return;busy=true;$('#refresh').disabled=true;
  try{inv=await request('inventory',{project:active()?.dir||''});render();toast('Inventory refreshed.');}
  catch(e){toast(e.message);}finally{busy=false;$('#refresh').disabled=false;}
}
async function boot(){
  const data=await request('session');token=data.token;storagePath=data.storage;rev=data.rev;checks=data.checks;
  db={projects:structuredClone(projects),active:projects[0].id,stars:[],saved:[],history:[],appearance:'System',...data.state};
  setLanguage(db.language||(navigator.language.toLowerCase().startsWith('hu')?'hu':'en'));
  $('#language').onchange=async e=>{
    const before=language;
    setLanguage(e.target.value);db.language=language;render();
    try{await persist();}catch(err){setLanguage(before);db.language=before;render();toast(err.message);}
    $('#language').focus();
  };
  form=fresh(currentPreset);applyTheme();
  try{inv=await request('inventory',{project:active()?.dir||''});}
  catch(e){inv=await request('inventory',{project:''});inv.warnings.push('Selected project directory unavailable. Showing global inventory.');toast(e.message);}
  render();
}
const compactNavigation=matchMedia('(max-width:800px)');
const workspaceNav=$('#workspace-nav');
function sizeNavigation(){
  if(compactNavigation.matches)workspaceNav.setAttribute('popover','auto');
  else workspaceNav.removeAttribute('popover');
}
sizeNavigation();
compactNavigation.addEventListener('change',sizeNavigation);
workspaceNav.addEventListener('click',event=>{
  if(event.target.closest('a') && workspaceNav.matches(':popover-open'))workspaceNav.hidePopover();
});
$('.skip').onclick=e=>{e.preventDefault();$('#main').focus();};
window.addEventListener('hashchange',()=>{if(location.hash==='#main')return;closeDialog();render();$('#main').focus();window.scrollTo(0,0);});
$('#project').onchange=e=>chooseProject(e.target.value);
$('#refresh').onclick=refresh;
window.addEventListener('unhandledrejection',e=>{toast(e.reason?.message||'Local operation failed.');});
boot().catch(e=>$('#main').replaceChildren(h('h1',{},'Workspace unavailable'),sub(e.message),btn('Retry',()=>location.reload())));

