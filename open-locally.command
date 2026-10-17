#!/bin/bash
# cabz · double-click to preview the site on this Mac.
# Rebuilds the bar + versions, starts a small local server and opens the browser.
# Close this Terminal window to stop it.
cd "$(dirname "$0")" || exit 1
python3 _build/build.py || { echo; read -n 1 -p "build failed, press a key to close"; exit 1; }
echo
exec python3 _build/serve.py 8000 --open
