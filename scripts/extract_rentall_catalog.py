import csv
import re
import sys

from pypdf import PdfReader

PDF_PATH = "/Users/Noutvanbruggen/.claude/projects/-Users-Noutvanbruggen/b668a7fa-dd2c-41f8-81dc-3c099931891d/tool-results/webfetch-1784208435290-mtdjqi.pdf"
OUT_PATH = "/Users/Noutvanbruggen/Projects/event-begroting/scripts/rentall-catalog.csv"

CATEGORY_KEYWORDS = ["LIGHT", "SOUND", "VIDEO", "RIGGING", "CABLES", "SALES"]

# e.g. "INMA0220 Martin - Mac Quantum Profile LED, WLE, 475W 1-2-3 85,00"
LINE_RE = re.compile(r"^([A-Z]{2,6}\d{3,5})\s+(.*?)\s+([\d]{1,3}(?:[.,]\d{2}))(?:\s+[\d]{1,3}(?:[.,]\d{2}))?$")


def parse_price(raw: str) -> float:
    return float(raw.replace(".", "").replace(",", "."))


def detect_category(line: str, current: str) -> str:
    stripped = line.strip().upper()
    for kw in CATEGORY_KEYWORDS:
        if stripped == kw:
            return kw
    return current


def main():
    reader = PdfReader(PDF_PATH)
    rows = []
    current_category = ""
    seen_codes = set()

    for page in reader.pages:
        text = page.extract_text() or ""
        for raw_line in text.split("\n"):
            line = raw_line.strip()
            if not line:
                continue
            current_category = detect_category(line, current_category)
            match = LINE_RE.match(line)
            if not match:
                continue
            code, name, price_raw = match.groups()
            name = re.sub(r"\s{2,}", " ", name).strip()
            if not name:
                continue
            try:
                price = parse_price(price_raw)
            except ValueError:
                continue
            key = code
            if key in seen_codes:
                continue
            seen_codes.add(key)
            rows.append(
                {
                    "code": code,
                    "name": name,
                    "category": current_category or "OVERIG",
                    "properties": "",
                    "day_price": f"{price:.2f}",
                }
            )

    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["code", "name", "category", "properties", "day_price"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT_PATH}", file=sys.stderr)

    # print category breakdown
    from collections import Counter

    counts = Counter(r["category"] for r in rows)
    for cat, count in counts.most_common():
        print(f"{cat}: {count}", file=sys.stderr)


if __name__ == "__main__":
    main()
