#!/usr/bin/env python3
"""
Bulk-update AI risk map JSON records with impact fields.

Usage:
  python add_impact_fields.py /path/to/records

Assumptions:
- Each JSON file is a single record object like your current schema.
- Existing tags are preserved.
- Only files ending in .json are updated.
- This script adds/updates:
    impact_scale: one of local|institutional|societal|global
    impact_mode: one of direct|mediated|systemic|cascading
- It can also append tags such as:
    impact-local, impact-global, mode-cascading
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, Any

# Edit this mapping to taste.
# Keys should match your record "id" values.
OVERRIDES: Dict[str, Dict[str, Any]] = {
    "spell-checker": {
        "impact_scale": "local",
        "impact_mode": "mediated",
        "add_tags": ["impact-local", "mode-mediated"],
    },
    "calculator": {
        "impact_scale": "local",
        "impact_mode": "mediated",
        "add_tags": ["impact-local", "mode-mediated"],
    },
    "gps-navigation": {
        "impact_scale": "societal",
        "impact_mode": "mediated",
        "add_tags": ["impact-societal", "mode-mediated"],
    },
    "high-frequency-trading": {
        "impact_scale": "institutional",
        "impact_mode": "systemic",
        "add_tags": ["impact-institutional", "mode-systemic"],
    },
    "robot-vacuum": {
        "impact_scale": "local",
        "impact_mode": "direct",
        "add_tags": ["impact-local", "mode-direct"],
    },
    "smart-thermostat": {
        "impact_scale": "local",
        "impact_mode": "direct",
        "add_tags": ["impact-local", "mode-direct"],
    },
    "self-driving-car": {
        "impact_scale": "local",
        "impact_mode": "direct",
        "add_tags": ["impact-local", "mode-direct"],
    },
    "warehouse-robotics": {
        "impact_scale": "institutional",
        "impact_mode": "direct",
        "add_tags": ["impact-institutional", "mode-direct"],
    },
    "claude-opus-4-7": {
        "impact_scale": "global",
        "impact_mode": "cascading",
        "add_tags": ["impact-global", "mode-cascading"],
    },
    "claude-mythos-preview": {
        "impact_scale": "global",
        "impact_mode": "cascading",
        "add_tags": ["impact-global", "mode-cascading"],
    },
    "gemini-3-1-pro": {
        "impact_scale": "global",
        "impact_mode": "cascading",
        "add_tags": ["impact-global", "mode-cascading"],
    },
}

def merge_tags(existing, extra):
    existing = existing or []
    merged = list(existing)
    for tag in extra:
        if tag not in merged:
            merged.append(tag)
    return merged

def update_record(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    record_id = data.get("id")
    if not record_id or record_id not in OVERRIDES:
        return False

    rule = OVERRIDES[record_id]
    data["impact_scale"] = rule["impact_scale"]
    data["impact_mode"] = rule["impact_mode"]

    metadata = data.setdefault("metadata", {})
    metadata["tags"] = merge_tags(metadata.get("tags", []), rule.get("add_tags", []))

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return True

def main():
    if len(sys.argv) != 2:
        print("Usage: python add_impact_fields.py /path/to/records")
        raise SystemExit(1)

    records_dir = Path(sys.argv[1])
    if not records_dir.exists() or not records_dir.is_dir():
        print(f"Not a directory: {records_dir}")
        raise SystemExit(1)

    changed = 0
    skipped = 0

    for path in sorted(records_dir.glob("*.json")):
        try:
            if update_record(path):
                print(f"updated  {path.name}")
                changed += 1
            else:
                print(f"skipped  {path.name}")
                skipped += 1
        except Exception as e:
            print(f"error    {path.name}: {e}")

    print(f"\nDone. Updated {changed}, skipped {skipped}.")

if __name__ == "__main__":
    main()
