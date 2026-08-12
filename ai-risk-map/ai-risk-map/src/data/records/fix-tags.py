import json
from pathlib import Path

records_dir = Path("./data/records")

for path in records_dir.glob("*.json"):
    data = json.loads(path.read_text(encoding="utf-8"))

    metadata = data.setdefault("metadata", {})
    meta_tags = metadata.get("tags", [])
    top_tags = data.pop("tags", [])

    merged = []
    for tag in [*meta_tags, *top_tags]:
        if tag not in merged:
            merged.append(tag)

    metadata["tags"] = merged

    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print(f"normalized {path.name}")
