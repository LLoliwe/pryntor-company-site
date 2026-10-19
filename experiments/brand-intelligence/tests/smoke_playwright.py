# Local Chromium smoke check (optional, not run by CI)
# pip install playwright; install/use Chromium separately
from pathlib import Path
from playwright.sync_api import sync_playwright

html = (Path(__file__).resolve().parents[1] / "index.html").read_text()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for w, h in [(1440, 900), (768, 1100), (390, 844), (350, 740)]:
        context = browser.new_context(viewport={"width": w, "height": h}, accept_downloads=True)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content(html, wait_until="load")
        assert page.locator("main h1").count() == 1
        assert page.evaluate("document.documentElement.scrollWidth") <= w + 1
        nav = "#mobile-nav" if w <= 840 else ".sidebar"
        page.locator(f'{nav} [data-nav="personas"]').click()
        page.get_by_role("button", name="+ Create persona").click()
        page.locator("#p-name").fill("Test persona")
        page.locator("#p-market").fill("Brazil")
        page.locator("#p-lang").fill("Portuguese")
        page.locator("#p-intent").fill("Comparing alternatives")
        page.get_by_role("button", name="Save persona").click()
        assert page.locator(".persona-card").count() == 5
        page.locator(f'{nav} [data-nav="discovery"]').click()
        page.locator("[data-brief]").first.click()
        assert page.locator(".brief").count() == 1
        page.locator(f'{nav} [data-nav="guard"]').click()
        page.locator("#guard-persona").fill("3")
        page.locator("#guard-country").fill("2")
        assert page.locator("#bill-output").inner_text() == "6"
        page.locator("#guard-model").select_option("2")
        assert page.locator("#bill-output").inner_text() == "12"
        assert not errors, errors
        print(f"PASS: {w}px")
        context.close()
    browser.close()
