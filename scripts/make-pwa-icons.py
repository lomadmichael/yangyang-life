"""웹앱(PWA) 아이콘 생성 — sea 바탕에 흰 물결 세 줄 (src/components/icons.tsx 의 IconWave 모양).

실행 (저장소 루트에서):
    PYTHONUTF8=1 python scripts/make-pwa-icons.py

만드는 파일:
    public/icons/icon-192.png          일반 아이콘 (purpose any)
    public/icons/icon-512.png          일반 아이콘 (purpose any)
    public/icons/maskable-512.png      마스크 아이콘 — 물결은 가운데 안전 영역(지름 80% 원) 안에만
    public/icons/apple-touch-icon.png  iOS 홈 화면 180×180 (투명 없음)
    src/app/favicon.ico                16·32·48

색은 src/app/globals.css 토큰 값을 읽어 쓴다 (--sea 바탕, --on-sea 물결). 새 색을 만들지 않는다.
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


SEA = token("sea")
ON_SEA = token("on-sea")


def wave_points(x0: float, x1: float, y: float, amp: float, periods: float, steps: int = 240):
    """IconWave 한 줄: 양끝·가운데가 낮고(골) 그 사이가 높은(마루) 물결."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        yy = y - amp * (1 - math.cos(2 * math.pi * periods * t)) / 2
        pts.append((x, yy))
    return pts


def draw_waves(draw: ImageDraw.ImageDraw, size: int, scale: float) -> None:
    """IconWave 의 24×24 좌표계를 가운데 기준으로 scale 배(아이콘 폭 대비) 키워 그린다.

    scale = 물결 묶음 폭 / 아이콘 폭. 24 칸 중 물결은 x 2.75~21.25, y 8~18.5 를 쓴다.
    """
    unit = size * scale / 18.5  # 물결 폭 18.5 칸
    cx = cy = size / 2
    width = max(1, round(1.9 * unit))  # 원래 1.75 보다 조금 굵게 — 작은 크기에서도 보이게
    for base in (9.5, 14.0, 18.5):
        # 24칸 좌표 → 픽셀 (가운데 정렬: x 중심 12, y 중심 (8+18.5)/2 = 13.25)
        pts = [
            (cx + (x - 12) * unit, cy + (yy - 13.25) * unit)
            for x, yy in wave_points(2.75, 21.25, base, 1.5, 2, steps=size * 2)
        ]
        # 굵은 draw.line 은 곡선 이음매에 빗살 자국이 남는다 → 원을 촘촘히 찍어 둥근 붓질로 그린다
        r = width / 2
        for px, py in pts:
            draw.ellipse((px - r, py - r, px + r, py + r), fill=ON_SEA)


def make(size: int, scale: float) -> Image.Image:
    big = size * SS
    im = Image.new("RGB", (big, big), SEA)
    draw_waves(ImageDraw.Draw(im), big, scale)
    return im.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # 일반·애플 아이콘: 물결 폭 = 아이콘 폭의 62%
    make(192, 0.62).save(OUT / "icon-192.png", optimize=True)
    make(512, 0.62).save(OUT / "icon-512.png", optimize=True)
    make(180, 0.62).save(OUT / "apple-touch-icon.png", optimize=True)
    # 마스크 아이콘: 안전 영역 = 가운데 지름 80% 원. 물결 묶음(폭 18.5 × 높이 ~12.6 칸) 대각선이
    # 원 안에 들도록 폭 50% → 대각선 ≈ 0.5 × √(1 + (12.6/18.5)²) ≈ 0.60 < 0.80
    make(512, 0.50).save(OUT / "maskable-512.png", optimize=True)
    # favicon: 작은 크기에서는 물결을 크게
    # Next(Turbopack)는 ICO 안의 PNG 가 RGBA 가 아니면 빌드를 멈춘다 → RGBA 로 저장
    fav = make(256, 0.70).convert("RGBA")
    fav.save(ROOT / "src" / "app" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for p in sorted(OUT.iterdir()):
        print(p.relative_to(ROOT).as_posix(), Image.open(p).size)
    print("src/app/favicon.ico", Image.open(ROOT / "src" / "app" / "favicon.ico").info.get("sizes"))


if __name__ == "__main__":
    main()
