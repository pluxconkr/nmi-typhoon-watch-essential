#!/usr/bin/env python3
"""
Build assets/data/supplies.json and docs/supply-sources.md from verified research records.

    python3 scripts/build-supplies.py RECORDS.json [RECORDS.json ...]

Each input is a JSON array of store records (schema in src/domain/types.ts → SupplyStore, plus status "closed").
Every record must cite at least one source. Not bundled, but listed in the evidence document: records marked
"closed"; records with no published location (lat/lng null) — the app cannot place, measure or route to them;
and records that are both unconfirmed ("unknown") and only placed at a village centre ("low") — neither whether
the store is open nor where it is could be confirmed, so sending someone there in an emergency is not justified. Coordinates must fall inside the island's bounding box. Duplicates (same id, or same name within 60 m) are
merged by keeping the record with more sources.
"""
import datetime
import json
import math
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "data", "supplies.json")
DOC = os.path.join(ROOT, "docs", "supply-sources.md")
BBOX = {"saipan": (15.08, 145.68, 15.30, 145.84), "tinian": (14.91, 145.57, 15.11, 145.69), "rota": (14.10, 145.11, 14.21, 145.30)}
CATEGORIES = {"grocery", "convenience", "pharmacy", "hardware", "fuel"}
STATUSES = {"operating", "unknown", "closed"}
CONFIDENCE = {"high", "medium", "low"}
LABEL = {"grocery": "Grocery", "convenience": "Convenience", "pharmacy": "Pharmacy", "hardware": "Hardware", "fuel": "Gas station"}


def metres(a, b):
    k = math.cos(math.radians((a[0] + b[0]) / 2))
    return math.hypot((b[0] - a[0]) * 111_320, (b[1] - a[1]) * 111_320 * k)


def located(r):
    return isinstance(r.get("lat"), (int, float)) and isinstance(r.get("lng"), (int, float))


def check(r):
    """Return a list of problems with a record (empty = valid)."""
    p = []
    required = ("id", "name", "category", "island", "status", "statusEvidence", "sources", "lastVerified")
    if located(r):
        required += ("village", "coordSource", "coordConfidence")
    for key in required:
        if r.get(key) in (None, ""):
            p.append(f"missing {key}")
    if r.get("category") not in CATEGORIES:
        p.append(f"category {r.get('category')!r}")
    if r.get("status") not in STATUSES:
        p.append(f"status {r.get('status')!r}")
    if located(r) and r.get("coordConfidence") not in CONFIDENCE:
        p.append(f"coordConfidence {r.get('coordConfidence')!r}")
    box = BBOX.get(r.get("island"))
    if not box:
        p.append(f"island {r.get('island')!r}")
    elif located(r):
        s, w, n, e = box
        if not (s <= r["lat"] <= n and w <= r["lng"] <= e):
            p.append(f"coordinates {r['lat']},{r['lng']} outside {r['island']}")
    srcs = r.get("sources") or []
    if not srcs or not all(isinstance(x, dict) and str(x.get("url", "")).startswith("http") for x in srcs):
        p.append("sources need at least one http(s) url")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(r.get("lastVerified", ""))):
        p.append(f"lastVerified {r.get('lastVerified')!r}")
    return p


