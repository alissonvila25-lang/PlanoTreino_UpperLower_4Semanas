from pathlib import Path
import qrcode

url = "https://alissonvila25-lang.github.io/PlanoTreino_UpperLower_4Semanas/"
root = Path(__file__).resolve().parents[2]
app = root / "app"
(app / "qr_fixed_url.txt").write_text(url, encoding="utf-8")
img = qrcode.make(url)
img.save(app / "qr_fixed.png")
print(url)
