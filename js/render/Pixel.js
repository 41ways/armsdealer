// 픽셀 아트 페인터. 저해상도 레이어에 도형을 찍고, 파트 경계 음영 + 외곽선을 입혀 캔버스로 굽는다.
WS.Pixel = (() => {
  const hex = h => {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  // amt > 0 밝게, < 0 어둡게 (-1..1)
  const shade = (h, amt) => {
    const c = hex(h);
    return toHex(amt >= 0 ? c.map(v => v + (255 - v) * amt) : c.map(v => v * (1 + amt)));
  };

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  // 시드 고정 난수 — 같은 손님은 항상 같은 얼굴
  function rng(seed) {
    let a = hashStr(String(seed));
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const OUTLINE = '#120a08';

  class Layer {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.c = new Array(w * h).fill(null);
      this.p = new Int16Array(w * h).fill(-1);
      this.f = new Uint8Array(w * h);
      this.part = 0;
      this.flat = false;
    }
    next() {
      this.part++;
      return this;
    }
    px(x, y, col) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (!col || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = y * this.w + x;
      this.c[i] = col;
      this.p[i] = this.part;
      this.f[i] = this.flat ? 1 : 0;
    }
    rect(x, y, w, h, col) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
    }
    // 입체 음영: 왼쪽 위에서 빛이 온다
    _shaded(col, nx, ny, x, y) {
      const d = 0.6 * nx + 0.8 * ny;
      const dither = (x + y) % 2 === 0;
      if (d > 0.72 || (d > 0.6 && dither)) return shade(col, -0.26);
      if (d > 0.45) return shade(col, -0.1);
      if (d < -0.6 || (d < -0.45 && dither)) return shade(col, 0.16);
      return col;
    }
    ellipse(cx, cy, rx, ry, col, shaded, clip) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          if (nx * nx + ny * ny > 1) continue;
          if (clip && !clip(x, y)) continue;
          this.px(x, y, shaded ? this._shaded(col, nx, ny, x, y) : col);
        }
      }
    }
    poly(pts, col, shaded) {
      const xs = pts.map(p => p[0]);
      const ys = pts.map(p => p[1]);
      const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
      const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 || 1, hh = (y1 - y0) / 2 || 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i], [xj, yj] = pts[j];
            if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
          }
          if (!inside) continue;
          this.px(x, y, shaded ? this._shaded(col, (px - cx) / hw, (py - cy) / hh, x, y) : col);
        }
      }
    }
    // 둥근 막대 (손가락, 팔다리)
    capsule(x0, y0, x1, y1, r, col, shaded) {
      const minx = Math.floor(Math.min(x0, x1) - r), maxx = Math.ceil(Math.max(x0, x1) + r);
      const miny = Math.floor(Math.min(y0, y1) - r), maxy = Math.ceil(Math.max(y0, y1) + r);
      const vx = x1 - x0, vy = y1 - y0, len2 = vx * vx + vy * vy || 1;
      for (let y = miny; y <= maxy; y++) {
        for (let x = minx; x <= maxx; x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / len2));
          const dx = px - (x0 + vx * t), dy = py - (y0 + vy * t);
          if (dx * dx + dy * dy > r * r) continue;
          this.px(x, y, shaded ? this._shaded(col, dx / r, dy / r, x, y) : col);
        }
      }
    }
    line(x0, y0, x1, y1, col) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.px(x0, y0, col);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    // 파트 경계 음영 + 외곽선 → 캔버스
    bake(opts = {}) {
      const { w, h, c, p, f } = this;
      const out = c.slice();
      const diff = (i, j) => j < 0 || !c[j] || p[j] !== p[i];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (!c[i] || f[i]) continue;
          const r = x + 1 < w ? i + 1 : -1, b = y + 1 < h ? i + w : -1;
          const l = x > 0 ? i - 1 : -1, t = y > 0 ? i - w : -1;
          if (diff(i, r) || diff(i, b)) out[i] = shade(c[i], -0.2);
          else if (diff(i, l) || diff(i, t)) out[i] = shade(c[i], 0.12);
        }
      }
      if (opts.outline !== false) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (c[i]) continue;
            const n = [x > 0 && c[i - 1], x < w - 1 && c[i + 1], y > 0 && c[i - w], y < h - 1 && c[i + w]];
            if (n.some(Boolean)) out[i] = opts.outlineColor || OUTLINE;
          }
        }
      }
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(w, h);
      out.forEach((col, i) => {
        if (!col) return;
        const [r, g, b] = hex(col);
        img.data.set([r, g, b, 255], i * 4);
      });
      ctx.putImageData(img, 0, 0);
      return cv;
    }
  }

  const mirror = (pts, w) => pts.map(([x, y]) => [w - x, y]);

  return { Layer, shade, hex, rng, mirror, hashStr };
})();
