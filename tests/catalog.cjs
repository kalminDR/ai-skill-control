const assert=require('node:assert/strict');
(async()=>{
  const {presets,categories,books,dependency,availability,compose,stageKey,stagePrompt,playbookPrompt}=await import('../web/workflows.js');
  const project={id:'fixture',name:'Fixture',dir:'/isolated/project'};
  const byId=new Map(presets.map(p=>[p.id,p]));
  assert.equal(categories.length,11);assert.equal(byId.size,presets.length);assert.equal(books.length,7);
  for(const group of categories)assert(presets.filter(p=>p.group===group).length>=3);
  for(const p of presets){
    for(const key of ['when','avoid','inputs','steps','deliverable','acceptance','approval'])assert(p[key]?.length,p.title+' '+key);
    assert(p.names.length<=1);
  }
  const sample=byId.get('full-security-audit'),id=sample.names[0];
  const record={inv:id,name:id,scope:'User',valid:true,status:'Enabled',workflowReviewed:true,modes:['audit'],deps:[]};
  assert.equal(availability(sample,[]).status,'Missing required skill');
  assert.equal(availability(sample,[{...record,status:'Disabled'}]).status,'Disabled dependency');
  for(const patch of [{duplicate:true},{workflowReviewed:false},{modes:[]},{deps:['tool · missing on local PATH']}]) {
    const bad=[{...record,...patch}];assert.equal(availability(sample,bad).status,'Pending verification');
    assert(!compose({mode:'AUDIT'},sample,project,bad).includes('$'+id));
  }
  assert.equal(availability(sample,[record]).status,'Partially available');
  const both=[record,{...record,inv:'insecure-defaults',name:'insecure-defaults',modes:[]}];
  assert.equal(availability(sample,both).status,'Ready');
  const text=compose({mode:'AUDIT'},sample,project,both);
  assert(text.includes('$appsec-validation audit'));assert(!text.includes('$insecure-defaults'));
  assert(!dependency('fixture-plugin',[]).skill);
  for(const book of books){
    const seen=new Set();
    for(const [i,s] of book.stages.entries()){
      assert(byId.has(s.id)&&!seen.has(s.id));assert(i===0?s.dependsOn===null:seen.has(s.dependsOn));seen.add(s.id);
      assert(stagePrompt(book,s,project,[],'only this stage').includes('only this stage'));
    }
    const first=book.stages[0],key=stageKey(project,book,first),notes={[key]:'scoped note'};
    const records=[...new Set(book.stages.flatMap(s=>byId.get(s.id).names))].map(inv=>({
      inv,name:inv,scope:'User',valid:true,status:'Enabled',workflowReviewed:true,deps:[],
      modes:book.stages.map(s=>byId.get(s.id).variant).filter(Boolean)}));
    const full=playbookPrompt(book,project,records,notes);
    assert.equal(full.split('scoped note').length,2);
    assert.equal(full.split('Stage gate:').length,book.stages.length+1);
    assert(!playbookPrompt(book,{...project,id:'another'},[],notes).includes('scoped note'));
    assert(!playbookPrompt(book,project,[],notes).match(/\$[a-z][\w-]+/),'Missing skills must block the entire playbook');
  }
  console.log('Passed catalog integrity, all five availability states, exact mode gates, optional selection, stage dependencies and project-specific exports.');
})().catch(e=>{console.error(e);process.exitCode=1;});

