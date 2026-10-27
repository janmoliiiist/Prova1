#!/usr/bin/env python3
"""
Genera les pàgines de cas d'estudi (projecte-*.html), sitemap.xml i robots.txt.

Ús (des de la carpeta de la web):
    python3 generar-casos.py

Per afegir un projecte nou: copia un bloc de CASES, canvia les dades i torna
a executar l'script. Recorda afegir també la targeta a index.html.
"""
import json
from html import escape
from pathlib import Path

# ----------------------------------------------------------------------------
# CONFIGURACIÓ
# ----------------------------------------------------------------------------
DOMAIN = 'https://elteudomini.cat'      # canvia-ho quan tinguis el domini (o fes servir configura.py)
EMAIL = 'janmoliiiist@gmail.com'
LASTMOD = '2026-10-25'
OUT = Path(__file__).resolve().parent

NOTE = ('<b>Cas de mostra.</b> Aquest projecte és un concepte que he dissenyat per ensenyar com treballo; '
        'no és un client real i les xifres són objectius de disseny, no resultats mesurats. '
        'Quan tingui projectes reals, aquesta secció tindrà les dades reals.')

# ----------------------------------------------------------------------------
# DADES DELS CASOS
# ----------------------------------------------------------------------------
CASES = [
    dict(
        slug='brasa', vt='p-brasa', url='brasa.cat',
        title='Brasa', title_html='Brasa',
        seo_title='Brasa · Cas d\'estudi: web per a restaurant | Jan Molist',
        seo_desc='Concepte de web per a un restaurant de cuina a la llenya: identitat càlida, reserva en tres tocs i càrrega ràpida al mòbil.',
        lead='Una web que fa olor de fum de llenya abans d\'asseure\'s a taula.',
        tags=['Restaurant', 'Web i reserves', 'Identitat'],
        client='Brasa · restaurant (concepte)', services='Direcció d\'art, disseny web i reserves',
        year='2026', tools='HTML, CSS i JavaScript',
        challenge=[
            'Un restaurant de cuina a la llenya que s\'omplia pel boca-orella, però amb una web que era una carta en PDF i un número de telèfon. Qui el buscava des del mòbil no veia l\'ambient ni podia reservar sense trucar.',
            'L\'objectiu: que la web transmetés l\'escalfor del local i convertís cada visita en una reserva.',
        ],
        solution=[
            ('Una identitat que escalfa', 'Degradat de brasa, tipografia serif cursiva i una petita animació de pols que recorda el foc.'),
            ('Reserva en tres tocs', 'Dia, comensals i hora en una sola pantalla pensada per al polze, sense registre ni formularis llargs.'),
            ('La carta com a protagonista', 'Plats destacats amb ritme visual en lloc d\'un PDF que ningú obre.'),
            ('Ràpida al mòbil', 'Imatges optimitzades i res de plantilles pesades: carrega bé fins i tot amb poca cobertura.'),
        ],
        stats=[(3, '', 'tocs per fer una reserva'), (1, ' s', 'objectiu de càrrega al mòbil'), (100, '', 'objectiu de rendiment Lighthouse')],
        screen='<div class="screen s1"><div class="s1-in"><span class="s1-title">Brasa</span><span class="s1-sub">Cuina a la llenya</span></div></div>',
    ),
    dict(
        slug='nord', vt='p-nord', url='nordarquitectura.com',
        title='Nord Arquitectura', title_html='Nord <em>Arquitectura</em>',
        seo_title='Nord Arquitectura · Cas d\'estudi: portafoli visual | Jan Molist',
        seo_desc='Concepte de portafoli web per a un estudi d\'arquitectura: graella tipus plànol, projectes a pantalla completa i molt d\'aire.',
        lead='Un portafoli que es comporta com un plànol: net, amb escala i amb molt d\'aire.',
        tags=['Estudi', 'Portafoli visual', 'Direcció d\'art'],
        client='Nord Arquitectura · estudi (concepte)', services='Disseny web i portafoli visual',
        year='2026', tools='HTML, CSS i JavaScript',
        challenge=[
            'Un estudi d\'arquitectura amb obra de qualitat, però amb un portafoli en PDF pesat que gairebé ningú obria. Els clients potencials decideixen en segons, i no hi havia res que els fes quedar-s\'hi.',
            'L\'objectiu: que la web ensenyés l\'obra amb la mateixa cura amb què es dibuixa.',
        ],
        solution=[
            ('Graella com a plànol', 'Una quadrícula discreta de fons que ordena tota la pàgina i dóna sensació d\'escala.'),
            ('Projectes a pantalla completa', 'Cada obra ocupa tot l\'espai que necessita, sense marcs ni distraccions.'),
            ('Pocs colors, un sol accent', 'Negre, ivori i un punt vermell: el vermell només hi és perquè l\'ull sàpiga on mirar.'),
            ('Contacte sense fricció', 'Un únic camí per escriure a l\'estudi des de qualsevol pàgina.'),
        ],
        stats=[(2, '', 'clics per veure qualsevol obra'), (0, '', 'plantilles reutilitzades'), (100, '', 'objectiu d\'accessibilitat Lighthouse')],
        screen='<div class="screen s2"><span class="s2-word">NORD</span><div class="s2-block"></div><div class="s2-dot"></div></div>',
    ),
    dict(
        slug='pulse', vt='p-pulse', url='pulse.app',
        title='Pulse', title_html='Pulse',
        seo_title='Pulse · Cas d\'estudi: landing i dashboard SaaS | Jan Molist',
        seo_desc='Concepte de landing i dashboard per a un producte SaaS d\'analítica: una xifra que mana, gràfics clars i una sola acció.',
        lead='Una landing que ven i un dashboard que s\'entén de seguida.',
        tags=['SaaS', 'Landing', 'Dashboard'],
        client='Pulse · producte SaaS (concepte)', services='Disseny de producte, landing i dashboard',
        year='2026', tools='Next.js i Supabase',
        challenge=[
            'Un producte d\'analítica amb moltes dades i poca claredat: la landing explicava funcions en lloc de beneficis i el dashboard mostrava totes les xifres alhora, sense jerarquia.',
            'L\'objectiu: que algú entengués el valor en uns segons i que, un cop dins, sabés què mirar primer.',
        ],
        solution=[
            ('Una xifra que mana', 'Cada pantalla té un indicador principal gran i legible; la resta queda en segon pla.'),
            ('Gràfics que respiren', 'Barres amb moviment suau que expliquen l\'evolució sense soroll visual.'),
            ('Landing amb una sola acció', 'Un únic crida a l\'acció repetit al llarg de la pàgina, sense camins alternatius.'),
            ('Sistema de disseny reutilitzable', 'Colors, espais i components definits una vegada per créixer sense perdre coherència.'),
        ],
        stats=[(1, '', 'acció principal a la landing'), (5, ' s', 'objectiu per entendre el valor'), (100, '', 'objectiu de rendiment Lighthouse')],
        screen=('<div class="screen s3"><div class="s3-kpi"><b>+248%</b><small>Visites aquest mes</small></div>'
                '<div class="s3-bars"><i style="--h:35%;--i:0"></i><i style="--h:55%;--i:1"></i><i style="--h:42%;--i:2"></i>'
                '<i style="--h:70%;--i:3"></i><i style="--h:58%;--i:4"></i><i style="--h:85%;--i:5"></i>'
                '<i style="--h:66%;--i:6"></i><i style="--h:100%;--i:7"></i></div></div>'),
    ),
    dict(
        slug='tallers', vt='p-tallers', url='tallers.shop',
        title='Tallers', title_html='Tallers',
        seo_title='Tallers · Cas d\'estudi: botiga en línia | Jan Molist',
        seo_desc='Concepte de botiga en línia per a peces fetes a mà: un color per producte, fitxes amb moviment i compra en dos passos.',
        lead='Una botiga que sembla un aparador i es compra com una app.',
        tags=['Botiga en línia', 'E-commerce', 'Disseny de producte'],
        client='Tallers · botiga (concepte)', services='Disseny web i botiga en línia',
        year='2026', tools='Next.js i Supabase',
        challenge=[
            'Una botiga d\'objectes fets a mà amb fitxes de producte d\'un catàleg genèric: totes les peces es veien iguals i el procés de compra tenia massa passos.',
            'L\'objectiu: que cada peça tingués personalitat pròpia i que comprar fos gairebé immediat.',
        ],
        solution=[
            ('Un color per producte', 'Cada peça té el seu propi color de fons, de manera que la graella es recorda i s\'escaneja d\'un cop d\'ull.'),
            ('Fitxes amb moviment', 'En passar-hi per sobre, les targetes es desplacen i deixen veure millor el producte.'),
            ('Compra en dos passos', 'Carret i pagament, res més: sense registre obligatori.'),
            ('Fàcil de gestionar', 'Un panell senzill per afegir i canviar productes sense tocar codi.'),
        ],
        stats=[(2, '', 'passos per comprar'), (1, '', 'clic per afegir al carret'), (100, '', 'objectiu de rendiment Lighthouse')],
        screen='<div class="screen s4"><div></div><div></div><div></div></div>',
    ),
]

