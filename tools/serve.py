"""캐시를 끈 로컬 서버 — 그냥 `python -m http.server` 는 브라우저가 옛 JS 를 계속 쓴다.

    python3 tools/serve.py 8765   →   http://localhost:8765/  ·  http://localhost:8765/dev.html
"""
import http.server
import sys
from functools import partial
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *args):  # 요청마다 찍히는 줄은 끈다
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
root = Path(__file__).resolve().parent.parent
http.server.ThreadingHTTPServer(('127.0.0.1', port), partial(NoCache, directory=str(root))).serve_forever()
