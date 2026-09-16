#!/usr/bin/env python3
"""Benchmark OpenRouter models on the 4 real Sinlaku alerts with the app's exact system prompt.
Usage (from repo root): OPENROUTER_API_KEY=... python3 scripts/bench-summary.py model1 [model2 ...] [--retries N --wait S]
Run from the repo root (reads assets/data/demo-alerts.json and the route's SYSTEM prompt)."""
import json, os, re, sys, time, urllib.request

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = {k: v for k, v in zip(sys.argv[1:], sys.argv[2:]) if k.startswith('--')}
retries = int(opts.get('--retries', 0)); wait = float(opts.get('--wait', 10))
key = os.environ['OPENROUTER_API_KEY']
demo = json.load(open('assets/data/demo-alerts.json'))['alerts']
src = open('src/app/api/summarize+api.ts').read()
SYSTEM = src.split('const SYSTEM = `')[1].split('`;')[0].replace('${TARGET_WORDS}', '15')
KEYS = ['warning-new', 'warning-passage', 'extreme-wind', 'warning-cancelled']

def call(model, a):
    user = f"Alert type: {a['event']}\nAreas: {a['areaDesc']}\nHeadline: {a['headline']}\n\nOfficial text:\n{a['description']}"
    body = {"model": model, "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
            "max_tokens": 200, "temperature": 0, "reasoning": {"enabled": False, "exclude": True}}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'NMI Typhoon Watch'}, method='POST')
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as r: d = json.loads(r.read()); st = r.status
    except urllib.error.HTTPError as e: st = e.code; d = json.loads(e.read() or b'{}')
    except Exception as e: st = 'ERR'; d = {'error': {'message': str(e)}}
    dt = time.time() - t0
    ch = (d.get('choices') or [{}])[0]; content = (ch.get('message') or {}).get('content') or ''
    if isinstance(content, list): content = ' '.join(p.get('text', '') for p in content)
    content = content.strip().strip('"“”')
    u = d.get('usage') or {}
    srcnums = {s.replace(',', '') for s in re.findall(r'\d+(?:[.,]\d+)?', a['description'] + ' ' + (a['headline'] or ''))}
    bad = [n for n in re.findall(r'\d+(?:[.,]\d+)?', content) if n.replace(',', '') not in srcnums]
    err = (d.get('error') or {}).get('message') or ((d.get('error') or {}).get('metadata') or {}).get('raw')
    return st, dt, content, len(content.split()), u.get('cost') or 0, err, bad

for model in args:
    print(f"\n=== {model} ===")
    times, costs, ok = [], [], 0
    for k in KEYS:
        a = next(x for x in demo if x['key'] == k)
        for attempt in range(retries + 1):
            st, dt, content, words, cost, err, bad = call(model, a)
            if st == 200 or attempt == retries: break
            time.sleep(wait)
        times.append(dt); costs.append(cost)
        verdict = 'OK' if st == 200 and content and words <= 20 and not bad else ('too-long' if st == 200 and words > 20 else ('bad-number:' + ','.join(bad) if bad else f'HTTP {st} {str(err)[:90]}'))
        ok += verdict == 'OK'
        print(f"- {k:18} {dt:5.1f}s  {words:2d}w  ${cost:.5f}  → {verdict}")
        if content: print(f"    {content[:150]}")
    print(f"  ok {ok}/4 · avg {sum(times)/len(times):.1f}s · max {max(times):.1f}s · total ${sum(costs):.5f}")
