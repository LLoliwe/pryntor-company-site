# Pryntor website agent-readiness R0 (review only)

## Scope and evidence, 21 October 2026

Source: LLoliwe/pryntor-company-site, stacked on draft site-compliance PR #2. Domain: https://pryntor.co.za/. No public deployment or customer onboarding is authorized by this branch.

The live domain could not be reliably fetched by the available web checks. Therefore **Ora baseline score, grade, topFixes and post-fix delta are NOT VERIFIED**. Do not claim an uplift until the exact approved build is live and scanned by Ora. Its publicly documented endpoints are GET https://ora.ai/api/score/{domain} and POST https://ora.ai/api/scan?format=audit; use the score cache first, respect rates, and never force a refresh before a deployed fix.

## Changes

- Server-visible, human-readable business explanation beneath the existing interactive art, preserving the main layout, local guide and privacy-oriented client behaviour.
- Honest search metadata, canonical homepage, Markdown alternate, Open Graph title/description and JSON-LD Organization without invented legal registration, partners or certifications.
- Plain-text llms.txt and index.md, sitemap.xml and permissive robots.txt for **public static content only**.
- First-party about.html with public trust and contact text, plus canonical URLs for the drafted privacy/terms pages.
- Offline Node tests to catch mismatched links, broken discovery and false APIs before public deployment.

## Verification

Run `node --test tests/site.test.mjs tests/agent-ready.test.mjs`. Existing browser tests remain required for responsive, keyboard and local assistant flows. Check actual deployed HTTPS status codes and Content-Type (llms.txt = text/plain, index.md = text/markdown or text/plain readable Markdown, sitemap.xml = XML). A 200 that serves the HTML SPA fallback at any of these paths is NOT a pass. Run curl tests on /, /about.html, /privacy.html, /terms.html, /llms.txt, /index.md, /sitemap.xml, and /robots.txt. Inspect canonical host and redirect chain.

Only after launch approval and observed live fetch should Ora issue an actual baseline/after score, and topFixes should be implemented in returned rank order. Avoid overfitting to scanner checks where no real APIs or machine payments exist. An informational corporate site should not invent MCP, OAuth, an OpenAPI service or payment endpoints merely to raise a number.

## Blocking approvals

Human review of privacy/terms; legal entity and domain control; verified mailbox; independent accessibility and mobile browser QA; approved deployment at R0 cost, strict spend controls and no auto-renewals; founder launch approval. No merge, deployment, paid services, API exposure, automated outreach or promotion implied. Draft legal notices do not establish POPIA compliance.
