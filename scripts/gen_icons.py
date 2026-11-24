#!/usr/bin/env python3
# 生成品牌图标：微信分享缩略图(og:image) + apple-touch-icon + favicon + PWA 图标
# 主题：红笔批改·学术手账（纸 #F4EEE2 / 墨 #1E2430 / 朱红 #C0392B / 赭金 #B07A2A）
import os
from PIL import Image, ImageDraw, ImageFont

PAPER = (244, 238, 226)
PAPER2 = (250, 246, 238)
INK = (30, 36, 48)
RED = (192, 57, 43)
GOLD = (176, 122, 42)
LINE = (210, 198, 176)

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'public')
ICONS = os.path.join(OUT, 'icons')
os.makedirs(ICONS, exist_ok=True)

SS = 6  # 超采样倍数，最后 LANCZOS 缩小得到平滑边缘


def font(path, size):
    return ImageFont.truetype(path, size)


SONG = '/System/Library/Fonts/Supplemental/Songti.ttc'
HEI = '/System/Library/Fonts/STHeiti Medium.ttc'


def rounded_mask(size, radius):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def draw_compass(d, cx, cy, R):
    """在画布 d 上以 (cx,cy) 为心、R 为半径画罗盘标记。"""
    lw = max(2, int(R * 0.075))
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=RED, width=lw)
    up = (cx, int(cy - R * 0.79))
    dn = (cx, int(cy + R * 0.79))
    lft = (int(cx - R * 0.21), cy)
    rgt = (int(cx + R * 0.21), cy)
    uw = (cx, int(cy - R * 0.184))
    dw = (cx, int(cy + R * 0.184))
    d.polygon([up, rgt, uw, lft], fill=RED)      # 上指针（朱红）
    d.polygon([dn, lft, dw, rgt], fill=INK)      # 下指针（墨）
    r = max(2, int(R * 0.09))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)  # 中心点


def mark_icon(target, radius_frac=0.22, bg=PAPER):
    """纯标记方形图标（favicon / apple-touch / PWA），带圆角纸底。"""
    S = target * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), fill=bg + (255,))
    # 细边框
    d.rounded_rectangle([int(S * 0.02), int(S * 0.02), S - int(S * 0.02) - 1, S - int(S * 0.02) - 1],
                        radius=int(S * radius_frac * 0.9), outline=LINE + (255,), width=max(2, int(S * 0.012)))
    R = int(S * 0.34)
    draw_compass(d, S // 2, S // 2, R)
    img = img.resize((target, target), Image.LANCZOS)
    return img


def share_card(size=640):
    """微信链接卡片缩略图：上罗盘、下标题+副标题。"""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(S * 0.06)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=rad, fill=PAPER + (255,))
    d.rounded_rectangle([int(S * 0.018), int(S * 0.018), S - int(S * 0.018) - 1, S - int(S * 0.018) - 1],
                        radius=int(rad * 0.9), outline=LINE + (255,), width=max(3, int(S * 0.008)))
    # 顶部朱红细条点缀
    d.rounded_rectangle([int(S * 0.018), int(S * 0.018), S - int(S * 0.018) - 1, int(S * 0.055)],
                        radius=int(rad * 0.5), fill=RED + (255,))
    # 罗盘
    R = int(S * 0.23)
    draw_compass(d, S // 2, int(S * 0.40), R)
    # 标题
    tf = font(SONG, int(S * 0.135))
    title = '学情罗盘'
    tb = d.textbbox((0, 0), title, font=tf)
    d.text(((S - (tb[2] - tb[0])) // 2 - tb[0], int(S * 0.615)), title, font=tf, fill=INK + (255,))
    # 副标题
    sf = font(HEI, int(S * 0.045))
    sub = '班级 · 年级成绩可视化分析'
    sb = d.textbbox((0, 0), sub, font=sf)
    d.text(((S - (sb[2] - sb[0])) // 2 - sb[0], int(S * 0.785)), sub, font=sf, fill=GOLD + (255,))
    img = img.resize((size, size), Image.LANCZOS)
    return img


def save(img, path, bg=None):
    if bg and img.mode == 'RGBA':
        base = Image.new('RGB', img.size, bg)
        base.paste(img, (0, 0), img)
        base.save(path, 'PNG')
    else:
        img.save(path, 'PNG')
    print('wrote', os.path.relpath(path, ROOT))


# 分享缩略图（og:image）—— 实心纸底，微信要求 jpg/png 且非透明更稳
save(share_card(640), os.path.join(OUT, 'share.png'), bg=PAPER)
save(share_card(1200), os.path.join(OUT, 'share-1200.png'), bg=PAPER)

# 图标
save(mark_icon(180), os.path.join(ICONS, 'apple-touch-icon.png'), bg=PAPER)
save(mark_icon(32, radius_frac=0.24), os.path.join(ICONS, 'favicon-32.png'))
save(mark_icon(16, radius_frac=0.26), os.path.join(ICONS, 'favicon-16.png'))
save(mark_icon(192), os.path.join(ICONS, 'icon-192.png'), bg=PAPER)
save(mark_icon(512), os.path.join(ICONS, 'icon-512.png'), bg=PAPER)
print('done')
