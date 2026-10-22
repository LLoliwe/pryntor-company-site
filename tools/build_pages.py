#!/usr/bin/env python3
"""Builds the static Pryntor pages from one shared shell. Run: python3 tools/build_pages.py
No dependencies. Output is plain HTML committed to the repo."""
import base64, hashlib, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ((ROOT / "assets/css/tokens.css").read_text().strip() + "\n" + (ROOT / "assets/css/site.css").read_text().strip()).replace("url(../fonts/", "url(assets/fonts/")
CSS_HASH = "sha256-" + base64.b64encode(hashlib.sha256(CSS.encode()).digest()).decode()
CSP = ("default-src 'none'; script-src 'self'; style-src '" + CSS_HASH + "'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'self' https://your-project-ref.supabase.co; manifest-src 'self'; media-src 'none'; frame-src 'none'; "
       "object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests")
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' "
        "fill='%231637F3'/%3E%3Crect x='7' y='22' width='18' height='3' fill='%23FFD626'/%3E%3C/svg%3E")
ORG = {"@context":"https://schema.org","@type":"Organization","name":"Pryntor","url":"https://pryntor.co.za/",
  "logo":"https://pryntor.co.za/assets/img/pryntor-wordmark-black.png",
  "description":"Independent Durban-based technology venture exploring software, learning tools, AI evaluation and creative technology.",
  "email":"hello@pryntor.co.za","contactPoint":[
    {"@type":"ContactPoint","contactType":"general enquiries","email":"hello@pryntor.co.za"},
    {"@type":"ContactPoint","contactType":"partnerships","email":"partnerships@pryntor.co.za"}],
  "address":{"@type":"PostalAddress","addressLocality":"Durban","addressRegion":"KwaZulu-Natal","addressCountry":"ZA"}}

NAV = [("Work","work"),("Method","method"),("Ventures","ventures"),("Early list","join"),("Contact","contact")]

def href(target, home):
    if target == "method": return "method.html"
    return ("#" if home else "index.html#") + target

def head(title, desc, canonical, home=False, extra=""):
    ld = json.dumps(ORG, separators=(",",":")) if home else None
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<!-- WAITLIST CONFIG: replace your-project-ref in the CSP connect source once the founder-approved Supabase project exists. -->
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#1637F3">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pryntor">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary">
<link rel="canonical" href="{canonical}">
<link rel="alternate" type="text/markdown" href="index.md" title="Pryntor in Markdown">
<link rel="icon" href="{ICON}">
<link rel="preload" href="assets/fonts/InterDisplay-Bold.woff2" as="font" type="font/woff2" crossorigin>
<style>{CSS}</style>
{f'<script type="application/ld+json">{ld}</script>' if ld else ''}{extra}
</head>"""

def header(home, current=None):
    links = "".join(f'<a href="{href(t,home)}"{" aria-current=\"page\"" if t==current else ""}>{n}</a>' for n,t in NAV)
    mlinks = "".join(f'<a href="{href(t,home)}">{n}<span>0{i+1}</span></a>' for i,(n,t) in enumerate(NAV))
    homeh = "#main" if home else "index.html"
    return f"""<a class="skip" href="#main">Skip to content</a>
<div class="rail" aria-hidden="true"></div>
<header class="top">
<div class="wrap">
<a class="home" href="{homeh}" aria-label="Pryntor home"><img class="wm" src="assets/img/pryntor-wordmark-white-264.webp" alt="PRYNTOR" width="264" height="48"></a>
<nav class="nav" aria-label="Main">{links}</nav>
<div class="ctrls">
<button class="chip" id="motion-toggle" data-motion-toggle type="button" aria-pressed="true">Motion on</button>
<button class="chip" id="sound-toggle" data-sound-toggle type="button" aria-pressed="false">Sound off</button>
<button class="chip menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu">Menu</button>
</div>
</div>
</header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Site menu" hidden>
<button class="chip close" id="menu-close" type="button">Close</button>
<nav aria-label="Mobile">{mlinks}</nav>
<div class="chips"><button class="chip" data-motion-toggle type="button" aria-pressed="true">Motion on</button><button class="chip" data-sound-toggle type="button" aria-pressed="false">Sound off</button></div>
</div>"""

LEGAL = "Pryntor (Pty) Ltd · Registration number 2025/946025/07 · Registered address: [REGISTERED ADDRESS - founder to confirm]"

def footer(home):
    h = lambda t: href(t, home)
    return f"""<footer>
