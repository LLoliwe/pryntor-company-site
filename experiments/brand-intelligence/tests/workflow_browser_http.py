"""PRY-128 genuine local HTTP Chromium E2E on the exact checked-out candidate.
Zero vendor credentials, no external network, no production release or parity claim.
"""
from __future__ import annotations
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
    server_thread = Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    base = 'http://127.0.0.1:' + str(server.server_port)
    results = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            for width, height in [(1440, 900), (768, 1024), (390, 844), (320, 740)]:
                page = browser.new_page(viewport={'width':width,'height':height}, accept_downloads=True)
                errors = []
                remote_requests = []
                page.on('pageerror', lambda err: errors.append(str(err)))
                page.on('request', lambda req: remote_requests.append(req.url) if not req.url.startswith(base + '/') else None)
                response = page.goto(base + '/workflow.html', wait_until='load', timeout=20000)
                assert response and response.status == 200
                page.locator('button[data-node="brief"]').wait_for(timeout=7000)
                assert page.locator('#nodecount').inner_text().startswith('8 / 64')
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), width
                page.get_by_role('button', name='Run local check').click()
                assert page.locator('#runstatus').inner_text() == 'WAITING_APPROVAL'
                assert 'Output withheld' in page.locator('#notice').inner_text()
                assert page.locator('button[data-node="has_region"] .status').inner_text() == 'SUCCESS'
                assert page.locator('button[data-node="review"] .status').inner_text() == 'WAITING_APPROVAL'
                page.locator('#kind').select_option('transform')
                page.locator('#add').click()
                assert page.locator('#nodecount').inner_text().startswith('9 / 64')
                page.locator('button[data-node="transform_1"]').click()
                page.locator('select[data-property="from"]').select_option('brief')
                assert 'Reads ← brief' in page.locator('button[data-node="transform_1"]').inner_text()
                page.locator('button[data-node="final"]').click()
                page.locator('select[data-property="from"]').select_option('brief')
                assert 'approval' in page.locator('#notice').inner_text().lower()
                assert 'Reads ← review' in page.locator('button[data-node="final"]').inner_text()
                with page.expect_download() as receipt:
                    page.locator('#export').click()
                download = receipt.value
                assert download.suggested_filename == 'pryntor-workflow-draft.json'
                content = Path(download.path()).read_bytes()
                assert b'"graph"' in content and b'"inputs"' in content
                assert b'"approvals"' not in content
                page.locator('#reset').click()
                page.locator('#draftfile').set_input_files({'name':'draft.json','mimeType':'application/json','buffer':content})
                assert 'Validated local draft imported' in page.locator('#notice').inner_text()
                assert page.locator('#nodecount').inner_text().startswith('9 / 64')
                page.locator('#inputs').fill('{}')
                page.locator('#run').click()
                assert page.locator('#runstatus').inner_text() == 'FAILED'
                assert 'No final outputs' in page.locator('#result').inner_text()
                page.locator('#inputs').fill('{"brief":"South Africa"}')
                page.locator('#inputs').press('Control+Enter')
                assert page.locator('#runstatus').inner_text() == 'WAITING_APPROVAL'
                assert not errors, errors
                assert not remote_requests, remote_requests
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), width
                results.append(width)
                page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print('PRY-128 LOCAL HTTP CHROMIUM E2E PASS at widths: ' + ', '.join(map(str,results)))
    print('No reference-system access, model inference, physical Safari, or full functional parity tested.')

if __name__ == '__main__':
    main()
