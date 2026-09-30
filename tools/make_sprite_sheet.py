#!/usr/bin/env python3
"""마젠타 배경 위에 4열 x 2행으로 그린 표정 시트(8컷) → 손님 스프라이트 시트 (assets/sprites/<look>.webp + js/data/sheets.js 항목).
쓰는 법: python3 tools/make_sprite_sheet.py <원본.png> <look id> [--fw 78]
컷 순서는 sheets.js 의 frames: idle · breathe · blink · talk · talk2 · happy · angry · surprised.
"""
import json, re, sys
import numpy as np
from PIL import Image

FRAMES = ['idle', 'breathe', 'blink', 'talk', 'talk2', 'happy', 'angry', 'surprised']

def key_magenta(im):
    a = np.array(im.convert('RGBA')).astype(int)
    d = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    alpha = np.clip((d - 70) / 60, 0, 1)
    edge = (alpha > 0) & (alpha < 1)
    for c, v in zip(range(3), (24, 12, 12)):
        a[..., c] = np.where(edge, v, a[..., c])
    a[..., 3] = (alpha * 255).astype(int)
    return Image.fromarray(a.astype('uint8'), 'RGBA'), alpha > 0.5

def runs(v, minlen):
    out, s = [], None
    for i, x in enumerate(v):
        if x and s is None: s = i
        if not x and s is not None:
            if i - s >= minlen: out.append((s, i))
            s = None
    if s is not None: out.append((s, len(v)))
    return out

def main():
    src, look = sys.argv[1], sys.argv[2]
    fw = int(sys.argv[sys.argv.index('--fw') + 1]) if '--fw' in sys.argv else 78
    im, mask = key_magenta(Image.open(src))
    # 4열 x 2행 균등 격자로 자른 뒤 칸마다 마젠타를 뺀 그림의 경계 상자를 잰다 (칸이 딱 붙어 있어도 된다)
    h, w = mask.shape
    boxes = []
    for r in range(2):
        for c in range(4):
            x0, x1, y0, y1 = c * w // 4, (c + 1) * w // 4, r * h // 2, (r + 1) * h // 2
            sub = mask[y0:y1, x0:x1]
            ys, xs = np.where(sub)
            if not len(ys):
                sys.exit(f'빈 칸: 행{r} 열{c}')
            boxes.append((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1))
    W = max(b[2] - b[0] for b in boxes); H = max(b[3] - b[1] for b in boxes)
    sc = fw / W; fh = round(H * sc)
    sheet = Image.new('RGBA', (fw * 8, fh))
    for i, b in enumerate(boxes):
        cell = Image.new('RGBA', (W, H))
        crop = im.crop(b)
        cell.alpha_composite(crop, ((W - crop.width) // 2, H - crop.height))  # 아래 맞춤 · 가운데 맞춤
        sheet.paste(cell.resize((fw, fh), Image.LANCZOS), (i * fw, 0))
    out = f'assets/sprites/{look}.webp'
    sheet.save(out, 'WEBP', lossless=True, method=6, exact=True)  # 무손실 WebP — PNG 보다 40% 작다
    print(out, sheet.size, 'fw', fw, 'fh', fh)
    js = open('js/data/sheets.js').read()
    entry = json.dumps({'src': out, 'fw': fw, 'fh': fh, 'frames': FRAMES}, ensure_ascii=False, indent=2).replace('\n', '\n  ')
    if f'"{look}": {{' in js:
        js = re.sub(r'  "%s": \{.*?\n  \}' % re.escape(look), f'  "{look}": {entry}', js, count=1, flags=re.S)
    else:
        js = js.rstrip()
        assert js.endswith('};')
        js = js[:-2].rstrip() + f',\n  "{look}": {entry}\n}};\n'
    open('js/data/sheets.js', 'w').write(js)
    print('sheets.js 갱신')

main()
