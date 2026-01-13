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

ROOT = Path(__file__).resolve().parents[2]
APP_DIR = ROOT / "app"
IMAGES_DIR = APP_DIR / "images"
CSV_PLAN = ROOT / "plano-4-semanas.csv"
CREDITS_FILE = APP_DIR / "image_credits.json"

OPENVERSE_API = "https://api.openverse.engineering/v1/images/"


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
    # tentativa de múltiplos encodings
    try:
        with CSV_PLAN.open("r", encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))
    except UnicodeDecodeError:
        with CSV_PLAN.open("r", encoding="cp1252", newline="") as f:
            rows = list(csv.DictReader(f))
    for r in rows:
        ex = (r.get("Exercicio") or r.get("Exercício") or "").strip()
        if ex:
            names.append(ex)
    return names


def openverse_search(term: str) -> dict | None:
    if not requests:
        print("ERRO: módulo 'requests' não instalado. Execute: pip install requests")
        return None
    params = {
        "q": term,
        "license": "cc0,cc-by,cc-by-sa",  # licenças permissivas
        "page_size": 5,
        "format": "json",
    }
    try:
        r = requests.get(OPENVERSE_API, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print("Falha na API Openverse:", e)
        return None
    results = data.get("results") or []
    if not results:
        return None
    # Preferir imagens com fonte conhecida
    preferred_sources = ("flickr", "wikimedia", "smugmug")
    results_sorted = sorted(results, key=lambda x: 0 if (x.get("source") or "").lower() in preferred_sources else 1)
    return results_sorted[0]


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


def add_credit_entry(slug: str, item: dict, saved_file: str):
    ensure_credits_json()
    try:
        arr = json.loads(CREDITS_FILE.read_text(encoding="utf-8") or "[]")
    except Exception:
        arr = []
    arr.append({
        "slug": slug,
        "source": "Openverse",
        "title": item.get("title"),
        "file": saved_file,
        "original_url": item.get("url"),
        "thumbnail": item.get("thumbnail"),
        "creator": item.get("creator"),
        "license": item.get("license"),
        "license_version": item.get("license_version"),
        "foreign_landing_url": item.get("foreign_landing_url"),
    })
    CREDITS_FILE.write_text(json.dumps(arr, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    print("→ Coletando imagens faltantes via Openverse (Creative Commons)...")
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
        original_name = next((n for n in names if slugify(n) == slug), slug)
        term = f"{original_name} exercício academia"
        print(f"- Buscando: {term}")
        item = openverse_search(term)
        if not item:
            print("  Nenhum resultado útil no Openverse.")
            continue
        url = item.get("thumbnail") or item.get("url")
        if not url:
            print("  Sem URL de download.")
            continue
        ext = ".jpg"
        low = url.lower()
        if ".png" in low:
            ext = ".png"
        elif ".jpeg" in low:
            ext = ".jpeg"
        out_path = IMAGES_DIR / f"{slug}{ext}"
        ok = download_image(url, out_path)
        if ok:
            print(f"  Salvo: {out_path.relative_to(ROOT)}")
            add_credit_entry(slug, item, str(out_path.relative_to(ROOT)).replace("\\", "/"))
        else:
            print("  Falha ao salvar.")
    print("Concluído.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
