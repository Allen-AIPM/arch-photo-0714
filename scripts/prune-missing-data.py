from pathlib import Path
import json
import re


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "public" / "data.js"
IMAGE_DIR = PROJECT_ROOT / "public" / "image"


def main() -> None:
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.INSPIRATION_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise SystemExit("Cannot parse public/data.js")

    data = json.loads(match.group(1))
    existing = {file.name for file in IMAGE_DIR.iterdir() if file.is_file()}
    kept = []
    removed = []

    for item in data.get("items", []):
        relative_path = item.get("relativePath") or item.get("imageUrl") or ""
        file_name = Path(relative_path).name
        if file_name in existing:
            kept.append(item)
        else:
            removed.append(file_name or item.get("fileName") or item.get("title") or "unknown")

    data["items"] = kept
    data["totalImages"] = len(kept)
    data["matchedExcelRows"] = min(int(data.get("matchedExcelRows", len(kept)) or 0), len(kept))
    data["aiTaggedCount"] = sum(
        1 for item in kept
        if any(values for values in (item.get("aiTags") or {}).values())
    )

    DATA_PATH.write_text(
        "window.INSPIRATION_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"Kept {len(kept)} items, removed {len(removed)} missing items")
    for name in removed:
        print(f"removed: {name}")


if __name__ == "__main__":
    main()
