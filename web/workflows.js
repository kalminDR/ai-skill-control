import {tr,language,reasonText} from './locale.js';
import {presets,categories,books} from './catalog.js';
export {presets,categories,books};
export const modes = {
  AUDIT: 'Read the scoped material and report evidence. Keep files and services read-only.',
  PLAN: 'Develop a decision-ready plan. Identify assumptions, dependencies and acceptance criteria. Wait for approval before implementation.',
  IMPLEMENT: 'Implement only the requested changes inside the named scope. Preserve existing behavior outside it.',
  VERIFY: 'Verify the stated acceptance criteria with existing isolated tests. Report observed results and gaps.'
};
export const security = {
  quick: ['Quick Check','After a security-sensitive change','Current diff and the directly affected trust boundaries','Diff or changed files, expected behavior and local test scope','Prioritized observations with file evidence and targeted regression checks.'],
  audit: ['Full Audit','During a structured application review','Owned application source and explicitly agreed environments','Repository scope, data flows, roles and authorized evidence','Coverage matrix, evidence-backed findings, gaps and remediation priorities.'],
  release: ['Release Gate','Before deciding on a release candidate','Exact revision and agreed release criteria','Candidate revision, release criteria, existing test evidence and exceptions','GO, NO-GO or NEEDS REVIEW with reasons and unverified gates.'],
  'ci-setup': ['Continuous Security Setup','When establishing or revising CI','Repository-specific pipeline and permission requirements','CI provider, workflow files, cost limits and approval boundaries','Minimal CI proposal, permissions, failure thresholds and verification plan.']
};
export const projects=[{id:'default',name:'Local workspace',context:'',dir:'',preference:''}];
export function eligible(s) {
  return (s.inv!=='project-lifecycle' || s.modes?.length>0) && s.valid && (s.status==='Enabled' || (s.status==='Previously enabled' && s.observed)) && !s.duplicate;
}