<div class="foot">
<div><img src="assets/img/pryntor-wordmark-black-264.webp" alt="PRYNTOR" width="264" height="48" loading="lazy"><p>Make it move. An independent technology venture in Durban, South Africa.</p></div>
<div><h2>Site</h2><ul><li><a href="{h('work')}">Work</a></li><li><a href="method.html">Method</a></li><li><a href="{h('ventures')}">Ventures</a></li><li><a href="{h('join')}">Early list</a></li></ul></div>
<div><h2>Company</h2><ul><li><a href="about.html">About</a></li><li><a href="{h('contact')}">Contact</a></li><li><a href="mailto:hello@pryntor.co.za">hello@pryntor.co.za</a></li></ul></div>
<div><h2>Legal</h2><ul><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li><li><a href="llms.txt">llms.txt</a></li></ul></div>
</div>
<div class="legal"><p>{LEGAL}</p><p>&copy; 2026 Pryntor</p></div>
</footer>"""

def page(name, title, desc, canonical, main, home=False, current=None, scripts=("site.js",), robots=""):
    js = "".join(f'\n<script src="assets/js/{s}" defer></script>' for s in scripts)
    html = f"""{head(title, desc, canonical, home, robots)}
<body data-motion="paused">
{header(home, current)}
<main id="main" tabindex="-1">
{main}
</main>
{SUMMARY if home else ''}
{footer(home)}{js}
</body>
</html>
"""
    assert "\u2014" not in html, name + " has an em dash"
    (ROOT / name).write_text(html)

SUMMARY = """<section class="agent-summary" aria-labelledby="pryntor-overview-title"><h2 id="pryntor-overview-title">What Pryntor does</h2><div><p>Pryntor is an independent technology venture based in Durban, South Africa. We explore software, learning tools, original creative experiences, AI evaluation and robotics simulation. These projects include early research and prototypes, not a catalogue of products cleared for commercial release. We aim to explain limitations honestly, test failures, and invite independent scrutiny before describing work as ready. This site offers information and contact by email, not customer accounts, automated purchasing or a public integration API.</p><div class="links"><a href="about.html">About our work</a><a href="method.html">Our method</a><a href="privacy.html">Privacy notice</a><a href="terms.html">Site terms</a><a href="mailto:hello@pryntor.co.za">Contact Pryntor</a></div></div></section>"""

STAGES = [
 ("change","01","Change","Build the real thing.","We start from one clear problem and make an original working prototype, not a slide about one.",
  "A working build you can use, with the date and version it was made.","That a prototype is a product, or that it is released."),
 ("test","02","Test","Try to break it first.","We look for the ways it fails before anyone else has to: edge cases, accessibility, privacy and misuse.",
  "What was tested, how, and what failed.","That passing our own tests means it is safe or approved."),
 ("prove","03","Prove","Show the evidence.","Results ship with their evidence and the limits written beside them, so an outsider can check the claim.",
  "The evidence and its limits, side by side.","Numbers, customers or outcomes we cannot show."),
 ("keep","04","Keep","Keep the failures.","Every negative result is logged, dated and kept. It is how the next version earns trust.",
  "A dated record of what did not work.","That earlier failures never happened."),
]

def diagram():
    xs=[40,340,640,940]
    nodes="".join(f'<circle cx="{x}" cy="40" r="6" data-step="{k}"{" class=\"on\"" if i==0 else ""}/><text x="{x}" y="84" text-anchor="middle" data-step="{k}"{" class=\"on\"" if i==0 else ""}>{w}</text>' for i,(x,(k,n,w,*_)) in enumerate(zip(xs,STAGES)))
    return f'<svg class="pc fade" id="pc" viewBox="0 0 980 100" role="img" aria-label="The proof chain: change, then test, then prove, then keep. Selected: Change." xmlns="http://www.w3.org/2000/svg"><path class="hair" d="M40 40H940"/><path class="draw" pathLength="1000" d="M40 40H940"/>{nodes}</svg>'

def tabs():
    t = "".join(f'<button class="tab" role="tab" id="tab-{k}" aria-controls="panel-{k}" aria-selected="{"true" if i==0 else "false"}" tabindex="{0 if i==0 else -1}" type="button"><span class="n">{n}</span><span class="w">{w}</span></button>' for i,(k,n,w,*_) in enumerate(STAGES))
    p = "".join(f'<div class="panel" role="tabpanel" id="panel-{k}" aria-labelledby="tab-{k}" tabindex="0"{"" if i==0 else " hidden"}><h3>{h}</h3><dl><dt>What we do</dt><dd>{a}</dd><dt>What comes with a result</dt><dd>{b}</dd><dt>What we will not claim</dt><dd>{c}</dd></dl></div>' for i,(k,n,w,h,a,b,c) in enumerate(STAGES))
    return f'<div class="tabs fade"><div class="tablist" role="tablist" aria-label="The proof chain" aria-orientation="vertical">{t}</div><div>{p}</div></div>'

AREAS = [
 ("Software and web experiences","Original products and interfaces, explored early and built to be used.","Early-stage exploration, not released products."),
 ("Learning tools","Education and teaching tools designed with care for learners.","No accreditation or measured student outcomes are claimed."),
 ("AI evaluation","Reasoning and evaluation research that looks hard at where systems fail.","Prototypes are not independently approved production systems."),
 ("Creative technology","Original visual storytelling and new ways of making it.","Original work only, with rights checked before release."),
 ("Robotics simulation","Emerging systems explored safely in simulation first.","Simulated behaviour is not deployed or safety-certified hardware."),
]

def home():
    chain = "".join(f'<li><a href="method.html#{k}"><span class="n">{n}</span><span class="w">{w}</span></a></li>' for k,n,w,*_ in STAGES)
    rows = "".join(f'<div class="row"><span class="n">0{i+1}</span><h3>{a}</h3><p>{b}<span class="lim">{c}</span></p></div>' for i,(a,b,c) in enumerate(AREAS))
    gates = [("01","Rights cleared","Every name, image, sound and line of code is original or properly licensed."),
             ("02","Privacy and safety reviewed","POPIA, data handling and misuse are checked before anyone is asked to trust it."),
             ("03","Accessible","Usable by keyboard and screen reader, readable at every size."),
             ("04","Independently checked","Someone who did not build it tries it, and the result is recorded.")]
    vc = "".join(f'<div class="vcell"><h3><span class="gn" aria-hidden="true">{a}</span>{b}</h3><p>{c}</p></div>' for a,b,c in gates)
    LED=[("Software and web experiences","Working prototypes and this website, built with automated browser tests.","Released products or paying customers.","Prototype","proto"),
         ("Learning tools","Early teaching and learning prototypes in internal testing.","Accreditation or measured learner outcomes.","Prototype","proto"),
         ("AI evaluation","Research into where reasoning systems fail, with failures logged and dated.","Approved production systems or third-party validation.","Research","res"),
         ("Creative technology","Original visual and story work, rights checked before any release.","Licensed IP we do not own.","Research","res"),
         ("Robotics simulation","Control experiments in simulation, including recorded failures.","Deployed or safety-certified hardware.","Simulation only","res")]
    ledger="".join(f'<div class="lrow" role="row"><div role="cell"><h3>{a}</h3></div><div role="cell"><span class="k">What exists</span><p>{b}</p></div><div role="cell"><span class="k">Not claimed</span><p>{c}</p></div><div role="cell"><span class="st {k}">{s}</span></div></div>' for a,b,c,s,k in LED)
    strip = "".join(f"<li>{s}</li>" for s in ["Evidence beside every claim","Limits written down","Failures kept and dated","Independent checks before release"])
    main = f"""<section class="ch full cobalt hero" id="top" aria-labelledby="h-hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<img class="hero-mark" src="assets/img/pryntor-wordmark-white.png" alt="" width="1600" height="290" fetchpriority="high">
