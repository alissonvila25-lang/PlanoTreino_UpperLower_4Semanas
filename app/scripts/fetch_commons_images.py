import csv
import json
import os
import re
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# Paths
ROOT = Path(__file__).resolve().parents[2]
APP_DIR = ROOT / "app"
IMAGES_DIR = APP_DIR / "images"
CSV_PLAN = ROOT / "plano-4-semanas.csv"
CREDITS_FILE = APP_DIR / "image_credits.json"

COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def slugify(text: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", text)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)", "", s)
    return s


def has_local_image(slug: str) -> bool:
    for ext in (".webp", ".png", ".jpg", ".jpeg"):
        if (IMAGES_DIR / f"{slug}{ext}").exists():
            return True
    return False


def read_exercise_names() -> list[str]:
    names = []
    if not CSV_PLAN.exists():
        print(f"ERRO: CSV não encontrado: {CSV_PLAN}")
        return names
    with CSV_PLAN.open("r", encoding="utf-8", newline="") as f:
        # Tenta ler como UTF-8; se falhar, tenta cp1252
        try:
            rows = list(csv.DictReader(f))
        except UnicodeDecodeError:
            with CSV_PLAN.open("r", encoding="cp1252", newline="") as f2:
                rows = list(csv.DictReader(f2))
    for r in rows:
        ex = (r.get("Exercicio") or r.get("Exercício") or "").strip()
        if ex:
            names.append(ex)
    return names


def commons_search_image(term: str) -> dict | None:
    """Search Wikimedia Commons for an image and return metadata dict.
    Returns dict with keys: title, pageid, url, thumburl, extmetadata.
    """
    if not requests:
        print("ERRO: módulo 'requests' não instalado. Execute: pip install requests")
        return None
    # 1) search for files (namespace 6)
    params = {
        "action": "query",
        "list": "search",
        "srsearch": term,
        "srnamespace": 6,
        "format": "json",
    }
    try:
        r = requests.get(COMMONS_API, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print("Falha no search:", e)
        return None
    hits = (data.get("query", {}).get("search") or [])
    if not hits:
        return None
    title = hits[0]["title"]
    # 2) get imageinfo with url + extmetadata + thumb
    params2 = {
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": 1200,
        "format": "json",
    }
    try:
        r2 = requests.get(COMMONS_API, params=params2, timeout=15)
        r2.raise_for_status()
        d2 = r2.json()
    except Exception as e:
        print("Falha no imageinfo:", e)
        return None
    pages = d2.get("query", {}).get("pages", {})
    for k, page in pages.items():
        ii = page.get("imageinfo")
        if not ii:
            continue
        info = ii[0]
        return {
            "title": title,
            "pageid": page.get("pageid"),
            "url": info.get("url"),
            "thumburl": info.get("thumburl"),
            "extmetadata": info.get("extmetadata") or {},
        }
    return None


def download_image(url: str, out_path: Path) -> bool:
    if not requests:
        print("ERRO: módulo 'requests' não instalado. Execute: pip install requests")
        return False
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        out_path.write_bytes(resp.content)
        return True
    except Exception as e:
        print("Falha ao baixar imagem:", e)
        return False


def ensure_credits_json():
    if not CREDITS_FILE.exists():
        CREDITS_FILE.write_text("[]", encoding="utf-8")


def add_credit_entry(slug: str, meta: dict, saved_file: str):
    ensure_credits_json()
    try:
        arr = json.loads(CREDITS_FILE.read_text(encoding="utf-8") or "[]")
    except Exception:
        arr = []
    ext = meta.get("extmetadata") or {}
    author = None
    license_short = None
    license_url = None
    if isinstance(ext, dict):
        author = (ext.get("Artist", {}) or {}).get("value")
        license_short = (ext.get("LicenseShortName", {}) or {}).get("value")
        license_url = (ext.get("LicenseUrl", {}) or {}).get("value")
    arr.append({
        "slug": slug,
        "source": "Wikimedia Commons",
        "title": meta.get("title"),
        "file": saved_file,
        "original_url": meta.get("url"),
        "thumb_url": meta.get("thumburl"),
        "author": author,
        "license": license_short,
        "license_url": license_url,
    })
    CREDITS_FILE.write_text(json.dumps(arr, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    print("→ Coletando imagens faltantes do Wikimedia Commons (licenças livres)...")
    if not IMAGES_DIR.exists():
        IMAGES_DIR.mkdir(parents=True)
    names = read_exercise_names()
    if not names:
        print("Nenhum exercício encontrado no CSV.")
        return 1
    unique_slugs = sorted({slugify(n) for n in names})
    missing = [s for s in unique_slugs if not has_local_image(s)]
    if not missing:
        print("Nenhuma imagem faltando. Tudo certo!")
        return 0
    print(f"Encontrados {len(missing)} exercícios sem imagem local.")
    for slug in missing:
        # Build a search term in Portuguese to improve results
        original_name = next((n for n in names if slugify(n) == slug), slug)
        term = f"{original_name} exercício academia"
        print(f"- Buscando: {term}")
        meta = commons_search_image(term)
        if not meta:
            print("  Nenhuma imagem encontrada no Commons.")
            continue
        url = meta.get("thumburl") or meta.get("url")
        if not url:
            print("  Metadados sem URL utilizável.")
            continue
        # Choose extension based on URL
        ext = ".jpg"
        if ".png" in url.lower():
            ext = ".png"
        elif ".jpeg" in url.lower():
            ext = ".jpeg"
        out_path = IMAGES_DIR / f"{slug}{ext}"
        ok = download_image(url, out_path)
        if ok:
            print(f"  Salvo: {out_path.relative_to(ROOT)}")
            add_credit_entry(slug, meta, str(out_path.relative_to(ROOT)).replace("\\", "/"))
        else:
            print("  Falha ao salvar.")
    print("Concluído.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
