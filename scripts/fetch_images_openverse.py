import os, csv, unicodedata, json, re
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMAGES_DIR = os.path.join(ROOT, 'images')
os.makedirs(IMAGES_DIR, exist_ok=True)
CSV_PATH = os.path.abspath(os.path.join(ROOT, '..', 'plano-4-semanas.csv'))
CREDITS_PATH = os.path.join(ROOT, 'image_credits.json')

API = 'https://api.openverse.engineering/v1/images/'
WMC_API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'PlanoTreino/1.0'}

# helpers

def slugify(s: str) -> str:
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode('ascii')
    s = ''.join(ch.lower() if ch.isalnum() else '-' for ch in s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s

# minimal mapping to EN terms for better results
MAP_EN = {
    'supino inclinado (maquina)': 'incline chest press machine',
    'supino reto (smith)': 'smith machine bench press',
    'crucifixo (maquina)': 'chest fly machine',
    'pulldown': 'lat pulldown',
    'puxada pronada': 'wide grip lat pulldown pronated',
    'desenvolvimento (maquina)': 'shoulder press machine',
    'elevacao lateral (halteres)': 'lateral raise dumbbells',
    'rosca direta': 'barbell biceps curl',
    'triceps frances': 'french press triceps',
    'abdutora': 'hip abductor machine',
    'agachamento (smith)': 'smith machine squat',
    'leg press': 'leg press',
    'levantamento terra': 'deadlift',
    'elevacao pelvica': 'hip thrust',
    'extensora': 'leg extension machine',
    'flexora deitado': 'lying leg curl machine',
    'stiff': 'romanian deadlift',
    'triceps corda': 'triceps rope pushdown',
    'remada unilateral (halteres)': 'one arm dumbbell row',
    'remada cavalinho (maquina)': 't bar row machine',
    'remada cavalinho (maquina) pronada': 't bar row machine pronated',
    'puxada supinada': 'close grip lat pulldown supinated',
    'rosca scott (maquina)': 'preacher curl machine',
    'rosca scott': 'preacher curl',
    'bulgaro': 'bulgarian split squat',
    'leg press unilateral': 'single leg press',
    'supino inclinado (maquina)': 'incline chest press machine',
    'supino reto (smith)': 'smith machine bench press'
}


def query_openverse(term: str):
    params = {
        'q': term,
        'page_size': 20,
        'license': ','.join(['cc0','by','by-sa']),
        'format': 'json'
    }
    try:
        r = requests.get(API, params=params, headers=HEADERS, timeout=20)
        if r.status_code == 200:
            return r.json().get('results', [])
    except Exception as e:
        print('[warn]', e)
    return []


def best_result(results):
    # choose first JPEG/PNG if available, else any
    for ext in ('jpg','jpeg','png'):
        for item in results:
            url = item.get('url') or item.get('thumbnail')
            if not url: continue
            if f'.{ext}' in url.lower():
                return item
    return results[0] if results else None

def query_wikimedia(term: str):
    try:
        # search for images
        params = {
            'action': 'query',
            'list': 'search',
            'srsearch': term,
            'srnamespace': 6,  # file namespace
            'format': 'json'
        }
        r = requests.get(WMC_API, params=params, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return None
        data = r.json()
        hits = data.get('query', {}).get('search', [])
        if not hits:
            return None
        title = hits[0]['title']
        # get imageinfo with url
        params2 = {
            'action': 'query',
            'titles': title,
            'prop': 'imageinfo',
            'iiprop': 'url',
            'format': 'json'
        }
        r2 = requests.get(WMC_API, params=params2, headers=HEADERS, timeout=20)
        if r2.status_code != 200:
            return None
        d2 = r2.json()
        pages = d2.get('query', {}).get('pages', {})
        for _, p in pages.items():
            ii = p.get('imageinfo', [])
            if ii:
                return {
                    'url': ii[0].get('url'),
                    'foreign_landing_url': 'https://commons.wikimedia.org/wiki/' + title,
                    'creator': '',
                    'license': 'wikimedia',
                    'license_version': ''
                }
    except Exception as e:
        print('[warn] wikimedia', e)
    return None


def download_image(item, out_path):
    url = item.get('url') or item.get('thumbnail')
    if not url:
        return False
    try:
        with requests.get(url, stream=True, headers=HEADERS, timeout=30) as r:
            if r.status_code == 200:
                with open(out_path, 'wb') as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                return True
    except Exception as e:
        print('[warn] download failed', e)
    return False

# read CSV
raw = open(CSV_PATH, 'rb').read()
if raw[:3] == b'\xef\xbb\xbf':
    text = raw.decode('utf-8', errors='replace')
else:
    try: text = raw.decode('utf-8')
    except: text = raw.decode('cp1252', errors='replace')
rows = list(csv.DictReader(text.splitlines()))

credits = []

def normalize_name(name: str) -> str:
    n = (name or '').strip().lower()
    n = n.replace('máquina', 'maquina').replace('tríceps','triceps').replace('elevação','elevacao')
    n = n.replace('rosca','rosca').replace('puxada','puxada').replace('supino','supino')
    n = n.replace('abdutora','abdutora')
    return n

for r in rows:
    ex = r.get('Exercicio') or ''
    if not ex.strip():
        continue
    slug = slugify(ex)
    out_jpg = os.path.join(IMAGES_DIR, f'{slug}.jpg')
    out_png = os.path.join(IMAGES_DIR, f'{slug}.png')
    out_webp = os.path.join(IMAGES_DIR, f'{slug}.webp')
    if any(os.path.exists(p) for p in (out_jpg,out_png,out_webp)):
        continue
    base = normalize_name(ex)
    term = MAP_EN.get(base) or ex + ' exercicio academia'
    results = query_openverse(term)
    item = best_result(results)
    if not item:
        item = query_wikimedia(term)
    if not item:
        print('[skip] no result for', ex)
        continue
    ok = download_image(item, out_jpg)
    if ok:
        credits.append({
            'exercise': ex,
            'slug': slug,
            'file': f'{slug}.jpg',
            'source': item.get('foreign_landing_url') or item.get('url'),
            'creator': item.get('creator') or '',
            'license': item.get('license') or '',
            'license_version': item.get('license_version') or ''
        })
        print('[ok] saved', out_jpg)
    else:
        print('[fail] download', ex)

# write credits
with open(CREDITS_PATH, 'w', encoding='utf-8') as f:
    json.dump(credits, f, ensure_ascii=False, indent=2)
print('[done] credits at', CREDITS_PATH)