<h1 id="h-hero" class="kin" aria-label="Make it move."><span class="k" aria-hidden="true"><span>Make</span></span> <span class="k" aria-hidden="true"><span>it</span></span> <span class="k k-move" aria-hidden="true"><span>move<span class="dot">.</span></span></span></h1>
<div class="hero-stage">
<picture class="mascot hero-mascot"><source type="image/avif" srcset="assets/img/pryntor-mascot-480.avif 480w, assets/img/pryntor-mascot-960.avif 960w" sizes="(min-width:760px) 32vw, 70vw"><source type="image/webp" srcset="assets/img/pryntor-mascot-480.webp 480w, assets/img/pryntor-mascot-960.webp 960w" sizes="(min-width:760px) 32vw, 70vw"><img src="assets/img/pryntor-mascot-480.webp" alt="The Pryntor character: an orange-red block on two legs, mid-stride, carrying a cobalt block in its mouth" width="480" height="360" fetchpriority="high"></picture>
<div class="hero-aside">
<p class="lede">An independent Durban technology company. We build software, learning tools, AI evaluation and creative technology, and every claim ships with its evidence and its limits.</p>
<div class="actions"><a class="btn solid" href="#join">Work with us or join the list <span aria-hidden="true">&#8595;</span></a><a class="btn" href="#ventures">See what is real today</a></div>
</div>
</div>
</div>
<ol class="chain" aria-label="The proof chain">{chain}</ol>
<div class="hero-foot"><span class="meta">Pryntor (Pty) Ltd · Durban, South Africa</span><span class="meta">Early access · Opening soon</span></div>
</div>
</section>