# ----------------------------------------------------------------------------
# PLANTILLA
# ----------------------------------------------------------------------------
HUES = '''<button style="--h:75" data-hue="75" aria-label="Llima"></button>
        <button style="--h:18" data-hue="18" aria-label="Taronja"></button>
        <button style="--h:320" data-hue="320" aria-label="Rosa"></button>
        <button style="--h:265" data-hue="265" aria-label="Violeta"></button>
        <button style="--h:190" data-hue="190" aria-label="Cian"></button>'''


def page(c, nxt):
    url = f'{DOMAIN}/projecte-{c["slug"]}.html'
    img = f'{DOMAIN}/og-{c["slug"]}.png'
    ld = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Inici', 'item': DOMAIN + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Projectes', 'item': DOMAIN + '/#projectes'},
            {'@type': 'ListItem', 'position': 3, 'name': c['title'], 'item': url},
        ],
    }
    tags = ''.join(f'<span>{escape(t)}</span>' for t in c['tags'])
    challenge = ''.join(f'<p>{escape(p)}</p>' for p in c['challenge'])
    sol = ''.join(f'<li><div><b>{escape(t)}</b><span>{escape(d)}</span></div></li>' for t, d in c['solution'])
    stats = ''.join(
        f'<div class="stat reveal" style="--d:{i * .1:.1f}s"><b data-count="{n}"' +
        (f' data-suffix="{escape(suf)}"' if suf else '') + f'>0</b><span>{escape(lab)}</span></div>'
        for i, (n, suf, lab) in enumerate(c['stats']))

    return f'''<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(c['seo_title'])}</title>
  <meta name="description" content="{escape(c['seo_desc'], quote=True)}">
  <meta name="theme-color" content="#0a0a0b">
  <meta name="author" content="Jan Molist">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="{url}">

  <!-- Xarxes socials -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Jan Molist">
  <meta property="og:locale" content="ca_ES">
  <meta property="og:title" content="{escape(c['seo_title'], quote=True)}">
  <meta property="og:description" content="{escape(c['seo_desc'], quote=True)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{escape(c['title'])} · cas de mostra de Jan Molist">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escape(c['seo_title'], quote=True)}">
  <meta name="twitter:description" content="{escape(c['seo_desc'], quote=True)}">
  <meta name="twitter:image" content="{img}">

  <!-- Icones -->
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">

  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>

  <link rel="preload" href="fonts/space-grotesk-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="cases.css">
  <link rel="stylesheet" href="extras.css">

  <noscript>
    <style>
      .reveal{{opacity:1;transform:none}}
    </style>
  </noscript>
</head>

<body class="case-page">

  <!-- (script.js necessita aquests elements) -->
  <div class="loader" aria-hidden="true">
    <div class="loader-inner"><span class="loader-name">Jan Molist</span><span class="loader-num">0</span></div>
    <div class="loader-bar"><i></i></div>
  </div>
  <div class="progress" aria-hidden="true"><i></i></div>
  <div class="cursor" aria-hidden="true"></div>
  <div class="cursor-label" aria-hidden="true"></div>
  <div class="glow" aria-hidden="true"></div>
  <canvas id="bg" aria-hidden="true"></canvas>

  <header class="nav">
    <a href="index.html" class="logo" data-magnetic>JM<span>.</span></a>
    <nav class="links" aria-label="Principal">
      <a href="index.html">Inici</a>
      <a href="index.html#projectes">Projectes</a>
      <a href="index.html#serveis">Serveis</a>
      <a href="index.html#preus">Preus</a>
      <a href="index.html#proces">Procés</a>
      <a href="lab.html" class="nav-lab">Laboratori</a>
      <a href="escenes.html" class="nav-lab">Escenes <sup>nou</sup></a>
    </nav>
    <div class="nav-right">
      <div class="hues" role="group" aria-label="Canvia el color d'accent">
        {HUES}
      </div>
      <a href="index.html#contacte" class="btn btn-sm" data-magnetic>Parlem</a>
    </div>
  </header>

  <main>
    <section class="case-hero">
      <a class="back reveal" href="index.html#projectes" data-magnetic>← Tots els projectes</a>
      <p class="eyebrow reveal">( Cas d'estudi · {c['year']} ) <span class="sample-tag">Cas de mostra</span></p>
      <h1 class="case-title reveal">{c['title_html']}</h1>
      <p class="case-lead reveal">{escape(c['lead'])}</p>
      <div class="case-tags reveal">{tags}</div>
    </section>

    <div class="case-shot">
      <div class="browser" style="view-transition-name:{c['vt']}">
        <div class="bar"><i></i><i></i><i></i><span>{escape(c['url'])}</span></div>
        {c['screen']}
      </div>
    </div>

    <dl class="case-meta reveal">
      <div><dt>Client</dt><dd>{escape(c['client'])}</dd></div>
      <div><dt>Serveis</dt><dd>{escape(c['services'])}</dd></div>
      <div><dt>Any</dt><dd>{c['year']}</dd></div>
      <div><dt>Eines</dt><dd>{escape(c['tools'])}</dd></div>
    </dl>

    <section class="section case-sec">
      <div class="reveal"><p class="eyebrow">( 01 )</p><h2>El <em>repte</em></h2></div>
      <div class="reveal">{challenge}</div>
    </section>

    <section class="section case-sec">
      <div class="reveal"><p class="eyebrow">( 02 )</p><h2>La <em>solució</em></h2></div>
      <ol class="sol-list reveal">{sol}</ol>
    </section>

    <section class="section case-sec" style="padding-bottom:0">
      <div class="reveal"><p class="eyebrow">( 03 )</p><h2>Els <em>resultats</em></h2></div>
      <div class="reveal"><p>Els objectius de disseny que han guiat el projecte:</p></div>
    </section>
    <section class="section stats case-stats">{stats}</section>
    <p class="case-note reveal">{NOTE}</p>

    <section class="section lab-teaser">
      <a class="lab-link reveal" href="projecte-{nxt['slug']}.html" data-cursor="Veure">
        <span class="eyebrow">( Següent projecte )</span>
        <span class="lab-big">{nxt['title_html']} <i>→</i></span>
        <span class="lab-sub">{escape(nxt['lead'])}</span>
      </a>
    </section>

    <section class="section contact" id="contacte">
      <p class="eyebrow reveal">( Contacte )</p>
      <h2 class="contact-title reveal">I el <em>teu</em> projecte?</h2>
      <div class="contact-actions reveal">
        <a class="btn" href="index.html#contacte" data-magnetic>Parlem-ne</a>
        <a class="btn btn-ghost" href="mailto:{EMAIL}" data-magnetic>{EMAIL}</a>
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>© <span id="year">2026</span> Jan Molist</span>
    <span>Fet a mà amb HTML, CSS i JS</span>
    <a href="#" data-magnetic>Tornar a dalt ↑</a>
  </footer>

  <script src="config.js" defer></script>
  <script src="a11y.js" defer></script>
  <script src="script.js" defer></script>
  <script src="extras.js" defer></script>
  <script src="i18n.js" defer></script>
</body>
</html>
'''


def main():
    for i, c in enumerate(CASES):
        nxt = CASES[(i + 1) % len(CASES)]
        (OUT / f'projecte-{c["slug"]}.html').write_text(page(c, nxt), encoding='utf-8')

    urls = [('/', '1.0'), ('/lab.html', '0.7'), ('/escenes.html', '0.7')] + [(f'/projecte-{c["slug"]}.html', '0.8') for c in CASES]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u, p in urls:
        sm.append(f'  <url><loc>{DOMAIN}{u}</loc><lastmod>{LASTMOD}</lastmod><priority>{p}</priority></url>')
    sm.append('</urlset>\n')
    (OUT / 'sitemap.xml').write_text('\n'.join(sm), encoding='utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n', encoding='utf-8')
    print('Generat:', ', '.join(f'projecte-{c["slug"]}.html' for c in CASES), '+ sitemap.xml + robots.txt')


if __name__ == '__main__':
    main()
