"""Local governance observations. No rule, skill, Git index or state file is written."""
import hashlib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from inventory import inside, readfile

SPECIALISTS = json.loads(Path(__file__).with_name("specialists.json").read_text(encoding="utf-8"))
SPEC_REV = "db977b3c1d1f309269f43d5d17ae828d54bd6ae3"
SPEC_HASH = "8cb9671805be22b27ab12e4613312682716115fd40d6b17b5152dc11e9c99f7a"
CONTRACT = {
    "SKILL.md": "1d5ec7a1c9c4820843430833e012c33eb24c80e968cd703f78ea45f6f318459c",
    "references/project-memory.md": "2a443afb89e43d13717a24e52401afd43aa328e942e6ec867cfa71e2376a7178",
    "references/repository-checks.md": "09c5c6ff3cee2acc328270c026a0947399798fa95861490c185699288019ec42",
}
MODES = {
    "bootstrap": "Check existing files and enclosing repositories. Propose the smallest starting record for a new project.",
    "adopt": "Identify the existing setup, tests and state owner. Propose exact documentation gaps and edits.",
    "health": "Report current discrepancies with local evidence, unverified checks and one next action.",
    "checkpoint": "Identify the canonical state record and propose a current, timestamped baseline and next action.",
    "handoff": "Compare the state record with local files and Git evidence. Summarize drift, checks and the next step.",
    "resume": "Reconstruct the objective from disk, reconcile the recorded baseline and give one executable next step.",
    "release": "Review the exact candidate and test evidence. List release blockers and missing evidence.",
    "cleanup": "List exact cleanup candidates, references and recovery options for review.",
}

def doc(root, rel):
    p = root / rel
    if not inside(root, p):
        return "Linked or outside scope", ""
    try:
        content = readfile(p, 512_000).decode("utf-8-sig")
        return ("Present" if content.strip() else "Empty"), content
    except FileNotFoundError:
        return "Missing", ""
    except (ValueError, OSError):
        return "Unreadable", ""

def matches(root, rel, digest):
    try:
        return inside(root,root/rel) and hashlib.sha256(readfile(root/rel)).hexdigest() == digest
    except (OSError, ValueError):
        return False

def eligible(s):
    return s["valid"] and not s["duplicate"] and (s["status"]=="Enabled" or (s["status"]=="Previously enabled" and s["observed"]))

def lifecycle(skills):
    copies=[s for s in skills if s["name"]=="project-lifecycle"]
    possible=[s for s in copies if eligible(s) and s["inv"]=="project-lifecycle"]
    if not copies:
        return "Not installed", None
    if len(possible)!=1:
        return "Unavailable · disabled, ambiguous or unverified", None
    skill=possible[0]
    if not all(matches(Path(skill["path"]).parent,rel,h) for rel,h in CONTRACT.items()):
        return "Installed instructions differ · review required", None
    skill["modes"]=list(MODES)
    return "Installed · eight modes verified", skill

def git_info(root):
    env={**{k:os.environ[k] for k in ("SystemRoot","PATH","TEMP","TMP") if k in os.environ},"HOME":str(Path.home()),"LC_ALL":"C",
         "GIT_NO_LAZY_FETCH":"1","GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":os.devnull,"GIT_TERMINAL_PROMPT":"0"}
    def git(*args):
        p=subprocess.run([shutil.which("git") or "git","--no-optional-locks","-c","core.fsmonitor=false","-c","core.untrackedCache=false",
                          "-c","core.hooksPath="+os.devnull,"-c","core.preloadIndex=false","-C",str(root),*args],
                         env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=3)
        return p.returncode,p.stdout
    result=dict(status="Unverified", branch="Unverified",head="Unverified",tree="Unverified")
    try:
        rc,where=git("rev-parse","--show-toplevel")
        if rc:
            if not any((p/".git").exists() or (p/".git").is_symlink() for p in (root,*root.parents)) and not (root/"HEAD").exists():
                result.update(status="Outside Git",branch="outside Git",head="outside Git",tree="Not applicable")
            return result
        result["status"]="Repository" if Path(os.fsdecode(where.rstrip(b"\n")))==root else "Inside enclosing repository"
        rc,ref=git("symbolic-ref","--quiet","--short","HEAD")
        result["branch"]=ref.decode(errors="replace").strip() if rc==0 else "detached" if rc==1 else "Unverified"
        rc,head=git("rev-parse","--verify","HEAD")
        result["head"]=head.decode().strip() if rc==0 else "unborn" if result["branch"] not in ("detached","Unverified") else "Unverified"
        # Skip status when external filters, includes or lazy remote objects would make the read unsafe.
        rc,_=git("config","--name-only","--get-regexp",r"^(filter\.|include\.|includeif\.|extensions\.partialclone|remote\..*\.promisor)")
        if rc!=1:
            result["tree"]="Not inspected · repository configuration requires review"
            return result
        rc,output=git("status","--porcelain=v1","-z","--untracked-files=normal","--ignore-submodules=all","--no-renames","--",".")
        if rc==0:
            codes=[v[:2] for v in output.split(b"\0") if len(v)>=3]
            result["tree"]=("Clean" if not codes else f"{sum(c[:1] not in (b' ',b'?') for c in codes)} staged · "
                f"{sum(c[1:] not in (b' ',b'?') for c in codes)} unstaged · {codes.count(b'??')} untracked entries")
    except (OSError,ValueError,subprocess.TimeoutExpired):
        pass
    return result