<section class="ch light" id="work" aria-labelledby="h-work">
<div class="wrap">
<div class="sh">
<h2 id="h-work"><span class="line"><span>Five areas.</span></span><span class="line"><span class="accent">One standard.</span></span></h2>
<p class="label fade">02 / What we do</p>
</div>
<p class="lede fade">Each area is held to the same rule: say what it does, say what it does not do yet.</p>
<div class="rows fade">{rows}</div>
</div>
</section>

<section class="ch dark" id="method" aria-labelledby="h-method">
<div class="wrap">
<div class="sh">
<h2 id="h-method"><span class="line"><span>No theatre.</span></span><span class="line"><span class="accent">Only checkable outcomes.</span></span></h2>
<p class="label fade">03 / The proof chain</p>
</div>
{diagram()}
{tabs()}
<div class="actions fade"><a class="btn" href="method.html">Read the full method <span aria-hidden="true">&#8594;</span></a></div>
</div>
</section>

<section class="ch light" id="ventures" aria-labelledby="h-ventures">
<div class="wrap">
<div class="sh">
<h2 id="h-ventures"><span class="line"><span>What is real.</span></span><span class="line"><span class="accent">What is not yet.</span></span></h2>
<p class="label fade">04 / Capability ledger</p>
</div>
<p class="lede fade">Every capability below is stated at its true stage. Ventures are named here only after they clear four gates: rights, privacy and safety, accessibility and an independent check. None has been released publicly yet.</p>
<div class="ledger fade" role="table" aria-label="Pryntor capability ledger"><div class="lrow head" role="row"><span role="columnheader">Capability</span><span role="columnheader">What exists</span><span role="columnheader">What we do not claim</span><span role="columnheader">Stage</span></div>{ledger}</div>
<div class="actions fade"><a class="btn" href="method.html">How a claim gets checked <span aria-hidden="true">&#8594;</span></a></div>
</div>
</section>

<section class="ch dark" id="failures" aria-labelledby="h-fail">
<div class="wrap">
<div class="sh">
<h2 id="h-fail" class="big"><span class="line"><span>We keep</span></span><span class="line"><span class="accent">the failures.</span></span></h2>
<p class="label fade">05 / What we keep</p>
</div>
<p class="lede fade">Every negative result is logged, dated and kept. It is how the next version earns trust.</p>
<ul class="principles fade" aria-label="Principles">{strip}</ul>
</div>
</section>

