#!/usr/bin/env python3
"""cabz · build the version bar from git history.

Run from anywhere:   python3 _build/versions.py

Every folder under pp/ and fw/ is a project. Each commit that touches a project is one
version of it, except commits with [minor] in the message (fixes, typos, clean-ups),
which fold into the version before them.

For every project with 2+ versions this writes:
  <project>/_v/<id>/   the older versions, but only the files that differ from today's
                       (anything missing falls back to the live file, see .htaccess)
  versions.json        the list the bar reads
and makes sure the live pages load /versions.js.

_v/ and versions.json are generated: they are git-ignored, rebuilt on every run,
and are what you upload together with the rest of the site.
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GROUPS = ["pp", "fw"]


def git(*args, binary=False):
    out = subprocess.run(["git", "-C", str(ROOT), *args], check=True, capture_output=True).stdout
    return out if binary else out.decode("utf-8")


def tree(rev, path):
    """{file path: blob id} for a project folder at a commit."""
    files = {}
    for line in git("ls-tree", "-r", rev, "--", path + "/").splitlines():
        meta, name = line.split("\t", 1)
        files[name] = meta.split()[2]
    return files


def tag(project, version=""):
    v = f' data-version="{version}"' if version else ""
    return f'<script src="/versions.js" data-project="{project}"{v} defer></script>'


def inject(html, snippet):
    if "/versions.js" in html:
        return html
    m = re.search(r"</head\s*>", html, re.I) or re.search(r"<body[^>]*>", html, re.I)
    if m is None:
        return snippet + "\n" + html
    at = m.start() if m.group(0).lower().startswith("</head") else m.end()
    return html[:at] + snippet + "\n" + html[at:]


def main():
    try:
        git("rev-parse", "HEAD")
    except subprocess.CalledProcessError:
        sys.exit("no git history here yet")

    out = {}
    for group in GROUPS:
        for d in sorted((ROOT / group).iterdir()):
            if not d.is_dir() or d.name.startswith(("_", ".")):
                continue
            project = f"{group}/{d.name}"
            vdir = d / "_v"
            if vdir.exists():
                shutil.rmtree(vdir)

            log = git("log", "--reverse", "--format=%H%x1f%aI%x1f%s", "--", project + "/").splitlines()
            commits = [dict(zip(("sha", "date", "msg"), l.split("\x1f"))) for l in log]
            versions = [c for c in commits if "[minor]" not in c["msg"]]
            if len(versions) < 2:
                continue

            live = tree("HEAD", project)
            entry = {"name": d.name, "versions": []}
            for i, c in enumerate(versions):
                is_live = i == len(versions) - 1
                vid = c["sha"][:7]
                files = live if is_live else tree(c["sha"], project)
                pages = sorted(f[len(project) + 1:] for f in files if f.endswith(".html"))
                msg = re.sub(r"^\s*[\w./-]+\s*[·:]\s*", "", c["msg"]).strip() or c["msg"]
                entry["versions"].append({"id": vid, "date": c["date"], "msg": msg, "pages": pages, "live": is_live})
                if is_live:
                    continue
                for path, blob in files.items():
                    rel = path[len(project) + 1:]
                    is_html = rel.endswith(".html")
                    if not is_html and live.get(path) == blob:
                        continue  # same as today: served from the live folder
                    data = git("cat-file", "blob", blob, binary=True)
                    if is_html:
                        data = inject(data.decode("utf-8", "replace"), tag(project, vid)).encode("utf-8")
                    dest = vdir / vid / rel
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(data)

            # live pages load the bar too
            for page in entry["versions"][-1]["pages"]:
                f = d / page
                if f.exists():
                    html = f.read_text("utf-8")
                    new = inject(html, tag(project))
                    if new != html:
                        f.write_text(new, "utf-8")
                        print(f"  added the bar to {project}/{page} (commit it)")

            out[project] = entry
            print(f"{project}: {len(versions)} versions")

    (ROOT / "versions.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), "utf-8")
    print("versions.json written")


if __name__ == "__main__":
    main()
