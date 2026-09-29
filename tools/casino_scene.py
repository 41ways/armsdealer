"""도박장 장면 그림(제미나이 원본)을 게임용으로 다듬는다 — 오른쪽 아래 별 워터마크를 옆 벽돌로 덮고 JPG로 저장.
사용: python tools/casino_scene.py <원본.png> <assets/casino/이름.jpg> [가로폭=1280]
"""
import sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 1280
im = Image.open(src).convert('RGB')
W, H = im.size
# 워터마크: 오른쪽 아래 약 (W-160..W-80, H-160..H-80) — 바로 왼쪽 같은 크기 조각으로 덮는다
box = (W - 170, H - 170, W - 70, H - 70)
patch = im.crop((box[0] - 110, box[1], box[2] - 110, box[3]))
im.paste(patch, box[:2])
im = im.resize((width, round(H * width / W)), Image.LANCZOS)
im.save(dst, 'JPEG', quality=88, optimize=True)
print(dst, im.size)
