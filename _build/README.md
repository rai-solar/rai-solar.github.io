# cabz · how the site works

## Look at it locally

Double-click `open-locally.command` (in the site folder). It rebuilds the bar and the
versions, starts a small server and opens http://localhost:8000. Close the Terminal
window to stop it.

Opening the html files directly (file://) only half works: browsers block the data
that perros, mouna and volcano load, and the bar shows "local file" as a reminder.

## Navigation

Every page gets the same bar on top: raíz / cabz— / section / project, ‹ › to the neighbouring
projects, "index" for the full list, and the version dots when a project has history.
On project pages it folds into a thin line; hover the top edge (or tap it) to bring it back.

The order and titles come from `_build/projects.json`. A new folder in cabz/fw/ or cabz/pp/ is
picked up automatically (added at the end); add it to projects.json to give it a title
and a place in the order.

## Adding a version

    git add -A
    git commit -m "v00 · new hero image"
    python3 _build/build.py          (or just double-click open-locally.command)

Start the message with the project's name. Put [minor] in it for fixes that shouldn't
show up as a version. To backdate one: git commit --date="2026-02-24T13:58" -m "…"

## Versions from before git

A project can start with versions that were never committed (old prototypes, exported
artifacts). Put each one as a single html file in `_build/snapshots/<project>/` and list
them in `_build/projects.json` under `"snapshots"` (file, date, msg). They come first,
then the git versions. See cabz/fw/volcano.

## The site's own versions (raíz)

The home page and the files next to it at the root (index.html, cabz.css, the shared js,
sky.jpg) are raíz, the site itself. Its versions are git tags, not commits: when a version
is done (after feedback), tag it and rebuild

    git tag cabz-v01
    python3 _build/build.py

Each cabz-vNN tag is a past version in _v/<id>/ at the root; the live site is the next number.
The folders below (cabz/, soleil/, river/…) are always served live.

## Where things live

Since v01 of the site, fw/ and pp/ are inside cabz/ (raíz / cabz— / fw / volcano). Each project
keeps its history through "former" in projects.json.

## Renaming a version

Versions are named after their commit message. To give one another name, add it to the
project in `_build/projects.json`, e.g. `"names": { "v02": "☀︎.gif" }`, then rebuild.
The project's name in the bar can change per version too: `"headers": { "v00": "word-volcano" }`.

## What gets generated (git-ignored, rebuilt every time)

- `site.js`: the map of the site the bar reads
- `<project>/_v/<id>/`: older versions, only the files that differ from today's;
  anything else is served from the live folder (.htaccess online, serve.py locally)

## Uploading

Upload everything except .git/, _build/ and open-locally.command (the server hides
them anyway). Run the build first so site.js and _v/ are up to date.
