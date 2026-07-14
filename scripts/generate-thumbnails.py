from pathlib import Path
import json
from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = PROJECT_ROOT / "public" / "image"
THUMB_DIR = PROJECT_ROOT / "public" / "thumbs"
AVATAR_SOURCE = PROJECT_ROOT / "public" / "avatar.jpg"
AVATAR_TARGET = PROJECT_ROOT / "public" / "avatar-small.jpg"
META_TARGET = PROJECT_ROOT / "public" / "image-meta.js"


def save_resized_jpeg(source: Path, target: Path, max_side: int, quality: int = 82) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA"):
            background = Image.new("RGB", image.size, "white")
            background.paste(image, mask=image.getchannel("A"))
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        image.save(target, "JPEG", quality=quality, optimize=True, progressive=True)


def main() -> None:
    if not IMAGE_DIR.exists():
        raise SystemExit(f"Image folder not found: {IMAGE_DIR}")

    image_files = [
        file
        for file in IMAGE_DIR.iterdir()
        if file.is_file() and file.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ]

    generated = 0
    metadata = {}
    for file in image_files:
        target = THUMB_DIR / f"{file.stem}.jpg"
        try:
            with Image.open(file) as image:
                image = ImageOps.exif_transpose(image)
                metadata[f"image/{file.name}"] = {"width": image.width, "height": image.height}
            save_resized_jpeg(file, target, 760, 78)
            generated += 1
        except Exception as exc:
            print(f"Skip {file.name}: {exc}")

    if AVATAR_SOURCE.exists():
        save_resized_jpeg(AVATAR_SOURCE, AVATAR_TARGET, 120, 84)

    META_TARGET.write_text(
        "window.IMAGE_META = "
        + json.dumps(metadata, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

    print(f"Generated {generated}/{len(image_files)} thumbnails in public/thumbs")


if __name__ == "__main__":
    main()