<section class="ch cobalt join" id="join" aria-labelledby="h-join">
<div class="wrap">
<div class="sh">
<h2 id="h-join"><span class="line"><span>Two perspectives.</span></span><span class="line"><span>One better answer<span class="dot">.</span></span></span></h2>
<p class="label fade">06 / Work with us</p>
</div>
<div class="doors fade">
<div class="door"><h3>Partner on a problem</h3><p class="meta">For organisations</p><p>Bring a hard question. We bring original test cases, reproducible failures and honest engineering.</p><ul><li>Research partnerships</li><li>Pilot builds with written limits</li><li>Independent review of our work</li></ul><a class="btn solid" href="mailto:partnerships@pryntor.co.za?subject=Partnership%20enquiry&amp;body=Organisation%3A%0AThe%20problem%3A%0ATimeline%3A%0AHow%20you%20would%20judge%20success%3A">Start a partner brief <span aria-hidden="true">&#8594;</span></a></div>
<div class="door"><h3>Join the early list</h3><p class="meta">For people</p><p>One email when there is something real to show. No tracking, no selling your details.</p><a class="btn" href="#wl">Hold my place below <span aria-hidden="true">&#8595;</span></a></div>
</div>
<div class="card join-card">
<picture class="mascot join-mascot"><source type="image/avif" srcset="assets/img/pryntor-mascot-480.avif 480w, assets/img/pryntor-mascot-960.avif 960w" sizes="(min-width:1000px) 30vw, 70vw"><source type="image/webp" srcset="assets/img/pryntor-mascot-480.webp 480w, assets/img/pryntor-mascot-960.webp 960w" sizes="(min-width:1000px) 30vw, 70vw"><img src="assets/img/pryntor-mascot-480.webp" alt="The Pryntor character: an orange-red block on two legs, mid-stride, carrying a cobalt block in its mouth" width="480" height="360" loading="lazy"></picture>
<div id="before">
<p class="lede fade">One email when there is something real to show. Bring a friend and move up the list.</p>
<form id="wl" class="fade" novalidate aria-describedby="wl-fine">
<div class="field">
<label class="sr" for="email">Email address</label>
<input id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@company.co.za" required aria-describedby="err">
<button class="cta" type="submit">Hold my place <span class="arr" aria-hidden="true">&#8594;</span></button>
</div>
<label class="consent"><input id="consent" type="checkbox" required aria-describedby="err"> <span>I agree that Pryntor (Pty) Ltd may store my email to tell me about its launch, as described in the <a href="privacy.html">privacy notice</a>. POPIA applies.</span></label>
<p class="err" id="err" role="alert"></p>
<p class="fine" id="wl-fine">Unsubscribe any time with the link in every email, or by writing to <a href="mailto:hello@pryntor.co.za?subject=Unsubscribe">hello@pryntor.co.za</a>. We never sell or share your details.</p>
</form>
</div>
<div id="after" aria-live="polite" tabindex="-1">
<div class="ticket">
<p class="label">Held. Your place</p>
<p class="pos" id="pos">On the list</p>
<p class="fine" id="pos-note">Each friend who joins with your link moves you up.</p>
<div class="ref">
<label class="sr" for="reflink">Your referral link</label>
<input id="reflink" readonly value="https://pryntor.co.za/">
<button class="ghost" id="copy" type="button">Copy link</button>
<button class="ghost" id="share" type="button">Share</button>
</div>
<p class="sr" id="copy-status" role="status"></p>
<p class="fine" id="mailto-note" hidden>Our list service is not switched on yet. To be counted now, <a id="mailto-link" href="mailto:hello@pryntor.co.za?subject=Pryntor%20early%20list">send us a one-line email</a>.</p>
</div>
</div>
</div>
</div>
</section>

<section class="ch dark" id="contact" aria-labelledby="h-contact">
<div class="wrap">
<div class="sh">
<h2 id="h-contact"><span class="line"><span>Talk to</span></span><span class="line"><span class="accent">a person.</span></span></h2>
<p class="label fade">07 / Contact</p>
</div>
<div class="contacts fade">
<a class="contact" href="mailto:hello@pryntor.co.za"><span class="who">General and privacy</span><span class="addr">hello@pryntor.co.za</span></a>
<a class="contact" href="mailto:partnerships@pryntor.co.za"><span class="who">Partnerships and research</span><span class="addr">partnerships@pryntor.co.za</span></a>
<a class="contact" href="mailto:operations@pryntor.co.za"><span class="who">Operations and accessibility</span><span class="addr">operations@pryntor.co.za</span></a>
</div>
<p class="lede fade">Email opens in your own mail app. Nothing is sent until you press send.</p>
</div>
</section>"""
    page("index.html","PRYNTOR | Make it move.",
         "Pryntor is an independent Durban technology venture exploring software, learning tools, AI evaluation, creative technology and robotics simulation. Join the early list.",
         "https://pryntor.co.za/", main, home=True, scripts=("config.js","site.js","waitlist.js"))

def method():
    steps = "".join(f'<li id="{k}"><h2><span>{n} / {w}</span>{h}</h2><div><p>{a}</p><p><strong>What comes with a result.</strong> {b}</p><p><strong>What we will not claim.</strong> {c}</p></div></li>' for k,n,w,h,a,b,c in STAGES)
    main = f"""<section class="ch dark page page-hero" aria-labelledby="h-page">
