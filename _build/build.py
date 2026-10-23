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
import hashlib, json, re, shutil, subprocess, sys
from datetime import datetime
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


def history(paths):
    """All commits touching any of the paths, oldest first."""
    try:
        log = git("log", "--reverse", "--format=%H%x1f%aI%x1f%s", "--", *[p + "/" for p in paths]).splitlines()
    except subprocess.CalledProcessError:
        return []
    return [dict(zip(("sha", "date", "msg"), l.split("\x1f"))) for l in log]


def tree_any(rev, pid, paths):
    """The project's files at a commit, keyed as if it already lived at pid (handles moves)."""
    for path in paths:
        files = tree(rev, path)
        if files:
            return {pid + f[len(path):]: blob for f, blob in files.items()}
    return {}


def root_versions():
    """raíz, the site itself: one version per cabz-vNN tag, then the live one.

    A tag freezes the home page and everything next to it at the root (index.html, cabz.css,
    the shared js, sky.jpg). Older ones go to _v/<id>/ at the root, only the files that differ
    from today's; the folders below (cabz/, soleil/, river/…) are always served live."""
    if (ROOT / "_v").exists():
        shutil.rmtree(ROOT / "_v")
    names = [t for t in git("tag", "--list", "cabz-v*").split() if re.fullmatch(r"cabz-v\d+", t)]
    names.sort(key=lambda t: int(t[len("cabz-v"):]))
    entry = {"id": "", "name": "raíz", "title": "raíz", "href": "", "versions": []}
    for t in names:
        sha, date, msg = git("log", "-1", "--format=%H%x1f%aI%x1f%s", t).strip().split("\x1f")
        vid = sha[:7]
        msg = re.sub(r"^\s*[\w./-]+\s*[·:]\s*", "", msg).strip() or msg
        entry["versions"].append({"id": vid, "date": date, "msg": msg, "pages": ["index.html"], "live": False})
        for line in git("ls-tree", t).splitlines():
            meta, name = line.split("\t", 1)
            kind, blob = meta.split()[1:3]
            if kind != "blob" or name.startswith(".") or name.endswith(".command"):
                continue
            live = ROOT / name
            if not name.endswith(".html") and live.is_file() and git("hash-object", str(live)).strip() == blob:
                continue  # same as today: served from the live root
            data = git("cat-file", "blob", blob, binary=True)
            if name.endswith(".html"):
                data = inject(data.decode("utf-8", "replace"), tags(name, 2, vid)).encode("utf-8")
            dest = ROOT / "_v" / vid / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
    if names:
        # the live version takes the next number; it is dated by its latest commit, or today while it has none
        after = git("log", "-1", "--format=%aI", f"{names[-1]}..HEAD").strip()
        date = after or datetime.now().astimezone().isoformat(timespec="seconds")
        entry["versions"].append({"id": "live", "date": date, "msg": "", "pages": ["index.html"], "live": True})
        print(f"raíz: {len(entry['versions'])} versions (v00–v{len(entry['versions']) - 1:02d})")
    return entry


