"""Skill Control local HTTP service. Run with Python 3.11 or newer."""
import argparse
import errno
import hmac
import http.client
import json
import os
import secrets
import sqlite3
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import catalog_search
import installer
import inventory
import updates
import workspace

PORT=0
if os.name=="nt":
    parent=Path(os.environ.get("LOCALAPPDATA") or Path.home()/"AppData/Local")
elif sys.platform=="darwin":
    parent=Path.home()/"Library/Application Support"
else:
    parent=Path(os.environ.get("XDG_DATA_HOME") or Path.home()/".local/share")
DATA=parent/"Skill Control Beta"
ASSETS={"locale.js":"text/javascript","catalog.js":"text/javascript","icon.svg":"image/svg+xml","index.html":"text/html","app.js":"text/javascript","workflows.js":"text/javascript","style.css":"text/css"}
MAX_BODY=1_200_000

class Store:
    def __init__(self, folder):
        folder.mkdir(parents=True, mode=0o700, exist_ok=True)
        self.path=folder/"workspace.sqlite"
        with self.connect() as c:
            c.execute("CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, rev INTEGER, payload TEXT)")
            c.execute("INSERT OR IGNORE INTO workspace VALUES (1,0,'{}')")
            c.execute("CREATE TABLE IF NOT EXISTS checks (id TEXT PRIMARY KEY, payload TEXT)")
    def connect(self):
        return sqlite3.connect(self.path,timeout=4)
    def get(self):
        with self.connect() as c:
            rev,data=c.execute("SELECT rev,payload FROM workspace WHERE id=1").fetchone()
        return {"rev":rev,"state":json.loads(data)}
    def save(self,rev,data):
        if type(rev) is not int or not workspace.valid(data):
            raise ValueError("Invalid workspace data or storage limit reached.")
        with self.connect() as c:
            count=c.execute("UPDATE workspace SET rev=rev+1,payload=? WHERE id=1 AND rev=?",(json.dumps(data),rev)).rowcount
        return count==1
    def check_results(self):
        with self.connect() as c:
            return {k:json.loads(v) for k,v in c.execute("SELECT id,payload FROM checks")}
    def put_check(self,key,data):
        with self.connect() as c:
            c.execute("INSERT OR REPLACE INTO checks VALUES (?,?)",(key,json.dumps(data)))

class Handler(BaseHTTPRequestHandler):
    server_version="SkillControl"
    def log_message(self,*args):
        pass
    def reply(self,code,value,kind="application/json"):
        payload=(json.dumps(value).encode() if kind=="application/json" else value)
        self.send_response(code)
        for k,v in {"Content-Type":kind+"; charset=utf-8","Content-Length":str(len(payload)),
            "Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY",
            "Referrer-Policy":"no-referrer","Cross-Origin-Resource-Policy":"same-origin",
            "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
            "Permissions-Policy":"camera=(), microphone=(), geolocation=()"
            }.items():
            self.send_header(k,v)
        self.end_headers()
        self.wfile.write(payload)
    def denied(self):
        self.reply(403,{"error":"Local origin required."})
    def local(self):
        return (self.headers.get_all("Host")==[self.server.host] and
            self.headers.get("Sec-Fetch-Site","none") in ("none","same-origin") and
            self.headers.get("Origin",self.server.origin)==self.server.origin)
    def do_GET(self):
        if not self.local():
            return self.denied()
        if self.path=="/api/identity":
            return self.reply(200,{"app":"skill-control-local","protocol":1})
        if self.path=="/api/session" and hmac.compare_digest(self.headers.get("X-Skill-Control","").encode(),self.server.launch_key.encode()):
            return self.reply(200,{"token":self.server.token,"storage":str(self.server.store.path),**self.server.store.get(),"checks":self.server.store.check_results()})
        path=self.path[1:] if self.path!="/" else "index.html"
        if path in ASSETS:
            return self.reply(200,(inventory.BASE/"web"/path).read_bytes(),ASSETS[path])
        self.reply(404,{"error":"Unknown resource."})
    def do_POST(self):
        if not self.local() or self.headers.get("Origin")!=self.server.origin or not hmac.compare_digest(
            self.headers.get("X-Skill-Token","").encode(),self.server.token.encode()):
            return self.denied()
        if self.headers.get("Content-Type","").split(";")[0]!="application/json":
            return self.reply(415,{"error":"JSON required."})
        try:
            if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length",[]))!=1:
                raise ValueError("A single content length is required.")
            length=int(self.headers["Content-Length"])
            if not 0<length<=MAX_BODY:
                return self.reply(413,{"error":"Request exceeds the workspace limit."})
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict):
                raise ValueError("Invalid request.")
            if self.path=="/api/inventory":
                result=inventory.scan(data.get("project",""))
            elif self.path=="/api/workspace":
                if not self.server.store.save(data.get("rev"),data.get("state")):
                    return self.reply(409,{"error":"Workspace changed in another window. Reload before saving."})
                result={"rev":data["rev"]+1}
            elif self.path=="/api/check":
                skill=next((s for s in inventory.scan()["skills"] if s["id"]==data.get("id") and s["checkable"]),None)
                if not skill or data.get("confirmed") is not True:
                    raise ValueError("Confirm the displayed GitHub source first.")
                result=updates.check(skill)
                self.server.store.put_check(skill["id"],result)
            elif self.path=="/api/catalog":
                if data.get("confirmed") is not True:
                    raise ValueError("Confirm the public catalog lookup.")
                result=catalog_search.list_examples()
            elif self.path=="/api/import-preview":
                result=self.server.importer.preview(data.get("folder"))
            elif self.path=="/api/import-confirm":
                result=self.server.importer.install(data.get("ticket"),data.get("sha256"),data.get("confirmed"))
            elif self.path=="/api/stop":
                result={"stopped":True}
                threading.Thread(target=self.server.shutdown,daemon=True).start()
            else:
                return self.reply(404,{"error":"Unknown action."})
            self.reply(200,result)
        except (ValueError,TypeError,RecursionError) as exc:
            message=str(exc) if type(exc) is ValueError and len(str(exc))<140 else "Invalid request."
            self.reply(400,{"error":message})
        except (OSError,sqlite3.Error,RuntimeError):
            self.reply(503,{"error":"Local storage or inventory is unavailable. Check permissions and refresh."})

class Server(ThreadingHTTPServer):
    daemon_threads=True
    def get_request(self):
        sock,addr=super().get_request()
        sock.settimeout(15)
        return sock,addr

def serve(port=PORT,folder=DATA):
    server=Server(("127.0.0.1",port),Handler)
    server.host="127.0.0.1:"+str(server.server_port)
    server.origin="http://"+server.host
    server.importer=installer.SkillImporter()
    server.store=Store(folder)
    server.launch_key=secrets.token_urlsafe(32)
    server.token=secrets.token_urlsafe(32)
    return server

if __name__=="__main__":
    os.umask(0o077)
    parser=argparse.ArgumentParser()
    parser.add_argument("--open",action="store_true")
    args=parser.parse_args()
    import webbrowser
    service=serve()
    url=service.origin+"/#key="+service.launch_key
    print("Open this private link on this computer: "+url,flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        service.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        service.server_close()