def main(paths):
    records, rejected = [], []
    for path in paths:
        for r in json.load(open(path)):
            problems = check(r)
            (rejected if problems else records).append((r, problems))
    if rejected:
        for r, problems in rejected:
            print(f"REJECTED {r.get('id') or r.get('name')}: {'; '.join(problems)}", file=sys.stderr)
    merged = []
    for r, _ in records:
        dup = next((m for m in merged if m["id"] == r["id"] or (located(m) and located(r) and m["name"].lower() == r["name"].lower() and metres((m["lat"], m["lng"]), (r["lat"], r["lng"])) < 60)), None)
        if dup is None:
            merged.append(r)
        elif len(r["sources"]) > len(dup["sources"]):
            merged[merged.index(dup)] = r
    order = {c: i for i, c in enumerate(["grocery", "pharmacy", "hardware", "fuel", "convenience"])}
    merged.sort(key=lambda r: (r["island"], order[r["category"]], r["name"].lower()))
    def why_left_out(r):
        if r["status"] == "closed":
            return "closed"
        if not located(r):
            return "no published location"
        if r["status"] == "unknown" and r["coordConfidence"] == "low":
            return "not confirmed open, and only a village-level location"
        return None

    keep = [r for r in merged if why_left_out(r) is None]
    unlocated = [r for r in merged if why_left_out(r) == "no published location"]
    doubtful = [r for r in merged if why_left_out(r) == "not confirmed open, and only a village-level location"]
    fields = ("id", "name", "category", "island", "village", "address", "lat", "lng", "coordSource", "coordConfidence", "phone", "hours", "status", "statusEvidence", "sources", "lastVerified", "notes")
    stores = [{k: (round(r[k], 6) if k in ("lat", "lng") else r.get(k)) for k in fields} for r in keep]
    verified = max((r["lastVerified"] for r in keep), default=None)
    out = {
        "version": datetime.date.today().strftime("%Y.%m.%d"),
        "verifiedOn": verified,
        "note": "Generated by scripts/build-supplies.py. Each store cites its sources; evidence trail in docs/supply-sources.md.",
        "stores": stores,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")

    lines = [
        "# Supply stores — evidence trail",
        "",
        f"Generated {datetime.date.today().isoformat()} by `scripts/build-supplies.py`. {len(keep)} stores bundled "
        f"({sum(r['status'] == 'operating' for r in keep)} confirmed operating by a 2025–26 source, "
        f"{sum(r['status'] == 'unknown' for r in keep)} not confirmed); {sum(r['status'] == 'closed' for r in merged)} found closed and "
        f"{len(unlocated)} with no published location and {len(doubtful)} neither confirmed open nor precisely located left out "
        f"(listed below, marked \"not bundled\", so a later update can add them).",
        "",
        "Coordinates: `osm:` = OpenStreetMap element (exact); otherwise the method is named. Low confidence = village only.",
        "",
    ]
    for island in ("saipan", "tinian", "rota"):
        rows = [r for r in merged if r["island"] == island]
        if not rows:
            continue
        lines += [f"## {island.capitalize()}", ""]
        for r in rows:
            reason = why_left_out(r)
            lines.append(f"### {r['name']} — {LABEL[r['category']]}, {r.get('village') or 'village not published'} ({r['status']}{'' if reason is None else f', not bundled: {reason}'})")
            lines.append("")
            if located(r):
                lines.append(f"- Location: {r.get('address') or 'no street address published'} · {r['lat']:.5f}, {r['lng']:.5f} · {r['coordSource']} ({r['coordConfidence']})")
            else:
                lines.append(f"- Location: not published anywhere we could find ({r.get('coordSource') or 'no source'}) — not bundled")
            if r.get("phone") or r.get("hours"):
                lines.append(f"- Phone / hours: {r.get('phone') or '—'} / {r.get('hours') or '—'}")
            lines.append(f"- Status evidence: {r['statusEvidence']}")
            for s in r["sources"]:
                lines.append(f"- Source ({s.get('date', 'n.d.')}): {s.get('what', '')} — {s['url']}")
            if r.get("notes"):
                lines.append(f"- Note: {r['notes']}")
            lines.append("")
    with open(DOC, "w") as f:
        f.write("\n".join(lines))
    closed = sum(r["status"] == "closed" for r in merged)
    print(f"{len(keep)} stores bundled ({closed} closed, {len(unlocated)} unlocated, {len(doubtful)} unconfirmed + village-only left out; {len(rejected)} rejected) -> {os.path.relpath(OUT, ROOT)}, {os.path.relpath(DOC, ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(sys.argv[1:])
