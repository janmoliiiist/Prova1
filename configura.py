#!/usr/bin/env python3
"""
Configura la web amb les teves dades reals.

Exemples (des de la carpeta de la web):
    python3 configura.py --domain https://janmolist.cat
    python3 configura.py --key 1a2b3c4d-....        (clau de Web3Forms)
    python3 configura.py --domain https://janmolist.cat --key 1a2b3c4d-....

Què fa:
  --domain  Canvia el domini a canonical, Open Graph, dades estructurades,
            sitemap.xml, robots.txt i generar-casos.py.
  --key     Escriu la clau de Web3Forms a config.js.
  --email   Canvia el correu de contacte (per defecte, el de config.js) a tots els fitxers,
            incloent els mailto: del laboratori.
"""
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXTS = {'.html', '.js', '.xml', '.txt', '.py', '.css'}
PLACEHOLDER_EMAIL = 'hola@elteudomini.cat'


def read(p):
    return p.read_text(encoding='utf-8')


def current(pattern, text, default):
    m = re.search(pattern, text)
    return m.group(1) if m else default


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--domain', help='Domini definitiu, p. ex. https://janmolist.cat')
    ap.add_argument('--key', help='Access Key de Web3Forms')
    ap.add_argument('--email', help='Correu de contacte')
    a = ap.parse_args()
    if not (a.domain or a.key or a.email):
        ap.print_help()
        sys.exit(0)

    gen = ROOT / 'generar-casos.py'
    cfg = ROOT / 'config.js'
    old_domain = current(r"DOMAIN = '([^']+)'", read(gen), 'https://elteudomini.cat') if gen.exists() else 'https://elteudomini.cat'
    old_email = current(r"email: '([^']+)'", read(cfg), PLACEHOLDER_EMAIL) if cfg.exists() else PLACEHOLDER_EMAIL

    changed = []
    domain = a.domain.rstrip('/') if a.domain else None
    if domain and not re.match(r'^https?://[^/\s]+\.[^/\s]+$', domain):
        sys.exit('El domini ha de tenir la forma https://exemple.cat (sense res després).')

    for p in sorted(ROOT.iterdir()):
        if p.suffix not in EXTS or p.name == 'configura.py':
            continue
        t = read(p)
        n = t
        if domain:
            n = n.replace(old_domain, domain)
        if a.email:
            n = n.replace(old_email, a.email)
        n = n.replace(PLACEHOLDER_EMAIL, a.email or old_email)      # mailto: antics del laboratori
        if a.key and p.name == 'config.js':
            n = re.sub(r"web3formsKey: '[^']*'", "web3formsKey: '" + a.key + "'", n)
        if n != t:
            p.write_text(n, encoding='utf-8')
            changed.append(p.name)

    print('Fitxers actualitzats:', ', '.join(changed) if changed else '(cap canvi)')
    if domain:
        print('Domini:', domain)
    if a.key:
        print('Clau de Web3Forms desada a config.js')


if __name__ == '__main__':
    main()
