import re
from pathlib import Path
import qrcode

root = Path(__file__).resolve().parents[2]
log = root / "cloudflared.err.log"
if not log.exists():
    raise SystemExit(f"Log file not found: {log}")
text = log.read_text(encoding="utf-8", errors="ignore")
match = re.search(r"https://[^\s]*trycloudflare\.com", text)
if not match:
    raise SystemExit("Public URL not found in cloudflared.err.log")
url = match.group(0)
app_dir = root / "app"
app_dir.mkdir(exist_ok=True)
(app_dir / "qr_url.txt").write_text(url, encoding="utf-8")
img = qrcode.make(url)
img.save(app_dir / "qr.png")
print(url)