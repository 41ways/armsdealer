"""index.html 에 이벤트 테스트 패널(tools/dev.js)을 붙여 dev.html 을 만든다.

index.html 의 스크립트 목록을 그대로 쓰므로, 데이터 파일이 늘어도 다시 돌리기만 하면 된다.
dev.html 은 .gitignore 에 있다 — 공개 사이트에는 올라가지 않는다.
    python3 tools/make_dev.py   →   http://localhost:8765/dev.html
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
tag = '  <script src="tools/dev.js"></script>\n</body>'
assert '</body>' in html, 'index.html 에 </body> 가 없다'
out = html.replace('</body>', tag, 1).replace('<title>', '<title>[DEV] ', 1)
# 로컬 서버가 캐시를 막지 않아 고친 JS/CSS 대신 옛 파일이 뜨는 일이 있다 — 파일마다 수정 시각을 붙여 늘 새로 받게
out = re.sub(r'(src|href)="((?:js|css|tools)/[^"?]+)"', lambda m: f'{m.group(1)}="{m.group(2)}?v={int((root / m.group(2)).stat().st_mtime)}"' if (root / m.group(2)).exists() else m.group(0), out)
(root / 'dev.html').write_text(out, encoding='utf-8')
print('dev.html 을 만들었다')
