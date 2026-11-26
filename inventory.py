"""Offline inventory. Only normalized, allowlisted fields leave this module."""
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import tomllib
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
HOME = Path.home()
CODEX = Path(os.environ.get("CODEX_HOME", HOME / ".codex"))
EVIDENCE = {"sources": {}, "plugins": {}, "date": ""}
WORKFLOW_INSTRUCTIONS = json.loads((BASE / "workflow-instructions.json").read_text(encoding="utf-8"))
IDENT = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\Z")
MODES = ("quick", "audit", "release", "ci-setup")
PUBLISHERS = {"getsentry": "Sentry", "vercel-labs": "Vercel", "anthropics": "Anthropic",
              "cloudflare": "Cloudflare", "trailofbits": "Trail of Bits"}
CATEGORIES = {
    "Frontend & Design": ("frontend-design", "web-design", "modern-web", "web-perf", "visualize"),
    "Application Security": ("security", "appsec", "insecure", "threat-", "attack-path", "finding", "patch-risk", "vulnerability", "check-skills"),
    "Testing": ("playwright", "validation", "verify-fix"),
    "Code Quality": ("code-review", "code-simplifier", "review-agent"),
    "Architecture": ("agents-sdk", "durable-objects"),
    "Infrastructure & Deployment": ("cloudflare", "workers-", "wrangler", "sandbox", "cloud-environment"),
    "Skill Management": ("skill-", "find-skills", "plugin-", "template-creator"),
    "Platform-specific Development": ("framer", "sites", "google-", "pages", "windsor", "work-pets"),
}

def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def mapping(value):
    return value if isinstance(value, dict) else {}

def clean(value, maximum=1500):
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return ""
    return " ".join(str(value).split())[:maximum]

def identifier(value):
    return isinstance(value, str) and bool(IDENT.fullmatch(value))

def readfile(path, limit=512_000):
    # Reject linked files, devices and oversized data before reading.
    before = os.lstat(path)
    if not stat.S_ISREG(before.st_mode) or getattr(before, "st_file_attributes", 0) & 1024:
        raise ValueError("Unsupported file")
    fd = os.open(path, os.O_RDONLY | getattr(os,"O_NOFOLLOW",0) | getattr(os,"O_NONBLOCK",0) | getattr(os,"O_BINARY",0))
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(fd)
        if not os.path.samestat(before,info) or not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            raise ValueError("Unsupported file")
        data = stream.read(limit + 1)
        if len(data) > limit:
            raise ValueError("File too large")
        return data

def loadjson(path):
    try:
        return mapping(json.loads(readfile(path)))
    except (OSError, ValueError, RecursionError):
        return {}

def folders(root):
    if root.is_symlink() or not root.is_dir():
        return []
    try:
        return sorted((p for p in root.iterdir() if p.is_dir() or p.is_symlink()), key=lambda p: p.name)[:600]
    except OSError:
        return []

def linked(path):
    return path.is_symlink() or (path.exists() and bool(getattr(path.lstat(), "st_file_attributes", 0) & 1024))

def inside(base, path):
    try:
        return path.resolve().is_relative_to(base.resolve()) and not any(
            linked(p) for p in (path, *path.parents) if p.is_relative_to(base))
    except (RuntimeError, OSError):
        return False

def category(name, plugin):
    for group, words in CATEGORIES.items():
        if any(word in name.lower() or word in plugin.lower() for word in words):
            return group
    return "Other"

def project_folder(raw):
    if raw == "":
        return None
    if not isinstance(raw, str) or len(raw) > 2000 or "\x00" in raw:
        raise ValueError("Enter an absolute project directory.")
    if raw.startswith(("//", "\\\\")):
        raise ValueError("Choose a local project directory.")
    path = Path(raw).expanduser()
    if not path.is_absolute() or ".." in path.parts or any(p.startswith(".") for p in path.parts[1:]):
        raise ValueError("Choose an absolute, non-hidden project directory.")
    path = path.resolve()
    if any(p.startswith(".") for p in path.parts[1:]) or path == Path(path.anchor) or path in (Path("/"), HOME, Path("/Users"), Path("/Volumes")) or not path.is_dir():
        raise ValueError("Choose an existing project directory.")
    return path

def config_at(path):
    if not path.exists():
        return {}, True
    try:
        return tomllib.loads(readfile(path, 2_000_000).decode()), True
    except (OSError, ValueError, RecursionError):
        return {}, False

