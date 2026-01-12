from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ICONS_DIR = os.path.join(ROOT, 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

BG = (15, 118, 110)  # #0f766e
BAR = (10, 85, 80)
WEIGHT = (7, 60, 56)
TEXT = (255, 255, 255)
LABEL = 'UL'

sizes = [192, 512]

def make_icon(sz: int):
    img = Image.new('RGB', (sz, sz), BG)
    d = ImageDraw.Draw(img)

    # center bar
    bar_h = int(sz * 0.12)
    bar_y = sz // 2 - bar_h // 2
    d.rounded_rectangle([(int(sz*0.18), bar_y), (int(sz*0.82), bar_y + bar_h)], radius=int(bar_h*0.25), fill=BAR)

    # weights
    w_size = int(sz * 0.20)
    w_y = sz // 2 - w_size // 2
    d.rounded_rectangle([(int(sz*0.04), w_y), (int(sz*0.24), w_y + w_size)], radius=int(w_size*0.2), fill=WEIGHT)
    d.rounded_rectangle([(int(sz*0.76), w_y), (int(sz*0.96), w_y + w_size)], radius=int(w_size*0.2), fill=WEIGHT)

    # text label
    try:
        fpath = 'C:/Windows/Fonts/arial.ttf'
        fnt = ImageFont.truetype(fpath, int(sz * 0.22)) if os.path.exists(fpath) else ImageFont.load_default()
    except Exception:
        fnt = ImageFont.load_default()
    bbox = d.textbbox((0, 0), LABEL, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((sz - tw)//2, int(sz*0.70) - th//2), LABEL, fill=TEXT, font=fnt)

    out_path = os.path.join(ICONS_DIR, f'icon-{sz}.png')
    img.save(out_path, format='PNG')
    return out_path

if __name__ == '__main__':
    for s in sizes:
        path = make_icon(s)
        print('[ok] wrote', path)
