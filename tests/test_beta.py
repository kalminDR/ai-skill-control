import hashlib
import http.client
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import installer
import inventory
import server

SAMPLE=b"---\nname: sample-skill\ndescription: A synthetic local fixture\n---\nRead the example.\n"

class BetaTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name).resolve()
        self.home=self.root/"home"
        self.home.mkdir()
        self.folder=self.root/"incoming"
        self.folder.mkdir()
        (self.folder/"SKILL.md").write_bytes(SAMPLE)
        self.imp=installer.SkillImporter(self.home)

    def test_import_is_exact_single_use_and_never_overwrites(self):
        review=self.imp.preview(str(self.folder))
        self.assertFalse((self.home/".agents").exists())
        (self.folder/"SKILL.md").write_bytes(b"changed after preview")
        self.imp.install(review["ticket"],review["sha256"],True)
        self.assertEqual((Path(review["target"])/"SKILL.md").read_bytes(),SAMPLE)
        with self.assertRaises(ValueError):self.imp.install(review["ticket"],review["sha256"],True)
        (self.folder/"SKILL.md").write_bytes(SAMPLE)
        with self.assertRaises(ValueError):self.imp.preview(str(self.folder))

    def test_block_extra_files_and_unapproved_bytes(self):
        r=self.imp.preview(str(self.folder))
        with self.assertRaises(ValueError):self.imp.install(r["ticket"],r["sha256"],False)
        with self.assertRaises(ValueError):self.imp.install(r["ticket"],"bad",True)
        (self.folder/".hidden").write_text("test")
        with self.assertRaises(ValueError):self.imp.preview(str(self.folder))
        self.assertFalse((self.home/".agents").exists())

    def test_empty_profile_and_fresh_scans(self):
        codex=self.home/".codex"
        codex.mkdir()
        with patch.object(inventory,"HOME",self.home),patch.object(inventory,"CODEX",codex):
            def scan():return [s for s in inventory.scan()["skills"] if s["scope"]=="User"]
            self.assertEqual(scan(),[])
            data=inventory.scan()
            self.assertIsNone(data["governance"]["selected"])
            self.assertNotIn("pilot",data["governance"])
            r=self.imp.preview(str(self.folder))
            self.imp.install(r["ticket"],r["sha256"],True)
            self.assertEqual(scan()[0]["status"],"Enabled")
            (codex/"config.toml").write_text('[[skills.config]]\nname="sample-skill"\nenabled=false\n')
            self.assertEqual(scan()[0]["status"],"Disabled")
            (Path(r["target"])/"SKILL.md").unlink()
            self.assertFalse(any(s["valid"] for s in scan()))

    def test_launch_session_requires_per_instance_key(self):
        svc=server.serve(0,self.root/"data")
        thread=threading.Thread(target=svc.serve_forever,daemon=True)
        thread.start()
        try:
            for key,expected in [("local",404),(svc.launch_key,200)]:
                conn=http.client.HTTPConnection(svc.host,timeout=4)
                conn.request("GET","/api/session",headers={"X-Skill-Control":key})
                response=conn.getresponse()
                self.assertEqual(response.status,expected)
                response.read()
                conn.close()
            self.assertTrue(svc.store.save(0,{"language":"hu"}))
            self.assertEqual(server.Store(self.root/"data").get()["state"],{"language":"hu"})
        finally:
            svc.shutdown()
            svc.server_close()
            thread.join()

if __name__=="__main__":
    unittest.main()

