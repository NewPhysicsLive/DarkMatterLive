#!/usr/bin/env python3
"""Validate JSON metadata and referenced CSVs under data/.

Checks:
- JSON parses
- required fields present: labelName, id, url, paperUrls
- referenced CSV exists
- CSV has header x,y and numeric rows

Exits with code 0 if all OK, otherwise non-zero.
"""
import csv
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

required_json_fields = ["labelName", "id", "url", "paperUrls"]


def validate_json_file(path: Path):
    errors = []
    try:
        j = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return [f"JSON parse error: {e}"]

    for f in required_json_fields:
        if f not in j:
            errors.append(f"Missing required field '{f}'")

    # paperUrls must be a non-empty list
    if "paperUrls" in j and (not isinstance(j["paperUrls"], list) or len(j["paperUrls"]) == 0):
        errors.append("'paperUrls' must be a non-empty list of URLs")

    # url should point to a CSV
    if "url" in j:
        csv_path = (path.parent / j["url"]).resolve()
        # allow relative paths like ../../data/..., so check by name
        if not csv_path.exists():
            # try resolve against repo root
            alt = (ROOT / j["url"]).resolve()
            if not alt.exists():
                errors.append(f"Referenced CSV not found at '{j['url']}' (checked {csv_path} and {alt})")
            else:
                j["_resolved_csv"] = alt
        else:
            j["_resolved_csv"] = csv_path

    return errors, j


def validate_csv(path: Path):
    errors = []
    try:
        with path.open("r", encoding="utf-8") as fh:
            reader = csv.reader(fh)
            header = next(reader)
            header = [h.strip() for h in header]
            if header[:2] != ["x", "y"]:
                errors.append(f"CSV header must start with 'x,y' but is: {header}")
            # read some rows to check numeric
            for i, row in enumerate(reader, start=2):
                if len(row) < 2:
                    errors.append(f"Row {i} has fewer than 2 columns: {row}")
                    break
                try:
                    float(row[0])
                    float(row[1])
                except Exception:
                    errors.append(f"Row {i} contains non-numeric value(s): {row}")
                    break
    except Exception as e:
        errors.append(f"Error reading CSV: {e}")
    return errors


def main():
    if not DATA_DIR.exists():
        print(f"Data directory not found at {DATA_DIR}")
        return 2

    total_errors = 0
    for root, dirs, files in os.walk(DATA_DIR):
        rootp = Path(root)
        for f in files:
            if f.lower().endswith(".json"):
                p = rootp / f
                rel = p.relative_to(ROOT)
                errs, parsed = validate_json_file(p)
                if errs:
                    total_errors += 1
                    print(f"[ERROR] {rel}: JSON errors:")
                    for e in errs:
                        print(f"  - {e}")
                    continue
                # no JSON errors, check CSV
                csv_path = parsed.get("_resolved_csv")
                if not csv_path:
                    total_errors += 1
                    print(f"[ERROR] {rel}: could not resolve referenced CSV path")
                    continue

                csv_rel = csv_path.relative_to(ROOT) if csv_path.exists() else csv_path
                csv_errs = validate_csv(csv_path)
                if csv_errs:
                    total_errors += 1
                    print(f"[ERROR] {rel}: problems in CSV {csv_rel}:")
                    for e in csv_errs:
                        print(f"  - {e}")

    if total_errors:
        print(f"\nValidation failed: {total_errors} problem(s) found.")
        return 3
    print("Validation passed: all JSON files and referenced CSVs look OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
