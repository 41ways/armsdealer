"""index.html 에 이벤트 테스트 패널(tools/dev.js)을 붙여 dev.html 을 만든다.

index.html 의 스크립트 목록을 그대로 쓰므로, 데이터 파일이 늘어도 다시 돌리기만 하면 된다.
dev.html 은 .gitignore 에 있다 — 공개 사이트에는 올라가지 않는다.
    python3 tools/make_dev.py   →   http://localhost:8765/dev.html
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
tag = '  <script src="tools/dev.js"></script>\n</body>'
assert '</body>' in html, 'index.html 에 </body> 가 없다'
out = html.replace('</body>', tag, 1).replace('<title>', '<title>[DEV] ', 1)
(root / 'dev.html').write_text(out, encoding='utf-8')
print('dev.html 을 만들었다')
