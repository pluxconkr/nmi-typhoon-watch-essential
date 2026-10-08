#!/usr/bin/env python3
"""
Build the offline road graphs bundled in the app (assets/data/roads-<island>.json) from OpenStreetMap.

    python3 scripts/build-roads.py                 # fetch from Overpass if needed, then build all islands
    python3 scripts/build-roads.py --raw-dir DIR   # use <island>-roads.json Overpass dumps already in DIR

Pipeline: Overpass ways tagged highway=* → keep routable classes → split ways at intersections → Douglas-Peucker
simplify each edge (2 m) → keep the largest connected network (walk) and flag the largest drivable network in which
every junction can reach every other one, one-way streets included (so nobody is routed into a one-way dead end) →
quantise to 1e-5 degrees and delta-encode. The output is an ODbL derivative database (© OpenStreetMap contributors).

Edge record (5 ints): from, to, flags, name index (-1 = unnamed), interior point count. Lengths are measured in the app
from the simplified geometry, so distances, progress and arrival all use the same polyline.
flags bits: 0-2 road class (0 major, 1 secondary, 2 local, 3 service, 4 track, 5 path), 3 oneway (forward only),
4 drivable, 5 walkable, 6 in main drivable network, 7 in main walkable network.
Interior points follow in `pts` as quantised lat/lng deltas from the previous point (starting at the `from` node).
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "assets", "data")
UA = "NMITyphoonWatch/1.0 (data build; contact@pluxcon.com)"
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
BBOX = {  # south, west, north, east
    "saipan": (15.08, 145.68, 15.30, 145.84),
    "tinian": (14.91, 145.57, 15.11, 145.69),
    "rota": (14.10, 145.11, 14.21, 145.30),
}
EXCLUDE_HW = "proposed|construction|abandoned|platform|raceway|bus_stop|elevator|corridor|services|rest_area|razed|disused|busway|escape|via_ferrata|emergency_bay"
Q = 1e-5  # quantum in degrees (~1.1 m)
SIMPLIFY_M = 2.0

CLASS = {}
for k in ("motorway", "trunk", "primary", "motorway_link", "trunk_link", "primary_link"):
    CLASS[k] = 0
for k in ("secondary", "tertiary", "secondary_link", "tertiary_link"):
    CLASS[k] = 1
for k in ("unclassified", "residential", "living_street", "road"):
    CLASS[k] = 2
CLASS["service"] = 3
CLASS["track"] = 4
for k in ("footway", "path", "pedestrian", "steps", "cycleway", "bridleway", "sidewalk", "crossing"):
    CLASS[k] = 5
SKIP_SERVICE = {"parking_aisle", "drive-through"}


def fetch(island, raw_dir):
    s, w, n, e = BBOX[island]
    q = f'[out:json][timeout:240];(way["highway"]["area"!="yes"]["highway"!~"^({EXCLUDE_HW})$"]({s},{w},{n},{e}););out body;>;out skel qt;'
    data = urllib.parse.urlencode({"data": q}).encode()
    for ep in ENDPOINTS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(ep, data=data, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=300) as r:
                    body = json.load(r)
                with open(os.path.join(raw_dir, f"{island}-roads.json"), "w") as f:
                    json.dump(body, f)
                return body
            except Exception as ex:  # noqa: BLE001 - retry any network failure
                print(f"  overpass {ep} attempt {attempt + 1}: {ex}", file=sys.stderr)
                time.sleep(5 * (attempt + 1))
    raise SystemExit(f"could not fetch roads for {island}")


def metres(a, b):
    """Equirectangular distance in metres between (lat, lng) points (fine at island scale)."""
    k = math.cos(math.radians((a[0] + b[0]) / 2))
    dy = (b[0] - a[0]) * 111_320.0
    dx = (b[1] - a[1]) * 111_320.0 * k
    return math.hypot(dx, dy)


def perp_m(p, a, b):
    k = math.cos(math.radians(a[0]))
    ax, ay = a[1] * k, a[0]
    bx, by = b[1] * k, b[0]
    px, py = p[1] * k, p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay) * 111_320.0
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111_320.0


def simplify(pts, tol):
    if len(pts) < 3:
        return pts[:]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        s, e = stack.pop()
        best, idx = 0.0, -1
        for i in range(s + 1, e):
            d = perp_m(pts[i], pts[s], pts[e])
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack.append((s, idx))
            stack.append((idx, e))
    return [p for p, k in zip(pts, keep) if k]


def allowed(tags):
    """(drivable, walkable) for a way's tags."""
    hw = tags.get("highway")
    cls = CLASS.get(hw)
    if cls is None:
        return None
    if hw == "service" and tags.get("service") in SKIP_SERVICE:
        return None
    access = tags.get("access")
    no_access = access in ("no", "private")
    drive = cls <= 4 and not no_access and tags.get("motor_vehicle") not in ("no", "private") and tags.get("motorcar") not in ("no", "private")
    walk = tags.get("foot") not in ("no", "private") and not (no_access and tags.get("foot") not in ("yes", "designated", "permissive"))
    if cls <= 4 and access == "private" and tags.get("foot") is None:
        walk = False
    return cls, drive, walk


