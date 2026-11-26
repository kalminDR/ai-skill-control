"""User-initiated, read-only search index of official public skill examples."""
import re
from urllib.parse import quote
from updates import github

REPO="openai/plugins"

def catalog_request(path):
    return github(path,limit=8_000_000)

def list_examples(fetch=catalog_request):
    base="/repos/"+REPO
    commit=fetch(base+"/commits/HEAD")
    try:
        revision=commit["sha"]
        tree=commit["commit"]["tree"]["sha"]
        if not all(isinstance(value,str) and re.fullmatch(r"[0-9a-f]{40}",value) for value in (revision,tree)):
            raise ValueError("Invalid catalog revision.")
        payload=fetch(base+"/git/trees/"+tree+"?recursive=1")
        if payload.get("truncated") is not False or not isinstance(payload.get("tree"),list):
            raise ValueError("The catalog response is incomplete.")
        rows=[]
        for item in payload["tree"]:
            path=item.get("path","")
            if item.get("type")!="blob" or item.get("mode")!="100644" or not isinstance(path,str):
                continue
            if not re.fullmatch(r"(?:[a-zA-Z0-9_.-]+/)+SKILL\.md",path):continue
            parts=path.split("/")
            if "skills" not in parts[:-2] or any(p.startswith(".") for p in parts):continue
            rows.append({"name":parts[-2],"path":path,"url":"https://github.com/"+REPO+"/blob/"+revision+"/"+quote(path)})
        return {"revision":revision,"skills":sorted(rows,key=lambda r:(r["name"],r["path"]))}
    except (AttributeError,KeyError,TypeError) as exc:
        raise ValueError("Unsupported catalog response.") from exc

