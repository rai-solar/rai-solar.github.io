# cabz · versions

The site is a git repository. Each commit that touches a project (a folder in pp/ or fw/)
is one version of it, and projects with 2 or more versions get a bar at the top that
shows their history as a line of dots.

## Adding a version

1. Edit the project files.
2. Commit, starting the message with the project's name, e.g.

       git add -A
       git commit -m "v00 · new hero image"

   For a fix that shouldn't count as a version, put [minor] in the message:

       git commit -m "v00 · typo [minor]"

3. Rebuild and preview:

       python3 _build/versions.py
       python3 _build/serve.py        → http://localhost:8000

4. Upload the site. Leave out .git/ and _build/ (the server hides them anyway).

To backdate a version (e.g. one found in an old folder), give the commit the date of the files:

       git commit --date="2026-02-24T13:58" -m "v00 · …"

## What gets generated

- `<project>/_v/<id>/` holds older versions, with only the files that differ from
  today's. Anything else is served from the live folder (.htaccess RewriteRule).
- `versions.json` is what the bar reads.

Both are git-ignored and rebuilt from scratch on every run.