<div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> / Method</nav>
<h1 id="h-page">Four links.<br><span class="accent">No skipped steps.</span></h1>
<p class="lede">How Pryntor turns an idea into something you can check. Every link has to hold before the next one is claimed.</p>
<ol class="steps">{steps}</ol>
</div>
</section>
<section class="ch light" aria-labelledby="h-challenge">
<div class="wrap">
<div class="sh">
<h2 id="h-challenge">Found a weak link?<br><span class="accent">Tell us.</span></h2>
<p class="label">Challenge a claim</p>
</div>
<p class="lede">If something we say does not hold up, we want to know. We will check it, answer you and record the result.</p>
<div class="actions"><a class="btn" href="mailto:hello@pryntor.co.za?subject=Challenge%20a%20claim">Email hello@pryntor.co.za</a><a class="btn" href="index.html#join">Join the early list</a></div>
</div>
</section>"""
    page("method.html","The proof chain | Pryntor","How Pryntor works: change, test, prove and keep the failures. Every claim comes with its evidence and its limits.",
         "https://pryntor.co.za/method.html", main, current="method")

def prose_page(name, title, desc, canonical, label, h1, body, robots=""):
    main = f"""<section class="ch dark page page-hero" aria-labelledby="h-page">
<div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a> / {label}</nav>
<h1 id="h-page">{h1}</h1>
<div class="prose">{body}</div>
</div>
</section>"""
    page(name, title, desc, canonical, main, robots=robots)

ABOUT = """<p class="lede">Pryntor is an independent technology venture based in Durban, South Africa. We explore software, learning tools, original creative experiences, AI evaluation and robotics simulation. These projects include early research and prototypes, not a catalogue of products cleared for commercial release. We aim to explain limitations honestly, test failures, and invite independent scrutiny before describing work as ready. This site offers information and contact by email, not customer accounts, automated purchasing or a public integration API.</p>
<h2>What we work on</h2><p>Our areas of exploration include original software and web experiences, educational products and teaching tools, AI evaluation and reasoning research, visual storytelling, and robotics simulation. We distinguish engineering demonstrations from validated hardware, learner outcomes, commercial services and public products. The current website is an introduction to this work rather than an order form or a promise of a release date.</p>
<h2>How we work</h2><p>We look for a clear user problem, create an original prototype, inspect the mechanisms behind successful reference work, and test where our ideas fail. Independent expertise, accessibility, privacy and proper source attribution matter. Tests or visually compelling demonstrations alone do not establish that a product is safe, released or independently approved. Read <a href="method.html">the proof chain</a> for the detail.</p>
<h2>Contact and trust</h2><p>For a general question, research conversation or possible collaboration, contact <a href="mailto:hello@pryntor.co.za">hello@pryntor.co.za</a>. The site does not accept accounts, payments, direct bookings, uploaded private records or developer API requests. It has no chat assistant, analytics, cookies or third-party requests. Canonical address: https://pryntor.co.za/</p>"""

PRIVACY = """<p>Updated 22 October 2026. Canonical address: https://pryntor.co.za/privacy.html</p>
<h2>Contact</h2><p>This website has no account or checkout. Its only form is the optional early list described below. If you email us, we receive the information you choose to send. For privacy questions, email <a href="mailto:hello@pryntor.co.za?subject=Privacy%20request">hello@pryntor.co.za</a>.</p>
<h2>Website data</h2><p>The site sets no cookies, runs no analytics and makes no requests to other companies. Fonts and images are served from our own domain. The optional sound and motion controls work inside your browser and are not stored. Hosting providers may process technical logs required to operate and secure the site.</p>
<h2>Your choices</h2><p>Do not send passwords, financial information, children's information or other sensitive data by ordinary email. You may ask about access, correction or deletion of personal information, subject to applicable law and identity verification.</p>
<h2>POPIA notice</h2>
<p>Pryntor (Pty) Ltd (registration number 2025/946025/07) is the responsible party for personal information collected through this website, as defined in the Protection of Personal Information Act 4 of 2013 (POPIA).</p>
<p>Information Officer: [INFORMATION OFFICER NAME - founder to confirm]. Contact: <a href="mailto:hello@pryntor.co.za?subject=POPIA%20request">hello@pryntor.co.za</a>. Registered address: [REGISTERED ADDRESS - founder to confirm].</p>
<h2>What we collect and why</h2>
<p>We only process the information you choose to send us by email, such as your name, email address and message. We use it to reply to you, to keep a record of the conversation and, if you ask, to tell you when we launch. We do not sell personal information or use it for automated decisions.</p>
<h2 id="early-list">Early list</h2>
<p>If you join the early list on our homepage and tick the consent box, we store your email address, the date you joined, a referral code and who referred you, so we can show your place in line and email you about our launch. Until our list service is switched on, joining works by sending us an email instead. The list is held with our database provider, Supabase, under its data processing terms, and may be stored outside South Africa with appropriate safeguards. We keep it until launch communications end or you unsubscribe. You can unsubscribe at any time with the link in every email or by writing to <a href="mailto:hello@pryntor.co.za?subject=Unsubscribe">hello@pryntor.co.za</a>.</p>
<h2>Your rights</h2>
<p>Under POPIA you may ask whether we hold your personal information, request access to it, ask us to correct or delete it, object to its processing, and withdraw consent you gave earlier. Email us and we will respond within a reasonable time after verifying your identity.</p>
<h2>Complaints</h2>
<p>If you believe your personal information has been mishandled, please tell us first so we can fix it. You also have the right to complain to the Information Regulator (South Africa): <a href="https://inforegulator.org.za/">inforegulator.org.za</a>, <a href="mailto:POPIAComplaints@inforegulator.org.za">POPIAComplaints@inforegulator.org.za</a>, Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg, 2191.</p>"""