def project_status(root):
    docs={}
    states=[]
    for name in ["README.md","STATE.md","HANDOFF.md","docs/STATE.md","AGENTS.md","AGENTS.override.md","DESIGN.md"]:
        status,content=doc(root,name)
        docs[name]=status
        if name in ("README.md","STATE.md","docs/STATE.md","HANDOFF.md") and re.search(r"(?im)^## Current state\s*$",content):
            states.append((name,content))
    state=states[0][1] if len(states)==1 else ""
    git=git_info(root)
    section=re.search(r"(?ims)^## Current state[ \t]*\r?\n(.*?)(?=^## |\Z)",state)
    fields=dict(re.findall(r"(?m)^([\w /-]+):[ \t]*(\S[^\n]*)$",section[1] if section else ""))
    timestamp=fields.get("Updated","").strip()
    try:
        when=datetime.fromisoformat(timestamp.replace("Z","+00:00"))
        if when.tzinfo is None or when>datetime.now(timezone.utc): timestamp=""
    except ValueError: timestamp=""
    required=("Project / component","Branch","Baseline HEAD before this edit","Goal","Work in progress","Checks","Next")
    complete=bool(timestamp and all(fields.get(k,"").strip() for k in required))
    baseline=complete and fields["Branch"]==git["branch"] and fields["Baseline HEAD before this edit"]==git["head"]
    proof=git["tree"]=="Clean" and re.fullmatch(r"[0-9a-f]{40,64}",git["head"]) is not None
    verified=bool(baseline and proof and git["status"]!="Unverified")
    return dict(path=str(root),docs=docs,git=git,owner=states[0][0] if len(states)==1 else "Ambiguous" if states else "Unidentified",recorded=timestamp or "No valid timestamp",
                checkpoint=timestamp if verified else "Unverified",readiness=(
                    "Ready for reconstruction" if verified and docs["README.md"]=="Present" else
                    "Review current evidence against checkpoint" if complete else "Incomplete · current state or required fields missing"))

def inspect(skills,home,codex,selected=None):
    policy="Missing"
    global_path=str(codex/"AGENTS.md")
    for filename in ("AGENTS.override.md","AGENTS.md"):
        status,_=doc(codex,filename)
        if status in ("Missing","Empty"):
            if status=="Empty" and policy=="Missing": policy="Empty"
            continue
        policy=status
        global_path=str(codex/filename)
        break
    availability,skill=lifecycle(skills)
    spec=codex/"references/google-design-md"/SPEC_REV/"docs/spec.md"
    ref_state="Verified local copy" if matches(spec.parent,spec.name,SPEC_HASH) else doc(spec.parent,spec.name)[0]
    if ref_state=="Present": ref_state="Local content differs from reviewed copy"
    reference=dict(name="Google DESIGN.md",path=str(spec),status=ref_state,validator="Blocked · independent package and dependency verification pending",
                   url=f"https://github.com/google-labs-code/design.md/blob/{SPEC_REV}/docs/spec.md")
    choices={s["inv"]:s for s in skills if eligible(s)}
    recommendations=[dict(task=record["goal"],name=name,available=bool(choices.get(name,{}).get("specialistReviewed"))) for name,record in SPECIALISTS.items()]
    recommendations.append(dict(task="Review insecure defaults",name="insecure-defaults",available="insecure-defaults" in choices))
    return dict(policy=policy,policyPath=global_path,lifecycle=availability,lifecyclePath=skill["path"] if skill else "",
                reference=reference,selected=project_status(selected) if selected else None,
                recommendations=recommendations,presets=[dict(id=mode,title=mode.title(),goal=goal,
                invocation="$project-lifecycle "+mode if skill else "") for mode,goal in MODES.items()])

