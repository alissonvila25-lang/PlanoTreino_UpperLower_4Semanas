import csv
import io
import re
from pathlib import Path

ROOT = Path(__file__).parent
FILES = [
    (ROOT/"plano-4-semanas.csv", ROOT/"plano-4-semanas.normalizado.csv"),
    (ROOT/"tecnicas.csv", ROOT/"tecnicas.normalizado.csv"),
]

RULES = [
    (re.compile(r"2030%"), "20/30%"),
    (re.compile(r"4050%"), "40/50%"),
    (re.compile(r"510%"), "5/10%"),
    (re.compile(r"\b1x48\b"), "1x4-8"),
    (re.compile(r"\b148\b"), "1x4-8"),
    (re.compile(r"\b44\b"), "4x4"),
    (re.compile(r"\b1112\b(?=\s*reps?\b)", re.IGNORECASE), "11-12"),
    (re.compile(r"\b810\b(?=\s*reps?\b)", re.IGNORECASE), "8-10"),
    (re.compile(r"Prep:23"), "Prep:2-3"),
]

# Frequent accent fixes for mojibake from cp1252 mis-decoding (best-effort)
ACCENT_FIXES = [
    ("mÃ¡quina", "máquina"), ("mÃ¡quinas", "máquinas"), ("tÃ©cnica", "técnica"), ("tÃ©cnicas", "técnicas"),
    ("pausa", "pausa"), ("descida", "descida"), ("pico", "pico"),
    ("ContraÃ§Ã£o", "Contração"), ("contraÃ§Ã£o", "contração"), ("excÃªntrico", "excêntrico"), ("excÃªntrica", "excêntrica"),
    ("quadril", "quadril"), ("pÃ©lvis", "pélvis"), ("escÃ¡pula", "escápula"), ("Estabilidade", "Estabilidade"),
    ("SÃ¡bado", "Sábado"), ("TerÃ§a", "Terça"), ("Quinta", "Quinta"), ("Segunda", "Segunda"),
    ("nÃ£o", "não"), ("Ãºltimo", "último"), ("opcional", "opcional"), ("coraÃ§Ã£o", "coração"),
]

def normalize_text(s: str) -> str:
    if s is None:
        return s
    out = s
    for pattern, repl in RULES:
        out = pattern.sub(repl, out)
    # Light pass to correct common mojibake if present
    for a, b in ACCENT_FIXES:
        out = out.replace(a, b)
    return out

for src, dst in FILES:
    if not src.exists():
        print(f"[warn] missing {src}")
        continue
    raw = src.read_bytes()
    try:
        text = raw.decode('cp1252')
    except UnicodeDecodeError:
        try:
            text = raw.decode('latin-1')
        except Exception:
            text = raw.decode('utf-8', errors='replace')

    # Normalize line by line to keep structure
    lines = text.splitlines()
    norm_lines = [normalize_text(line) for line in lines]
    norm_text = "\n".join(norm_lines)

    # Write UTF-8 with BOM for Excel compatibility
    dst.write_bytes(("\ufeff" + norm_text).encode('utf-8'))
    print(f"[ok] wrote {dst.name}")
