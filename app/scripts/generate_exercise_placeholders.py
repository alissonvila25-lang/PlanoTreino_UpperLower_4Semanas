import csv, os, unicodedata
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMAGES_DIR = os.path.join(ROOT, 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)
CSV_PATH = os.path.abspath(os.path.join(ROOT, '..', 'plano-4-semanas.csv'))

BG = (13, 21, 21)
FG = (226, 240, 238)
ACCENT = (15, 118, 110)
SIZE = (480, 320)

def slugify(s: str) -> str:
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode('ascii')
    s = ''.join(ch.lower() if ch.isalnum() else '-' for ch in s)
    while '--' in s:
        s = s.replace('--','-')
    return s.strip('-')

# try utf-8 BOM -> utf-8 -> cp1252
raw = open(CSV_PATH, 'rb').read()
text = None
if raw[:3] == b'\xef\xbb\xbf':
    try:
        text = raw.decode('utf-8')
    except:
        text = raw.decode('utf-8', errors='replace')
else:
    try:
        text = raw.decode('utf-8')
    except:
        try:
            text = raw.decode('cp1252')
        except:
            text = raw.decode('latin-1')

rows = list(csv.DictReader(text.splitlines()))
ex_names = set()
for r in rows:
    ex = (r.get('Exercicio') or '').strip()
    if ex:
        ex_names.add(ex)

try:
    font_path = 'C:/Windows/Fonts/arial.ttf'
    base_font = ImageFont.truetype(font_path, 28) if os.path.exists(font_path) else ImageFont.load_default()
except:
    base_font = ImageFont.load_default()

count = 0
for name in sorted(ex_names):
    slug = slugify(name)
    out = os.path.join(IMAGES_DIR, f'{slug}.webp')
    img = Image.new('RGB', SIZE, BG)
    d = ImageDraw.Draw(img)
    # title bar
    d.rounded_rectangle([(12,12),(SIZE[0]-12, 64)], radius=12, fill=ACCENT)
    # text
    label = name
    # fit text
    fnt = base_font
    bbox = d.textbbox((0,0), label, font=fnt)
    w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
    # simple wrap if too long
    if w > SIZE[0]-40:
        label = label[:28] + '…'
        bbox = d.textbbox((0,0), label, font=fnt)
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text(((SIZE[0]-w)//2, 28 - h//2), label, fill=FG, font=fnt)
    # body hint
    hint = 'Imagem ilustrativa'
    bbox2 = d.textbbox((0,0), hint, font=base_font)
    w2, h2 = bbox2[2]-bbox2[0], bbox2[3]-bbox2[1]
    d.text(((SIZE[0]-w2)//2, SIZE[1]-40), hint, fill=(156,200,193), font=base_font)
    # save both WEBP and PNG versions
    img.save(out, format='WEBP')
    out_png = os.path.join(IMAGES_DIR, f'{slug}.png')
    img.save(out_png, format='PNG')
    count += 1

print(f'[ok] generated {count} placeholders in {IMAGES_DIR}')