def build(island, raw):
    nodes = {e["id"]: (e["lat"], e["lon"]) for e in raw["elements"] if e["type"] == "node"}
    ways = []
    for e in raw["elements"]:
        if e["type"] != "way" or "tags" not in e:
            continue
        a = allowed(e["tags"])
        if a is None:
            continue
        cls, drive, walk = a
        if not (drive or walk):
            continue
        nds = [n for n in e["nodes"] if n in nodes]
        if len(nds) < 2:
            continue
        t = e["tags"]
        oneway = 0
        ow = t.get("oneway")
        if ow in ("yes", "1", "true") or t.get("junction") == "roundabout":
            oneway = 1
        elif ow == "-1":
            oneway = 1
            nds = list(reversed(nds))
        if cls == 5:
            oneway = 0
        name = t.get("name") or (f"Route {t['ref']}" if t.get("ref") else None)
        ways.append({"id": e["id"], "nodes": nds, "cls": cls, "drive": drive, "walk": walk, "oneway": oneway, "name": name})

    use = defaultdict(int)
    for w in ways:
        for i, n in enumerate(w["nodes"]):
            use[n] += 2 if i in (0, len(w["nodes"]) - 1) else 1
    is_vertex = {n for n, c in use.items() if c >= 2}

    vid = {}
    vcoords = []

    def vertex(n):
        if n not in vid:
            vid[n] = len(vcoords)
            vcoords.append(nodes[n])
        return vid[n]

    edges = []
    for w in ways:
        nds = w["nodes"]
        start = 0
        for i in range(1, len(nds)):
            if nds[i] in is_vertex or i == len(nds) - 1:
                seg = nds[start : i + 1]
                if len(seg) >= 2 and seg[0] != seg[-1] or len(seg) > 2:
                    pts = [nodes[n] for n in seg]
                    length = sum(metres(pts[j], pts[j + 1]) for j in range(len(pts) - 1))
                    if length > 0.5:
                        edges.append({"a": vertex(seg[0]), "b": vertex(seg[-1]), "pts": simplify(pts, SIMPLIFY_M), "len": length, **{k: w[k] for k in ("cls", "drive", "walk", "oneway", "name")}})
                start = i

    def largest_component(edge_ok, directed):
        """Largest set of vertices that can all reach one another; with `directed`, one-way edges count one way only."""
        adj = defaultdict(list)
        for e in edges:
            if edge_ok(e):
                adj[e["a"]].append(e["b"])
                if not (directed and e["oneway"]):
                    adj[e["b"]].append(e["a"])
        # Tarjan's strongly connected components, iterative (Saipan has ~6k vertices).
        index, low, on_stack, stack, best = {}, {}, set(), [], set()
        for root in list(adj):
            if root in index:
                continue
            index[root] = low[root] = len(index)
            stack.append(root)
            on_stack.add(root)
            work = [(root, iter(adj[root]))]
            while work:
                v, it = work[-1]
                for w in it:
                    if w not in index:
                        index[w] = low[w] = len(index)
                        stack.append(w)
                        on_stack.add(w)
                        work.append((w, iter(adj[w])))
                        break
                    if w in on_stack:
                        low[v] = min(low[v], index[w])
                else:
                    work.pop()
                    if work:
                        low[work[-1][0]] = min(low[work[-1][0]], low[v])
                    if low[v] == index[v]:
                        comp = set()
                        while True:
                            w = stack.pop()
                            on_stack.discard(w)
                            comp.add(w)
                            if w == v:
                                break
                        if len(comp) > len(best):
                            best = comp
        return best

    walk_main = largest_component(lambda e: e["walk"], directed=False)
    drive_main = largest_component(lambda e: e["drive"], directed=True)

    def in_walk(e):
        return e["walk"] and e["a"] in walk_main

    def in_drive(e):
        return e["drive"] and e["a"] in drive_main and e["b"] in drive_main

    kept = [e for e in edges if in_walk(e) or in_drive(e)]

    # Re-index only the vertices still in use.
    remap, out_nodes = {}, []
    for e in kept:
        for key in ("a", "b"):
            v = e[key]
            if v not in remap:
                remap[v] = len(out_nodes)
                out_nodes.append(vcoords[v])
    lat0 = math.floor(min(p[0] for p in out_nodes) / Q) * Q
    lng0 = math.floor(min(p[1] for p in out_nodes) / Q) * Q

    def qz(p):
        return round((p[0] - lat0) / Q), round((p[1] - lng0) / Q)

    names, name_idx = [], {}
    flat_nodes = []
    for p in out_nodes:
        flat_nodes.extend(qz(p))
    flat_edges, flat_pts = [], []
    for e in kept:
        flags = e["cls"] | (e["oneway"] << 3) | (int(e["drive"]) << 4) | (int(e["walk"]) << 5)
        flags |= int(in_drive(e)) << 6
        flags |= int(in_walk(e)) << 7
        ni = -1
        if e["name"]:
            if e["name"] not in name_idx:
                name_idx[e["name"]] = len(names)
                names.append(e["name"])
            ni = name_idx[e["name"]]
        interior = e["pts"][1:-1]
        prev = qz(e["pts"][0])
        for p in interior:
            cur = qz(p)
            flat_pts.extend((cur[0] - prev[0], cur[1] - prev[1]))
            prev = cur
        flat_edges.extend((remap[e["a"]], remap[e["b"]], flags, ni, len(interior)))

    return {
        "v": 1,
        "island": island,
        "attribution": "© OpenStreetMap contributors, ODbL 1.0",
        "source": "OpenStreetMap highway=* ways via Overpass API; split at intersections, simplified 2 m",
        "osmBase": raw.get("osm3s", {}).get("timestamp_osm_base"),
        "q": Q,
        "origin": [round(lat0, 5), round(lng0, 5)],
        "names": names,
        "nodes": flat_nodes,
        "edges": flat_edges,
        "pts": flat_pts,
    }, {"ways": len(ways), "vertices": len(out_nodes), "edges": len(kept), "dropped_edges": len(edges) - len(kept), "km": round(sum(e["len"] for e in kept) / 1000, 1)}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--raw-dir", default=os.path.join(HERE, ".osm-cache"))
    ap.add_argument("islands", nargs="*", default=list(BBOX))
    args = ap.parse_args()
    os.makedirs(args.raw_dir, exist_ok=True)
    for island in args.islands:
        path = os.path.join(args.raw_dir, f"{island}-roads.json")
        raw = json.load(open(path)) if os.path.exists(path) else fetch(island, args.raw_dir)
        graph, stats = build(island, raw)
        out = os.path.join(OUT_DIR, f"roads-{island}.json")
        with open(out, "w") as f:
            json.dump(graph, f, separators=(",", ":"))
        print(f"{island}: {stats} -> {os.path.relpath(out, ROOT)} ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    main()
