#!/usr/bin/env python3
"""cabz · build the site bar and the versions from git.

    python3 _build/build.py        (open-locally.command runs it for you)

1. Reads _build/projects.json (sections, project order, titles).
2. Reads git history: each commit touching a project is one version of it, except commits
   with [minor] in the message, which fold into the version before them.
3. Writes
     site.js               the map of the site that nav.js draws the bar from
     <project>/_v/<id>/    older versions, only the files that differ from today's
                           (anything else is served from the live folder, see .htaccess)
4. Makes sure every page loads site.js + nav.js with the right relative path.

site.js and _v/ are generated: git-ignored, rebuilt on every run, and uploaded with the site.
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "_build", "_v", "node_modules"}
TAG_RE = re.compile(r'[ \t]*<script[^>]*src="[^"]*(?:site|nav|versions)\.js"[^>]*></script>\n?', re.I)


def git(*args, binary=False):
    out = subprocess.run(["git", "-C", str(ROOT), *args], check=True, capture_output=True).stdout
    return out if binary else out.decode("utf-8")


def tree(rev, path):
    files = {}
    for line in git("ls-tree", "-r", rev, "--", path + "/").splitlines():
        meta, name = line.split("\t", 1)
        files[name] = meta.split()[2]
    return files


def tags(page_path, depth, version=""):
    up = "../" * depth
    v = f' data-version="{version}"' if version else ""
    return (f'<script src="{up}site.js" defer></script>\n'
            f'<script src="{up}nav.js" data-path="{page_path}"{v} defer></script>\n')


def inject(html, snippet):
    html = TAG_RE.sub("", html)
    m = re.search(r"</body\s*>", html, re.I)
    if m:
        return html[:m.start()] + snippet + html[m.start():]
    return html.rstrip("\n") + "\n" + snippet


def versions_of(project):
    try:
        log = git("log", "--reverse", "--format=%H%x1f%aI%x1f%s", "--", project + "/").splitlines()
    except subprocess.CalledProcessError:
        return []
    commits = [dict(zip(("sha", "date", "msg"), l.split("\x1f"))) for l in log]
    return [c for c in commits if "[minor]" not in c["msg"]]


def main():
    try:
        git("rev-parse", "HEAD")
        has_git = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        has_git = False
        print("no git history: building without versions")

    conf = json.loads((ROOT / "_build" / "projects.json").read_text("utf-8"))
    site = {"sections": []}

    for sec in conf["sections"]:
        s = {"id": sec["id"], "short": sec.get("short", sec["id"]), "title": sec["title"], "projects": []}
        listed = [p["name"] for p in sec["projects"]]
        on_disk = sorted(d.name for d in (ROOT / sec["id"]).iterdir() if d.is_dir() and d.name not in SKIP_DIRS and not d.name.startswith((".", "_")))
        for extra in on_disk:
            if extra not in listed:
                print(f"  note: {sec['id']}/{extra} is not in projects.json, added at the end")
                sec["projects"].append({"name": extra, "title": extra})

        for p in sec["projects"]:
            d = ROOT / sec["id"] / p["name"]
            if not d.is_dir():
                print(f"  note: {sec['id']}/{p['name']} is in projects.json but not on disk, skipped")
                continue
            pid = f"{sec['id']}/{p['name']}"
            if (d / "_v").exists():
                shutil.rmtree(d / "_v")

            entry = {"id": pid, "name": p["name"], "title": p.get("title", p["name"]),
                     "href": pid + "/" + p.get("href", ""), "versions": []}
            if p.get("note"):
                entry["note"] = p["note"]

            vs = versions_of(pid) if has_git else []
            if len(vs) >= 2:
                live = tree("HEAD", pid)
                for i, c in enumerate(vs):
                    is_live = i == len(vs) - 1
                    vid = c["sha"][:7]
                    files = live if is_live else tree(c["sha"], pid)
                    pages = sorted(f[len(pid) + 1:] for f in files if f.endswith(".html"))
                    msg = re.sub(r"^\s*[\w./-]+\s*[·:]\s*", "", c["msg"]).strip() or c["msg"]
                    entry["versions"].append({"id": vid, "date": c["date"], "msg": msg, "pages": pages, "live": is_live})
                    if is_live:
                        continue
                    for path, blob in files.items():
                        rel = path[len(pid) + 1:]
                        is_html = rel.endswith(".html")
                        if not is_html and live.get(path) == blob:
                            continue
                        data = git("cat-file", "blob", blob, binary=True)
                        if is_html:
                            depth = path.count("/") + 2  # + _v/<id>/
                            data = inject(data.decode("utf-8", "replace"), tags(path, depth, vid)).encode("utf-8")
                        dest = d / "_v" / vid / rel
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(data)
                print(f"{pid}: {len(vs)} versions")
            s["projects"].append(entry)
        site["sections"].append(s)

    (ROOT / "site.js").write_text(
        "// generated by _build/build.py, do not edit\nwindow.CABZ = "
        + json.dumps(site, ensure_ascii=False, indent=1) + ";\n", "utf-8")
    print("site.js written")

    # every live page loads the bar
    changed = 0
    for f in sorted(ROOT.rglob("*.html")):
        rel = f.relative_to(ROOT)
        if any(part in SKIP_DIRS or part.startswith(".") for part in rel.parts[:-1]):
            continue
        html = f.read_text("utf-8")
        new = inject(html, tags(rel.as_posix(), len(rel.parts) - 1))
        if new != html:
            f.write_text(new, "utf-8")
            changed += 1
    if changed:
        print(f"{changed} pages got their bar tags updated (commit them)")


if __name__ == "__main__":
    main()
