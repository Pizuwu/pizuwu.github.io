#!/usr/bin/env python3
"""Bild- und Datenabgleich: erkennt, ob ein Auto schon einmal angeboten wurde.
Laeuft auf dem GitHub-Runner (pip: pillow imagehash). Liest data/intake/*.json und
data/ka-live.json, laedt bis zu 8 Bilder pro Inserat, berechnet dHash/pHash und
schreibt data/fingerprints.json. crosscheck.mjs vergleicht dann neue gegen alte."""
import json, os, re, sys, glob, hashlib, io, time, urllib.request
from PIL import Image
import imagehash

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = os.path.join(REPO, 'data', 'fingerprints.json')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
db = {'updated_at': '', 'items': {}}
if os.path.exists(FP):
    try: db = json.load(open(FP))
    except Exception: pass

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'de-DE,de;q=0.9'})
    with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()

def hash_images(urls):
    out = []
    for u in urls[:8]:
        try:
            im = Image.open(io.BytesIO(fetch(u))).convert('RGB')
            if im.width < 200: continue
            out.append({'url': u, 'd': str(imagehash.dhash(im, 8)), 'p': str(imagehash.phash(im, 8))})
        except Exception: continue
        time.sleep(0.3)
    return out

def keydata(text):
    t = text or ''
    vin = re.search(r'\bWP0[A-Z0-9]{14}\b', t)
    ez = re.search(r'EZ\s*(\d{2}/\d{4})|Erstzulassung\s*:?\s*(\d{2}[./]\d{4}|\d{4})', t)
    km = re.search(r'(\d{1,3}(?:\.\d{3})+|\d{4,7})\s*km', t)
    ps = re.search(r'(\d{2,3})\s*PS', t)
    return {'vin': vin.group(0) if vin else None,
            'ez': (ez.group(1) or ez.group(2)) if ez else None,
            'km': int(km.group(1).replace('.', '')) if km else None,
            'ps': int(ps.group(1)) if ps else None}

def add(url, title, price, imgs, text, src):
    key = hashlib.sha1(url.encode()).hexdigest()[:12]
    item = db['items'].get(key, {'url': url, 'src': src, 'first_seen': time.strftime('%Y-%m-%d'), 'prices': []})
    item.update({'title': title, 'last_seen': time.strftime('%Y-%m-%d')})
    if price and (not item['prices'] or item['prices'][-1]['p'] != price):
        item['prices'].append({'d': time.strftime('%Y-%m-%d'), 'p': price})
    item.update(keydata(text))
    if not item.get('hashes') and imgs:
        item['hashes'] = hash_images(imgs)
    db['items'][key] = item

# 1) Intake-Datensaetze (volle Detailseiten mit Bildern)
for f in glob.glob(os.path.join(REPO, 'data', 'intake', '*.json')):
    try: r = json.load(open(f))
    except Exception: continue
    if r.get('http') != 200 or r.get('blocked'): continue
    price = re.search(r'(\d{1,3}(?:\.\d{3})+)\s*€', r.get('text', ''))
    add(r['url'], r.get('title', ''), int(price.group(1).replace('.', '')) if price else None, r.get('images', []), r.get('text', ''), 'intake')

# 2) Kleinanzeigen-Liste (nur Eckdaten, keine Bilder in der Liste)
kl = os.path.join(REPO, 'data', 'ka-live.json')
if os.path.exists(kl):
    for l in json.load(open(kl)).get('listings', []):
        add(l['url'], l.get('title', ''), l.get('price_eur'), [], f"EZ {l.get('ez','')} {l.get('km') or ''} km {l.get('snippet','')}", 'kleinanzeigen')

db['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
json.dump(db, open(FP, 'w'), ensure_ascii=False, indent=1)
print(f"fingerprints: {len(db['items'])} Inserate, {sum(1 for i in db['items'].values() if i.get('hashes'))} mit Bildhashes")