// A workflow mapping requires its reviewed instructions in addition to inventory eligibility.
export function dependency(name,skills,variant='',curated=true) {
  const candidates=skills.filter(s=>s.inv===name || (!s.valid && s.name===name));
  const result=(status,why,skill=null)=>({status,why:name+' · '+why,skill});
  if(!candidates.length)return result('Missing required skill','no installation in the scanned roots');
  if(candidates.every(s=>s.status==='Disabled'))return result('Disabled dependency','disabled by local configuration');
  if(name==='project-lifecycle' && candidates.some(s=>s.valid&&!s.duplicate&&s.status==='Enabled'&&!s.modes?.length))
    return result('Pending verification','installed instructions or references do not match the reviewed lifecycle contract');
  const skill=candidates.find(eligible);
  if(!skill)return result('Pending verification',candidates.some(s=>s.duplicate)?'ambiguous invocation across installations':
    candidates.map(s=>s.issue || s.status).join(', ')+'; no verified eligible installation');
  if(name==='project-lifecycle' && !skill.modes?.length)return result('Pending verification','lifecycle contract has not been verified');
  if(curated && name!=='project-lifecycle' && !skill.workflowReviewed)return result('Pending verification','installed instructions differ from the reviewed mapping');
  if(variant && !skill.modes?.includes(variant))return result('Pending verification','mode '+variant+' is unverified');
  const unresolved=(skill.deps||[]).filter(d=>/missing|unverified/i.test(d));
  if(unresolved.length)return result('Pending verification',unresolved.join(', '));
  return result('Ready','verified '+skill.scope+' skill',skill);
}
function selection(p,name,skills) {
  const source=presets.find(x=>x.id===(p.templateId||p.id));
  const owner=p.lifecycleMode?'project-lifecycle':p.securityMode?'appsec-validation':source?.names[0];
  const variant=name===owner ? (p.variant || p.lifecycleMode || p.securityMode) : '';
  return {...dependency(name,skills,variant,Boolean(source?.names.includes(name))),variant};
}
export function availability(p,skills) {
  const primary=p.names.map(n=>selection(p,n,skills));
  const optional=p.optional?.length?dependency(p.optional[0],skills):null;
  const domainNames=p.names.includes('better-interface') ? ['better-accessibility','better-layout','better-writing','better-typography','better-colors','better-ui','better-motion'] : [];
  const domains=domainNames.map(name=>dependency(name,skills));
  const unavailable=primary.find(d=>!d.skill);
  return {status:unavailable?.status || (!p.names.length?'Manual checkpoint':(optional&&!optional.skill)||domains.some(d=>!d.skill)?'Partially available':'Ready'),
    reason:[...primary.map(d=>d.why),...domains.map(d=>'Audit domain '+d.why),...(optional?[ 'Optional '+optional.why]:[])].join('\n') || 'Uses the selected project’s existing local evidence. No specialist required.',
    primary,optional};
}
// Every entry point resolves the original template even for a saved override.
export function gate(p,form,project,skills,manual=false){
  if(project.scopeUnavailable || (p.lifecycleMode&&!project.dir)) return 'Choose a project directory';
  const template=presets.find(x=>x.id===(p.templateId||p.id))||p;
  const names=form?.override?form.names:p.names;
  const required=[...new Set([...template.names,...p.names,...names])];
  for(const name of required){
    const d=selection(template,name,skills);
    if(!d.skill)return d.why;
    if(template.names.includes(name)&&!names.includes(name))return 'Required skill omitted';
  }
  return names.length||manual?'':'Manual checkpoint';
}
// Saved text can contain explicit invocation lines added after the workflow was composed.
export function savedPromptGate(p,form,text,project,skills){
  const reason=gate(p,form,project,skills);
  if(reason)return reason;
  if(!text.trim())return 'The saved text is empty.';
  for(const line of text.split(/\r?\n/)){
    const match=/^\s*\$([a-z0-9][\w.:-]*)(?:[ \t]+(.+?))?\s*$/.exec(line);
    if(!match)continue;
    const [,name,variant='']=match;
    const d=dependency(name,skills,variant.trim(),presets.some(item=>item.names.includes(name)));
    if(!d.skill)return d.why;
  }
  return '';
}
export function bookGate(book,project,skills){
  const stages=book.stages.map(s=>presets.find(p=>p.id===s.id));
  for(const p of stages){
    const reason=gate(p,null,project,skills,true);
    if(reason)return p.title+' · '+reason;
  }
  return stages.some(p=>p.names.length)?'':'Manual checkpoint';
}
export function workflowFacts(p,skills) {
  const a=availability(p,skills);
  return [['Availability',tr(a.status)+'\n'+reasonText(a.reason)],['Use when',p.when],['Skip when',p.avoid],
    ['Required inputs',tr(p.inputs)],['Primary skills',p.names.join(', ')||'Existing project capabilities'],
    ['Complementary skills',p.optional?.length?p.optional[0]+' — '+tr(p.optional[1]):'None recommended'],
    ['Documented skill modes',a.primary.flatMap(d=>d.skill?.modes?.length?[d.skill.inv+' · '+d.skill.modes.join(', ')]:[]).join('\n')||'No eligible documented modes verified'],
    ['Preset choice',p.variant||'Default skill behavior'],['Default execution mode',p.lifecycleMode?'AUDIT (read-only)':p.mode],['Workflow stages',p.steps?.map((s,i)=>(i+1)+'. '+tr(s)).join('\n')],
    ['Deliverable',p.deliverable],['Acceptance',p.acceptance],['Approval gate',p.approval]].filter(([,v])=>v);
}
export function compose(form,p,project,skills) {
  const names=form.override?form.names:p.names;
  const resolved=names.map(n=>selection(p,n,skills));
  const required=availability(p,skills);
  const gaps=[...new Set([...required.primary,...resolved].filter(d=>!d.skill).map(d=>d.why))];
  if(project.scopeUnavailable)gaps.push('The selected project directory could not be inspected.');
  if(p.lifecycleMode&&!project.dir)gaps.push('An explicitly selected project directory is required.');
  const reason=gate(p,form,project,skills,true);
  if(reason && !gaps.includes(reason))gaps.push(reason);
  const blocked=gaps.length>0;
  // Prepare only verified invocation lines.
  const lines=resolved.filter(d=>d.skill).map(({skill:s,variant:chosen})=>{
    return '$'+s.inv+(chosen && !chosen.startsWith('/')?' '+chosen:'')+(chosen?.startsWith('/')?(language==='hu'?'\nDokumentált munkafolyamat: ':'\nDocumented workflow: ')+chosen:'');
  });
  const mode=p.lifecycleMode?'AUDIT':form.mode;
  const parts=[
    ['Objective',form.task?.trim() || tr(p.goal)],
    ['Project',[project.name,project.context,project.preference,project.dir].filter(Boolean).join('\n')],
    ['Execution mode',mode+' — '+tr(modes[mode])],['Scope',[form.module,form.files].filter(Boolean).join('\n')||tr('Use the explicitly selected project scope.')],
    ['Availability',blocked?tr('HOLD. Resolve prerequisites and refresh before starting.')+'\n'+reasonText(gaps.join('\n')):tr(required.status)+'\n'+reasonText(required.reason)],
    ['Selected Codex skills',blocked?tr('No invocation prepared.'):lines.join('\n')||tr('Use the project’s existing local capabilities.')],
    ['Inputs',tr(p.inputs)],['Complementary skill',p.optional?.length?p.optional[0]+(language==='hu'?' csak akkor, ha: ':' only if: ')+tr(p.optional[1]):''],['Stages',p.steps?.map(tr).join('\n')],['Deliverables',tr(p.deliverable||p.goal)],
    ['Verification',tr(p.acceptance||'Record observed results and unverified checks.')],
    ['Constraints',[form.constraints,tr('Preserve unrelated work and keep credentials out of reports.')].filter(Boolean).join('\n')],
    ['Approvals',[tr(p.approval),tr('Separate authorization is required for writes beyond scope, installation, account changes and deployment.')].filter(Boolean).join('\n')],
    ['Additional instructions',form.extra]
  ];
  const body=parts.filter(([,v])=>v).map(([label,v])=>tr(label)+'\n'+v).join('\n\n');
  return p.lifecycleMode&&!blocked?lines[0]+'\n\n'+tr('Read-only preview')+'\n'+body.replace(lines[0],language==='hu'?'Lásd fent az ellenőrzött meghívást.':'See verified invocation above.'):body;
}
const byId=new Map(presets.map(p=>[p.id,p]));
export function stageKey(project,book,stage){return [project.id,book.id,stage.id].map(encodeURIComponent).join('/');}
export function stagePrompt(book,stage,project,skills,note=''){
  const p=byId.get(stage.id), previous=byId.get(stage.dependsOn);
  const text=compose({mode:p.mode,extra:note},p,project,skills);
  if(language==='hu')return [tr(book.title)+' · '+(book.stages.indexOf(stage)+1)+'. lépés · '+tr(p.title),
    'Előfeltétel: '+(previous?'A következő eredmény elfogadása: '+tr(previous.deliverable)+' ('+tr(previous.title)+').':tr(book.inputs)),
    'Folytatás előtt a felelős ellenőrizze az eredményt az elfogadási feltételek alapján.',text].join('\n\n');
  return [book.title+' · Stage '+(book.stages.indexOf(stage)+1)+' · '+p.title,
    'Prerequisite: '+(previous?'Accept the preceding '+previous.deliverable.toLowerCase()+' ('+previous.title+').':book.inputs),
    'Stage gate: stop for owner review of the deliverable against its acceptance criteria before continuing.',
    text].join('\n\n');
}
export function playbookPrompt(book,project,skills,notes={}){
  const blocked=bookGate(book,project,skills);
  if(blocked)return tr('HOLD. Resolve prerequisites and refresh before starting.')+'\n'+reasonText(blocked);
  return [tr(book.title),tr(book.purpose),tr('Intended outcome')+': '+tr(book.outcome),tr('Required inputs')+': '+tr(book.inputs),
    tr('Planning and handoff only. Inspect each stage in order. Stop at every HOLD or approval gate. Do not execute this plan automatically.'),
    ...book.stages.map(s=>stagePrompt(book,s,project,skills,notes[stageKey(project,book,s)]||''))].join('\n\n');
}
// The native client evaluates this same module locally against each fresh inventory.
function nativeCatalog(skills,project,pending=false){
  const workflows=presets.map(p=>({id:p.id,title:tr(p.title),group:p.group,goal:tr(p.goal),initial:p.lifecycleMode?'AUDIT':p.mode,
    dependencies:p.names,names:availability(p,skills).primary.flatMap(d=>d.skill?[d.skill.inv]:[]),status:pending?'Pending verification':availability(p,skills).status,
    facts:workflowFacts(p,skills).map(([k,v])=>[k,pending&&k==='Availability'?'Waiting for the local inventory.':v]).map(([label,value])=>({label,value:tr(value)})),
    prompts:Object.fromEntries(Object.keys(modes).map(mode=>[mode,compose({mode},p,project,skills)]))}));
  const playbooks=books.map(b=>({...b,title:tr(b.title),purpose:tr(b.purpose),inputs:tr(b.inputs),outcome:tr(b.outcome),stages:b.stages.map(s=>({id:s.id,title:tr(byId.get(s.id).title),
    key:stageKey(project,b,s),text:stagePrompt(b,s,project,skills)}))}));
  return {workflows,playbooks};
}
