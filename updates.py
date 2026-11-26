"""Explicit upstream comparison for the audited installation records only."""
import http.client
import json
import re
from urllib.parse import quote
from inventory import EVIDENCE, now

def github(path, limit=1_000_000):
    connection = http.client.HTTPSConnection("api.github.com", timeout=6)
    try:
        connection.request("GET", path, headers={"User-Agent":"Skill-Control-local",
            "Accept":"application/vnd.github+json"})
        response=connection.getresponse()
        if response.status != 200:
            raise ValueError("GitHub did not return a verifiable result.")
        payload=response.read(limit+1)
        if len(payload)>limit:
            raise ValueError("Response exceeds the local verification limit.")
        return json.loads(payload)
    finally:
        connection.close()

def check(skill, fetch=github):
    record=EVIDENCE["sources"].get(skill["name"])
    if not skill["checkable"] or not record:
        raise ValueError("This installation has no verified source revision.")
    base="/repos/"+record["repo"]
    result=dict(status="Unverifiable", checked=now(), installed=record["sha"], latest="", url=skill["repo"])
    try:
        head=fetch(base+"/commits/HEAD")["sha"]
        if not re.fullmatch("[0-9a-f]{40}",head):
            return result
        def tree(ref):
            rows=fetch(base+"/contents/"+quote(record["path"])+ "?ref="+ref)
            if not isinstance(rows,list) or not rows or len(rows)>=1000:
                raise ValueError("Incomplete upstream tree")
            return sorted((r["name"],r["type"],r["sha"]) for r in rows)
        same=head==record["sha"] or tree(head)==tree(record["sha"])
        result.update(status="Current" if same else "Upstream differs", latest=head)
    except (OSError,ValueError,KeyError,TypeError,http.client.HTTPException):
        pass
    return result