def select_status(selectors, name, path, default):
    for item in selectors if isinstance(selectors, list) else []:
        rule = mapping(item)
        if ((rule.get("name") == name or rule.get("path") == str(path))
                and isinstance(rule.get("enabled"), bool)):
            default = "Enabled" if rule["enabled"] else "Disabled"
    return default

def parse_yaml(sources):
    from vendor import yaml
    values = []
    for source in sources:
        try:
            depth = 0
            for event in yaml.parse(source, Loader=yaml.SafeLoader):
                if isinstance(event, yaml.events.AliasEvent):
                    raise ValueError("YAML aliases are unsupported")
                if isinstance(event, yaml.events.CollectionStartEvent):
                    depth += 1
                if isinstance(event, yaml.events.CollectionEndEvent):
                    depth -= 1
                if depth > 32:
                    raise ValueError("Front matter is nested too deeply")
            values.append(mapping(yaml.safe_load(source)))
        except (ValueError, yaml.YAMLError, RecursionError):
            values.append({})
    return values

def pinned_source(directory, name):
    record = EVIDENCE["sources"].get(name)
    if not record:
        return None, False
    # A pin is valid only for the recorded tree, including supporting files.
    try:
        actual = {str(p.relative_to(directory)) for p in directory.rglob("*") if p.is_file() or p.is_symlink()}
        if actual != set(record["files"]):
            return record, False
        for rel, digest in record["files"].items():
            p = directory / rel
            if not inside(directory, p) or hashlib.sha256(readfile(p, 3_000_000)).hexdigest() != digest:
                return record, False
    except (OSError, ValueError, RuntimeError):
        return record, False
    return record, True

def public_link(value):
    # Only display plain public documentation addresses. Drop query strings and fragments.
    if isinstance(value, str) and re.fullmatch(r"https://[A-Za-z0-9.-]+(?:/[\w./%-]*)?", value):
        return value
    return ""

