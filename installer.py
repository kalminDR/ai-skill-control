"""Explicit import of a standalone skill from a local review folder."""
import hashlib
import os
from pathlib import Path
import re
import secrets
import threading
import time

from inventory import HOME, inside, linked, parse_yaml, readfile

class SkillImporter:
    def __init__(self, home=HOME):
        self.home = home
        self.pending = {}
        self.lock = threading.Lock()

    def preview(self, source):
        if not isinstance(source, str) or len(source)>2048 or source.startswith(("//", "\\\\")):
            raise ValueError("Choose a local folder containing SKILL.md.")
        folder = Path(source).expanduser()
        if not folder.is_absolute() or ".." in folder.parts or any(linked(p) for p in (folder,*folder.parents)):
            raise ValueError("Choose an absolute folder without linked components.")
        # Stop after two entries, including hidden entries. Never silently drop supporting files.
        with os.scandir(folder) as entries:
            item = next(entries, None)
            if not item or item.name != "SKILL.md" or next(entries, None) is not None:
                raise ValueError("This package needs a full review. Only a standalone SKILL.md can be imported.")
        data = readfile(folder/"SKILL.md", 256_000)
        text = data.decode("utf-8-sig")
        head = re.match(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)",text,re.S)
        meta = parse_yaml([head[1]])[0] if head and len(head[1])<=32000 else {}
        name = meta.get("name")
        if not isinstance(name,str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",name) or len(name)>64 or name in {"con","prn","aux","nul",*(f"{p}{i}" for p in ("com","lpt") for i in range(10))}:
            raise ValueError("Unsupported skill name.")
        if not isinstance(meta.get("description"),str) or not meta["description"].strip():
            raise ValueError("The skill needs a description.")
        target = self.home/".agents"/"skills"/name
        if not inside(self.home,target) or target.exists():
            raise ValueError("Destination exists or contains a link.")
        ticket = secrets.token_urlsafe(24)
        digest = hashlib.sha256(data).hexdigest()
        with self.lock:
            now = time.monotonic()
            self.pending = {k:v for k,v in self.pending.items() if v[0]>now}
            if len(self.pending)>=16:
                self.pending.pop(next(iter(self.pending)))
            self.pending[ticket] = (now+300,target,data,digest)
        return dict(ticket=ticket,sha256=digest,target=str(target),name=name,text=text)

    def install(self, ticket, digest, confirmed):
        if confirmed is not True or not isinstance(ticket,str):
            raise ValueError("Explicit approval is required.")
        with self.lock:
            review = self.pending.pop(ticket,None)
            if not review or review[0]<=time.monotonic() or digest!=review[3]:
                raise ValueError("Review the package again before installing.")
            _,target,data,_ = review
            if not inside(self.home,target):
                raise ValueError("Linked destination is unsupported.")
            target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
            if not inside(self.home,target) or os.path.lexists(target):
                raise ValueError("The destination already exists or contains a link.")
            target.mkdir(mode=0o700)
            tmp=target/".pending"
            try:
                with tmp.open("xb") as out:
                    out.write(data)
                os.link(tmp,target/"SKILL.md")  # Publish complete bytes without replacing an existing file.
            finally:
                tmp.unlink(missing_ok=True)
                try:
                    target.rmdir()
                except OSError:
                    pass
        return {"installed":target.name}