TERMS = """<p>Updated 22 October 2026. Canonical address: https://pryntor.co.za/terms.html</p>
<h2>Informational site</h2><p>This website introduces Pryntor. It is not an online store, quotation or offer to contract. Products and research may change before release.</p>
<h2>Early list</h2><p>Joining the early list does not create a contract, reserve a product or promise a release date. See the <a href="privacy.html">privacy notice</a> for how your email is handled.</p>
<h2>Rights</h2><p>Pryntor's original name, writing, software and visual work may be protected by law. Third-party and open-source materials, including the Inter typeface under the SIL Open Font License, remain subject to their own licences and rights.</p>
<h2>Contact</h2><p>For questions, accessibility feedback or rights concerns, email <a href="mailto:hello@pryntor.co.za?subject=Pryntor%20site%20enquiry">hello@pryntor.co.za</a>.</p>"""

NOTFOUND = """<p class="lede">That page is not here. It may have moved, or it was never published.</p><div class="actions"><a class="btn solid" href="index.html">Back to the homepage</a><a class="btn" href="method.html">The proof chain</a></div>"""

ASCII = r"""
 ___  ___  __   __ _  _  _____  ___   ___
| _ \| _ \ \ \ / /| \| ||_   _|/ _ \ | _ \
|  _/|   /  \ V / | .` |  | | | (_) ||   /
|_|  |_|_\   |_|  |_|\_|  |_|  \___/ |_|_\
"""
def notfound():
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'">
<meta name="robots" content="noindex">
<title>Not found | Pryntor</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body class="nf">
<main id="main" class="wrap">
<pre aria-hidden="true">{ASCII.strip(chr(10))}</pre>
<h1>Broken link.<br><span class="accent">Not a broken chain.</span></h1>
<p class="lede">That page is not here. It may have moved, or it was never published.</p>
<div class="actions"><a class="btn solid" href="/">Back to the homepage</a><a class="btn" href="/method.html">The proof chain</a></div>
</main>
</body>
</html>
"""
    (ROOT/"404.html").write_text(html)

if __name__ == "__main__":
    home(); method()
    prose_page("about.html","About Pryntor | Independent technology and research","About Pryntor's independent software, education and creative technology practice in Durban, South Africa.","https://pryntor.co.za/about.html","About","Useful technology,<br><span class=\"accent\">tested with care.</span>",ABOUT)
    prose_page("privacy.html","Privacy | Pryntor","How the Pryntor website handles data, the early list and POPIA requests.","https://pryntor.co.za/privacy.html","Legal / Privacy","Privacy",PRIVACY)
    prose_page("terms.html","Terms | Pryntor","Terms for Pryntor's informational website and early list.","https://pryntor.co.za/terms.html","Legal / Terms","Terms",TERMS)
    notfound()
    if False: prose_page("404.html","Not found | Pryntor","This page could not be found.","https://pryntor.co.za/404.html","Error 404","Broken link.<br><span class=\"accent\">Not a broken chain.</span>",NOTFOUND,robots="\n<meta name=\"robots\" content=\"noindex\">")
    print("built")
