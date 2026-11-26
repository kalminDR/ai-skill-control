import unittest
from catalog_search import list_examples

class CatalogSearchTests(unittest.TestCase):
    def test_pinned_public_files_only(self):
        commit="b"*40
        tree="a"*40
        calls=[]
        def fetch(path):
            calls.append(path)
            if path.endswith("/HEAD"):return {"sha":commit,"commit":{"tree":{"sha":tree}}}
            return {"truncated":False,"tree":[
                dict(path="plugins/example/skills/example/SKILL.md",type="blob",mode="100644"),
                dict(path="plugins/example/skills/.hidden/SKILL.md",type="blob",mode="100644"),
                dict(path="plugins/example/skills/linked/SKILL.md",type="blob",mode="120000")]}
        data=list_examples(fetch)
        self.assertEqual([s["name"] for s in data["skills"]],["example"])
        self.assertIn("/blob/"+commit+"/",data["skills"][0]["url"])
        self.assertEqual(len(calls),2)

    def test_incomplete_index_is_not_presented_as_complete(self):
        with self.assertRaises(ValueError):
            list_examples(lambda p: {"sha":"a"*40,"commit":{"tree":{"sha":"b"*40}}} if p.endswith("HEAD") else {"truncated":True,"tree":[]})

