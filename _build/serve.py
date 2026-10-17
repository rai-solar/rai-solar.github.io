#!/usr/bin/env python3
"""cabz · local preview that behaves like the server's .htaccess.

    python3 _build/serve.py        then open http://localhost:8000

Files missing from an archived version (<project>/_v/<id>/...) are served
from the live project folder, exactly like the RewriteRule online.
"""
import http.server, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FALLBACK = re.compile(r"^(/.+)/_v/[0-9a-f]+/(.*)$")


class Handler(http.server.SimpleHTTPRequestHandler):
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


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"cabz on http://localhost:{port}  (ctrl+c to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
