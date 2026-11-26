"""Validate the small JSON workspace before committing a new revision."""
CATEGORIES=("Architecture","UI/UX","Frontend Development","Cloudflare Development","Security","Testing",
            "Code Quality","Deployment","Maintenance","Framer Development","Skill Management","Development Governance")
CATEGORIES+=("Project Lifecycle","Infrastructure & Cloudflare","Design & Anti-Slop","Testing & QA","Deployment & Release","Framer")
MODES=("AUDIT","PLAN","IMPLEMENT","VERIFY")

def text(value,limit=6000):
    return isinstance(value,str) and len(value)<=limit

def strings(value,limit=600):
    return isinstance(value,list) and len(value)<=limit and all(text(x,300) for x in value)

def fields(item,names,limit=6000):
    return isinstance(item,dict) and all(text(item.get(k),limit) for k in names.split())

def preset(item):
    return (fields(item,"id title goal") and item.get("mode") in MODES and item.get("group") in CATEGORIES
            and strings(item.get("names")) and item.get("securityMode") in (None,"quick","audit","release","ci-setup"))

def form(item):
    return (fields(item,"task module files constraints extra") and item.get("mode") in MODES
            and isinstance(item.get("override"),bool) and strings(item.get("names")))

def entry(item):
    return (fields(item,"id kind name projectId projectName at") and item.get("kind") in ("Prompt","Preset","Combination")
            and text(item.get("text"),100_000) and form(item.get("form")) and preset(item.get("preset")))

def valid(state):
    if not isinstance(state,dict) or set(state)-{"projects","active","stars","saved","history","appearance","stageNotes","language"}:
        return False
    if state.get("language","en") not in ("en","hu"): return False
    notes=state.get("stageNotes",{})
    if not isinstance(notes,dict) or len(notes)>500 or not all(text(k,300) and text(v,2000) for k,v in notes.items()):
        return False
    if not strings(state.get("stars",[])) or state.get("appearance","System") not in ("System","Dark","Light"):
        return False
    if "projects" in state or "active" in state:
        projects=state.get("projects")
        if not isinstance(projects,list) or not 1<=len(projects)<=100:
            return False
        if not all(fields(p,"id name context dir preference") and p["name"].strip() and text(p["dir"],2000) for p in projects):
            return False
        ids=[p["id"] for p in projects]
        if len(set(ids))!=len(ids) or state.get("active") not in ids:
            return False
    for key,limit in (("saved",300),("history",30)):
        rows=state.get(key,[])
        if not isinstance(rows,list) or len(rows)>limit or not all(entry(x) for x in rows):
            return False
    return True