def scan(project=""):
    import governance
    selected = project_folder(project)
    config, config_ok = config_at(CODEX / "config.toml")
    warnings = [] if config_ok else ["User configuration could not be read. Activation is unverified."]
    roots = [(HOME / ".agents/skills", "User", None), (CODEX / "skills/.system", "System", None),
             (CODEX / "skills", "Legacy", None)]
    if os.name != "nt": roots.append((Path("/etc/codex/skills"), "Admin", None))
    project_configs=[]
    if selected:
        chain = [selected]
        repo = next((p for p in (selected, *selected.parents) if (p / ".git").exists()), None)
        if repo:
            chain.extend(p for p in selected.parents if p.is_relative_to(repo))
        for folder in chain:
            root = folder / ".agents/skills"
            if inside(folder, root):
                roots.append((root, "Project", None))
            else:
                warnings.append("Linked project skill root skipped.")
            local_config=folder/".codex/config.toml"
            if local_config.is_file():
                layer,ok=config_at(local_config) if inside(folder,local_config) else ({},False)
                project_configs.insert(0,(layer,ok))
                warnings.append("Project configuration present. Project trust and effective overrides require confirmation in Codex.")
    plugins, mcps, entries, sources = [], [], [], []
    def add_mcps(data, origin):
        for key, value in mapping(data).items():
            if not identifier(key) or not isinstance(value, dict):
                continue
            cmd = value.get("command")
            path = None
            if isinstance(cmd, str) and cmd and len(cmd) < 1000:
                path = shutil.which(cmd)
            mcps.append(dict(name=key, source=origin, transport="stdio" if cmd else "HTTP" if "url" in value else "Unspecified",
                status="Disabled" if value.get("enabled") is False else "Configured" if origin == "User config" else "Declared",
                executable=("Found" if path else "Missing on server PATH") if cmd else "Not applicable"))
    add_mcps(config.get("mcp_servers"), "User config")
    cache = CODEX / "plugins/cache"
    for market in folders(cache) if inside(CODEX,cache) else []:
        if not inside(cache, market):
            continue
        for package in folders(market):
            if not inside(market, package) or not identifier(package.name):
                continue
            key = package.name + "@" + market.name
            configured = mapping(mapping(config.get("plugins")).get(key)).get("enabled")
            versions = [p for p in folders(package) if inside(package, p) and not p.name.startswith(".")]
            for version in versions:
                manifest = {}
                for loc in (version/".codex-plugin/plugin.json", version/"plugin.json"):
                    if inside(version, loc):
                        manifest = loadjson(loc)
                    if manifest:
                        break
                marked = (package/".codex-remote-plugin-install.json").is_file()
                known = bool(manifest) and ((configured is not None and len(versions)==1) or (marked and len(versions)==1))
                active = ("Disabled" if configured is False else "Enabled" if known and configured is True else "Unverified")
                author = clean(mapping(manifest.get("author")).get("name"))
                plugin = dict(id=key, name=package.name, version=version.name, publisher=author or "Unverified",
                              installed=known, status=active, path=str(version), repo=public_link(manifest.get("repository")))
                plugins.append(plugin)
                raw_mcp = manifest.get("mcpServers")
                if isinstance(raw_mcp,str) and len(raw_mcp)<300:
                    location=version/raw_mcp
                    if inside(version,location):
                        raw_mcp=loadjson(location)
                if isinstance(raw_mcp,dict):
                    add_mcps(raw_mcp.get("mcpServers",raw_mcp),key)
                elif (version/"mcp.json").is_file() and inside(version,version/"mcp.json"):
                    data=loadjson(version/"mcp.json")
                    add_mcps(data.get("mcpServers",{}),key)
                paths = manifest.get("skills", "./skills")
                for rel in paths if isinstance(paths,list) else [paths]:
                    if isinstance(rel,str) and len(rel)<300 and inside(version,version/rel):
                        roots.append((version/rel, "Plugin", plugin))
    lock = mapping(loadjson(HOME/".agents/.skill-lock.json").get("skills"))
    for root, scope, plugin in roots:
        anchor=HOME if scope=="User" else CODEX if scope in ("Legacy","System","Plugin") else root
        if root.is_symlink() or not inside(anchor,root):
            warnings.append("Linked skill root skipped: " + str(root))
            continue
        for directory in folders(root):
            if directory.name.startswith("."):
                continue
            path = directory/"SKILL.md"
            error, body, head, agent_yaml = "", "", "", ""
            try:
                if not inside(root,path):
                    raise ValueError("Linked installation skipped")
                raw = readfile(path).decode("utf-8-sig").replace("\r\n","\n")
                match = re.match(r"\A---[ \t]*\n(.*?)\n---[ \t]*(?:\n|\Z)",raw,re.S)
                if not match or len(match[1])>32000:
                    raise ValueError("Missing or oversized YAML front matter")
                head,body=match[1],raw[match.end():]
                agent = directory/"agents/openai.yaml"
                if inside(directory,agent) and agent.is_file():
                    agent_yaml=readfile(agent,32000).decode()
            except (OSError,ValueError) as e:
                error=str(e) if type(e) is ValueError else "Unreadable or missing skill metadata"
            entries.append((scope,plugin,directory,path,error,body))
            sources.extend([head,agent_yaml])
    parsed = parse_yaml(sources)
    skills=[]
    for i,(scope,plugin,directory,path,error,body) in enumerate(entries):
        front,agent = map(mapping,parsed[2*i:2*i+2])
        name,desc = front.get("name"),clean(front.get("description"),2400)
        valid = not error and identifier(name) and bool(desc)
        if not valid and not error:
            error="Invalid YAML or missing name/description"
        name=name if identifier(name) else directory.name
        prefix=(plugin["name"] + ":") if plugin else ""
        inv=prefix+name
        status=plugin["status"] if plugin else "Unverified" if scope=="Legacy" else "Enabled"
        status=select_status(mapping(config.get("skills")).get("config"),inv,path,status)
        for layer,ok in project_configs:
            rules=mapping(layer.get("skills"))
            proposed=select_status(rules.get("config"),inv,path,status)
            if scope=="System" and mapping(rules.get("bundled")).get("enabled") is False:
                proposed="Disabled"
            if not ok or proposed!=status or (plugin and plugin["id"] in mapping(layer.get("plugins"))):
                status="Unverified"
        if plugin and (plugin["status"]=="Disabled" or not plugin["installed"]):
            status=plugin["status"] if plugin["installed"] else "Unverified"
        if not config_ok or not valid:
            status="Unverified"
        if scope=="System" and mapping(mapping(config.get("skills")).get("bundled")).get("enabled") is False:
            status="Disabled"
        record,matched=pinned_source(directory,name) if scope=="User" and valid else (None,False)
        repo=plugin["repo"] if plugin else ""
        publisher=plugin["publisher"] if plugin else "OpenAI" if scope=="System" else "Unverified"
        version=plugin["version"] if plugin else clean(mapping(front.get("metadata")).get("version"))
        provenance="Plugin manifest" if plugin else "Local metadata"
        if record and matched:
            repo="https://github.com/"+record["repo"]+"/tree/"+record["sha"]+"/"+record["path"]
            publisher=PUBLISHERS.get(record["repo"].split("/")[0],publisher)
            version=record["sha"]
            provenance="Installation record · tree hashes match"
        if scope=="User" and name=="find-skills" and mapping(lock.get(name)).get("source")=="vercel-labs/skills":
            publisher,repo,provenance="Vercel","https://github.com/vercel-labs/skills","Local installer lock"
        deps=[]
        tools=mapping(agent.get("dependencies")).get("tools",[])
        for dep in tools if isinstance(tools,list) else []:
            value=mapping(dep).get("value")
            if identifier(value):
                deps.append(value+" · declared tool, availability unverified")
        for skill,command in (("modern-web-guidance","npx"),("playwright-cli","playwright-cli"),("framer","npx")):
            if name==skill and command in body:
                found=shutil.which(command,path=os.environ.get("PATH","")+os.pathsep+str(HOME/".local/bin"))
                deps.append(command+(" · found" if found else " · missing on local PATH"))
        if valid and name=="framer" and "@framer/agent@latest setup" in body:
            deps.append("Framer authorization and per-session setup · unverified")
        modes=[m for m in MODES if re.search(r"(?m)^\|\s*'?" + chr(96)+re.escape(m)+chr(96)+r"\s*\|",body)] if name=="appsec-validation" and scope=="User" and valid else []
        reviewed = valid and inv in WORKFLOW_INSTRUCTIONS and governance.matches(directory,"SKILL.md",WORKFLOW_INSTRUCTIONS[inv])
        if reviewed and inv=="interface-design":
            modes=re.findall(r"(?m)^- `(/interface-design:[\w-]+)`",body)
        if inv=="hallmark" and valid and "`--fast`" in body and governance.matches(directory,"SKILL.md",governance.SPECIALISTS["hallmark"]["digest"]):
            modes=["--fast"]
        if reviewed and inv=="improve-animations" and "## Invocation Variants" in body:
            modes=["quick","standard","deep","performance","accessibility","easing","plan <description>","execute <plan>","reconcile"]
        specialist=governance.SPECIALISTS.get(name) if scope=="User" and valid else None
        reviewed_specialist=bool(specialist and governance.matches(directory,"SKILL.md",specialist["digest"]))
        if reviewed_specialist:
            publisher=specialist["publisher"]
            repo=specialist["source"]
            provenance="Local installation record · reviewed instruction digest matches"
        try:
            modified=datetime.fromtimestamp(path.lstat().st_mtime,timezone.utc).isoformat() if not error else ""
        except OSError:
            modified=""
        def excerpt(pattern):
            heading=re.search(r"(?im)^#{1,4}\s+(?:"+pattern+r")\s*$",body)
            if not heading:
                return ""
            section=re.split(r"(?m)^#|^```",body[heading.end():].strip(),maxsplit=1)[0]
            return clean(section,650)
        discovery=("Plugin package; runtime availability requires Codex confirmation." if plugin else
                   "Legacy location; confirm in the Codex picker." if scope=="Legacy" else
                   "Installed in a documented "+scope.lower()+" skill root. Check the Codex picker for current-session availability.")
        skills.append(dict(workflowReviewed=bool(reviewed),specialistReviewed=reviewed_specialist,observed=False,id=hashlib.sha256(str(path).encode()).hexdigest()[:24], name=name,inv=inv if valid else "",
            description=desc,scope=scope,plugin=prefix.rstrip(":"),category="Frontend & Design" if specialist else category(name,prefix),publisher=publisher,
            origin="Custom" if publisher=="Personal" else "Third-party" if publisher not in ("Unverified","OpenAI") else "OpenAI" if publisher=="OpenAI" else "Unverified",
            path=str(path),status=status,valid=bool(valid),issue=error or ("Local tree differs from recorded revision" if record and not matched else ""),
            source=provenance,repo=repo,version=version,modified=modified,checkable=bool(matched),
            implicit=mapping(agent.get("policy")).get("allow_implicit_invocation") is not False,
            modes=modes,deps=deps,duplicate=False,discovery=discovery,
            usage=excerpt("when to use(?: this skill)?|usage|use cases"),exclusions=excerpt("when not to use(?: this skill)?|do not use|out of scope")))
    counts=Counter(s["inv"] for s in skills if s["valid"] and s["status"]!="Disabled")
    for s in skills:
        s["duplicate"]=counts[s["inv"]]>1
    return dict(skills=skills,plugins=plugins,mcps=mcps,warnings=warnings,refreshed=now(),project=str(selected or ""),
                governance=governance.inspect(skills,HOME,CODEX,selected),
                config=str(CODEX/"config.toml"),observationDate=EVIDENCE["date"])

