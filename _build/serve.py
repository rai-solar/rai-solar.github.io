#!/usr/bin/env python3
"""cabz · local server that behaves like the real one (.htaccess).

    python3 _build/serve.py [port] [--open]

Files missing from an archived version (<project>/_v/<id>/...) are served from the
live project folder, like the RewriteRule online.
"""
import http.server, os, re, sys, webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FALLBACK = re.compile(r"^(/.+)/_v/[0-9a-f]+/(.*)$")


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".geojson": "application/geo+json", ".mjs": "text/javascript", ".js": "text/javascript"}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def translate_path(self, path):
        local = super().translate_path(path)
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if not os.path.exists(local):
            m = FALLBACK.match(clean)
            if m:
                return super().translate_path(m.group(1) + "/" + m.group(2))
        return local

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 8000
    for p in range(port, port + 20):
        try:
            srv = http.server.ThreadingHTTPServer(("127.0.0.1", p), Handler)
            break
        except OSError:
            continue
    else:
        sys.exit("no free port")
    url = f"http://localhost:{p}/"
    print(f"cabz is running on {url}\nclose this window (or press ctrl+c) to stop it")
    if "--open" in sys.argv:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
