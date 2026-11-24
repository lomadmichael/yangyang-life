"""웹앱(PWA) 아이콘 생성 — 쪽빛 남색(deep) 바탕에 v4 로고 심벌(원·떠오르는 해·수평선·물결 두 줄, src/components/Logo.tsx 와 같은 모양).

실행 (저장소 루트에서):
    PYTHONUTF8=1 python scripts/make-pwa-icons.py

만드는 파일:
    public/icons/icon-192.png          일반 아이콘 (purpose any)
    public/icons/icon-512.png          일반 아이콘 (purpose any)
    public/icons/maskable-512.png      마스크 아이콘 — 물결은 가운데 안전 영역(지름 80% 원) 안에만
    public/icons/apple-touch-icon.png  iOS 홈 화면 180×180 (투명 없음)
    src/app/favicon.ico                16·32·48

색은 src/app/globals.css 토큰 값을 읽어 쓴다 (--deep 바탕, --on-deep 선, --sunrise 해). 새 색을 만들지 않는다.
의존성: Pillow 만.
"""

from __future__ import annotations

import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "src" / "app" / "globals.css"
OUT = ROOT / "public" / "icons"
SS = 4  # 크게 그린 뒤 줄여서 가장자리를 부드럽게


def token(name: str) -> tuple[int, int, int]:
    m = re.search(rf"--{re.escape(name)}:\s*#([0-9a-fA-F]{{6}})\s*;", CSS.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"globals.css 에서 --{name} 토큰을 찾지 못했어요")
    h = m.group(1)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


DEEP = token("deep")
ON_DEEP = token("on-deep")
SUNRISE = token("sunrise")


def quad(p0, c, p1, steps):
    """2차 베지어 곡선 위 점들."""
    out = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p1[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1]
        out.append((x, y))
    return out


def wave(x0: float, y: float, widths: list[float]):
    """SVG 'M x0 y q7.5 -5 15 0 t15 0 …' 와 같은 물결 — t 는 앞 조절점을 뒤집으므로 위·아래로 번갈아 휜다."""
    pts, x, up = [], x0, True
    for w in widths:
        c = (x + w / 2, y - 5 * (w / 15) if up else y + 5 * (w / 15))
        pts += quad((x, y), c, (x + w, y), 60)
        x += w
        up = not up
    return pts


def symbol_strokes(ring: bool):
    """logo.svg 심벌(112×112 좌표): 원 · 떠오르는 해(반원) · 수평선 · 물결 두 줄. (점 목록, 색, 굵기)"""
    strokes = []
    if ring:
        strokes.append(([(56 + 54.5 * math.cos(a / 180 * math.pi), 56 + 54.5 * math.sin(a / 180 * math.pi)) for a in range(0, 361)], ON_DEEP, 2.4))
    strokes.append(([(56 + 26 * math.cos(a / 180 * math.pi), 60 - 26 * math.sin(a / 180 * math.pi)) for a in range(0, 181)], SUNRISE, 3.6))
    strokes.append(([(14 + i, 60) for i in range(0, 85)], ON_DEEP, 2.4))
    strokes.append((wave(26, 74, [15, 15, 15, 15]), ON_DEEP, 2.4))
    strokes.append((wave(38, 86, [15, 15, 9]), ON_DEEP, 2.4))
    return strokes


def make(size: int, scale: float, ring: bool = True, weight: float = 1.0) -> Image.Image:
    """scale = 심벌(112칸) 폭 / 아이콘 폭. weight = 선 굵기 배율(작은 아이콘은 굵게)."""
    big = size * SS
    im = Image.new("RGB", (big, big), DEEP)
    draw = ImageDraw.Draw(im)
    unit = big * scale / 112
    off = (big - 112 * unit) / 2
    for pts, color, w in symbol_strokes(ring):
        r = w * weight * unit / 2
        # 굵은 draw.line 은 곡선 이음매에 빗살 자국이 남는다 → 원을 촘촘히 찍어 둥근 붓질로 그린다
        prev = None
        for x, y in pts:
            px, py = off + x * unit, off + y * unit
            if prev:
                n = max(1, int(math.hypot(px - prev[0], py - prev[1]) / max(1, r / 2)))
                for k in range(1, n + 1):
                    qx = prev[0] + (px - prev[0]) * k / n
                    qy = prev[1] + (py - prev[1]) * k / n
                    draw.ellipse((qx - r, qy - r, qx + r, qy + r), fill=color)
            else:
                draw.ellipse((px - r, py - r, px + r, py + r), fill=color)
            prev = (px, py)
    return im.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # 일반·애플 아이콘: 남색 바탕 가운데 심벌(원 포함), 심벌 폭 = 아이콘 폭의 72%
    make(192, 0.72, weight=1.4).save(OUT / "icon-192.png", optimize=True)
    make(512, 0.72, weight=1.2).save(OUT / "icon-512.png", optimize=True)
    make(180, 0.72, weight=1.4).save(OUT / "apple-touch-icon.png", optimize=True)
    # 마스크 아이콘: 안전 영역 = 가운데 지름 80% 원. 바깥 원은 빼고(가장자리가 잘리므로) 해·수평선·물결만 폭 62%로
    make(512, 0.62, ring=False, weight=1.3).save(OUT / "maskable-512.png", optimize=True)
    # favicon: 작은 크기 — 원 없이 크게, 선을 굵게
    # Next(Turbopack)는 ICO 안의 PNG 가 RGBA 가 아니면 빌드를 멈춘다 → RGBA 로 저장
    fav = make(256, 0.98, ring=False, weight=2.6).convert("RGBA")
    fav.save(ROOT / "src" / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for p in sorted(OUT.iterdir()):
        print(p.relative_to(ROOT).as_posix(), Image.open(p).size)
    print("src/app/favicon.ico", Image.open(ROOT / "src" / "app" / "favicon.ico").info.get("sizes"))


if __name__ == "__main__":
    main()
