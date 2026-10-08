#!/usr/bin/env python3
"""Frozen experimental fixture formatting. No model, dispatch or semantic scoring."""
import argparse
import hashlib
import json
from pathlib import Path

VERSION = "private-report-formatter-20261008.1"
FIELDS = ("sequence", "worker", "task", "run", "kind", "statement", "evidence_ref", "ordinal_in_source")

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

def source_label(record):
    return "Worker " + record["worker"] + " | Task " + record["task"] + " | Run " + record["run"]

def validate_records(records):
    if not isinstance(records, list) or len(records) != 12:
        raise ValueError("expected 12 ordered records")
    for n, record in enumerate(records, 1):
        if set(record) != set(FIELDS) or type(record["sequence"]) is not int or record["sequence"] != n:
            raise ValueError("record field or sequence mismatch")
        if type(record["ordinal_in_source"]) is not int or record["ordinal_in_source"] < 1:
            raise ValueError("invalid source ordinal")
        if any(not isinstance(record[k], str) or not record[k] for k in FIELDS if k not in ("sequence", "ordinal_in_source")):
            raise ValueError("empty semantic field")
        if record["worker"] not in ("A", "B", "C"):
            raise ValueError("invalid worker")
    return records

def render(records, arm):
    validate_records(records)
    if arm == "osc":
        return json.dumps({"schema": "john.open-scaffold.attributed-reports.v1", "reports": [
            {"source_label": source_label(r), "record": r} for r in records
        ]}, indent=2, ensure_ascii=False) + "\n"
    if arm == "plain":
        lines = ["Plain messages — synthetic worker reports"]
        for r in records:
            lines.append("Source: " + json.dumps(source_label(r), ensure_ascii=False))
            lines.extend(k + ": " + json.dumps(r[k], ensure_ascii=False) for k in FIELDS)
            lines.append("")
        return "\n".join(lines) + "\n"
    raise ValueError("unknown arm")

def parse(text, arm):
    if arm == "osc":
        obj = json.loads(text)
        if set(obj) != {"schema", "reports"} or obj["schema"] != "john.open-scaffold.attributed-reports.v1":
            raise ValueError("OSC envelope mismatch")
        labels, records = [], []
        for item in obj["reports"]:
            if set(item) != {"source_label", "record"}:
                raise ValueError("OSC source label missing")
            labels.append(item["source_label"]); records.append(item["record"])
    elif arm == "plain":
        lines = text.splitlines()
        if not lines or lines.pop(0) != "Plain messages — synthetic worker reports":
            raise ValueError("plain header mismatch")
        labels, records = [], []
        while lines:
            if not lines[0]:
                lines.pop(0); continue
            if not lines[0].startswith("Source: "):
                raise ValueError("plain source label missing")
            labels.append(json.loads(lines.pop(0)[8:])); record = {}
            for k in FIELDS:
                if not lines or not lines[0].startswith(k + ": "):
                    raise ValueError("plain field missing or reordered")
                record[k] = json.loads(lines.pop(0)[len(k) + 2:])
            records.append(record)
    else:
        raise ValueError("unknown arm")
    validate_records(records)
    if labels != [source_label(r) for r in records]:
        raise ValueError("source attribution mismatch")
    return records

def parity(records):
    for arm in ("osc", "plain"):
        if canonical(parse(render(records, arm), arm)) != canonical(records):
            raise ValueError("semantic parity failed")
    return {"formatter_version": VERSION, "record_count": len(records),
            "ordered_semantic_sha256": hashlib.sha256(canonical(records)).hexdigest(),
            "all_fields_order_categories_evidence_and_source_labels_preserved": True,
            "arms": {a: {"utf8_bytes": len(render(records, a).encode("utf-8")),
                         "characters": len(render(records, a))} for a in ("osc", "plain")}}

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--study", type=Path, default=Path(__file__).with_name("study.json"))
    p.add_argument("--arm", choices=("osc", "plain"))
    p.add_argument("--check-parity", action="store_true")
    args = p.parse_args()
    if not args.arm and not args.check_parity:
        p.error("choose --arm or --check-parity")
    study = json.loads(args.study.read_text(encoding="utf-8"))
    records = json.loads(study["artifacts"]["comparison-runs/common-representation.json"]["text"])["records"]
    print(json.dumps(parity(records), indent=2) if args.check_parity else render(records, args.arm), end="\n" if args.check_parity else "")