def main():
    try:
        git("rev-parse", "HEAD")
        has_git = True
    except (subprocess.CalledProcessError, FileNotFoundError):
        has_git = False
        print("no git history: building without versions")

    conf = json.loads((ROOT / "_build" / "projects.json").read_text("utf-8"))
    site = {"sections": []}

    # the home page's own projects form a section without a folder of its own
    sections = [{"id": "", "short": "raíz", "title": "origin", "projects": conf.get("home", [])}] + conf["sections"]

    for sec in sections:
        s = {"id": sec["id"], "short": sec.get("short", sec["id"]), "title": sec["title"], "projects": []}
        if sec["id"]:
            listed = [p["name"] for p in sec["projects"]]
            on_disk = sorted(d.name for d in (ROOT / sec["id"]).iterdir() if d.is_dir() and d.name not in SKIP_DIRS and not d.name.startswith((".", "_")))
            for extra in on_disk:
                if extra not in listed:
                    print(f"  note: {sec['id']}/{extra} is not in projects.json, added at the end")
                    sec["projects"].append({"name": extra, "title": extra})

        for p in sec["projects"]:
            pid = (sec["id"] + "/" if sec["id"] else "") + p["name"]
            d = ROOT / pid
            if not d.is_dir():
                print(f"  note: {pid} is in projects.json but not on disk, skipped")
                continue
            if (d / "_v").exists():
                shutil.rmtree(d / "_v")

            entry = {"id": pid, "name": p.get("label", p["name"]), "title": p.get("title", p["name"]),
                     "href": pid + "/" + p.get("href", ""), "versions": []}
            if p.get("activeLabel"):
                entry["activeLabel"] = p["activeLabel"]
            if p.get("strike"):
                entry["strike"] = p["strike"]
            if p.get("cursor"):
                entry["cursor"] = p["cursor"]
            for edition in p.get("versions", []):
                if not (d / edition["file"]).is_file():
                    raise FileNotFoundError(d / edition["file"])
                entry["versions"].append({**edition, "pages": ["index.html"],
                    "href": pid + "/index.html?version=" + edition["id"]})
            if p.get("note"):
                entry["note"] = p["note"]
            if p.get("offset"):
                entry["offset"] = p["offset"]  # pages that start below the bar instead of under it

            paths = [pid] + p.get("former", [])
            commits = history(paths) if has_git else []
            vidx = [k for k, c in enumerate(commits) if "[minor]" not in c["msg"]]
            snaps = [] if p.get("versions") else p.get("snapshots", [])
            # snapshots: versions from before the project was in git, one html file each in
            # _build/snapshots/<project>/, listed before the git versions
            for n, snap in enumerate(snaps):
                data = (ROOT / "_build" / "snapshots" / pid / snap["file"]).read_bytes()
                vid = hashlib.sha1(data).hexdigest()[:7]  # hex like a commit, so the _v/ fallback finds the live files
                msg = p.get("names", {}).get(f"v{n:02d}", snap["msg"])
                entry["versions"].append({"id": vid, "date": snap["date"], "msg": msg, "pages": ["index.html"], "live": False})
                if p.get("headers", {}).get(f"v{n:02d}"):
                    entry["versions"][-1]["header"] = p["headers"][f"v{n:02d}"]  # the project's name in the bar for this version
                path = pid + "/index.html"
                dest = d / "_v" / vid / "index.html"
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(inject(data.decode("utf-8", "replace"), tags(path, path.count("/") + 2, vid)), "utf-8")
            if not p.get("versions") and len(snaps) + len(vidx) >= 2:
                live = tree("HEAD", pid) or {pid + "/" + f.relative_to(d).as_posix(): None for f in d.rglob("*") if f.is_file() and "_v" not in f.relative_to(d).parts}
                for m, k in enumerate(vidx):
                    n = len(snaps) + m  # the snapshots come first
                    c = commits[k]
                    is_live = n == len(snaps) + len(vidx) - 1
                    vid = c["sha"][:7]
                    # a version is its commit plus the [minor] fixes made before the next version
                    end = commits[vidx[m + 1] - 1]["sha"] if not is_live else None
                    files = live if is_live else tree_any(end, pid, paths)
                    pages = sorted(f[len(pid) + 1:] for f in files if f.endswith(".html"))
                    msg = re.sub(r"^\s*[\w./-]+\s*[·:]\s*", "", c["msg"]).strip() or c["msg"]
                    msg = p.get("names", {}).get(f"v{n:02d}", msg)  # a version can be renamed in projects.json
                    entry["versions"].append({"id": vid, "date": c["date"], "msg": msg, "pages": pages, "live": is_live})
                    if p.get("headers", {}).get(f"v{n:02d}"):
                        entry["versions"][-1]["header"] = p["headers"][f"v{n:02d}"]
                    if p.get("dev", {}).get(f"v{n:02d}"):
                        entry["versions"][-1]["dev"] = p["dev"][f"v{n:02d}"]  # parts of that version only shown with the bar's dev
                    if is_live:
                        continue
                    for path, blob in files.items():
                        rel = path[len(pid) + 1:]
                        is_html = rel.endswith(".html")
                        if not is_html and live.get(path) == blob:
                            continue  # same as today: served from the live folder
                        if rel.endswith(".php"):
                            continue  # server code always runs from the live folder, next to the data it reads and writes
                        data = git("cat-file", "blob", blob, binary=True)
                        if is_html:
                            depth = path.count("/") + 2  # + _v/<id>/
                            data = inject(data.decode("utf-8", "replace"), tags(path, depth, vid)).encode("utf-8")
                        dest = d / "_v" / vid / rel
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        dest.write_bytes(data)
                total = len(snaps) + len(vidx)
                print(f"{pid}: {total} versions (v00–v{total - 1:02d})")
            s["projects"].append(entry)
        site["sections"].append(s)

    site["root"] = root_versions() if has_git else {"id": "", "name": "raíz", "versions": []}

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
