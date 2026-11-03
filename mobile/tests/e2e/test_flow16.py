import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Corrections round (27 Oct 2026): leaf files, folder list, back buttons, no To review tab, permissions, AI summary,
# typed metadata form (date / number / master cascade / unique values / read-only / table), required marks, drafts.
M.REPOS.append({'id': 'repo-hr', 'name': 'Human Resources Department Employee Appointment and Offer Letters Archive', 'description': 'Long description', 'fileCount': 0, 'storageProviderName': 'EZOFIS Storage'})
M.REPOS[:] = [r for i, r in enumerate(M.REPOS) if not (r['id'] == 'repo-hr' and i < len(M.REPOS) - 1)]
def calls(p): return [c for c in M.STATE['calls'] if c[1].startswith(p)]
async def text(pg, sel='.main'): return await pg.inner_text(sel)
async def open_file(pg, repo, name):
    await pg.goto(URL + '#/app/folders'); await pg.wait_for_timeout(300)
    await pg.goto(URL + f'#/app/folders/r/{repo}?tab=files'); await pg.wait_for_timeout(1000)
    await pg.click(f'.file-row:has-text("{name}")'); await pg.wait_for_timeout(1500)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':780}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        # 2, 3 folder list: short names, no description, no storage
        await pg.goto(URL+'#/app/folders'); await pg.reload(); await pg.wait_for_timeout(1000)
        t=await text(pg)
        trunc=await pg.evaluate("(()=>{const e=[...document.querySelectorAll('.repo-n')].find(x=>x.textContent.startsWith('Human')); return !!e && e.scrollWidth>e.clientWidth && getComputedStyle(e).textOverflow==='ellipsis'})()")
        print('#2 long name truncated:', trunc, '| no description:', 'Supplier invoices and POs' not in t and 'Long description' not in t, '| #3 no storage:', 'EZOFIS Storage' not in t)
        await pg.screenshot(path=OUT+'fix-folders.png')
        # 4 back buttons on top-level pages
        for u in ('#/app/folders', '#/app/inbox', '#/app/settings'):
            await pg.goto(URL+u); await pg.wait_for_timeout(700)
            has=await pg.locator('.topbar button[aria-label="Back"]').count()
            box=await pg.locator('.topbar button[aria-label="Back"]').first.bounding_box() if has else None
            print('#4 back on', u, has == 1, bool(box and box['x'] < 40))
        print('#4 opened directly → back goes Home:', await pg.click('.topbar button[aria-label="Back"]') or (await pg.wait_for_timeout(500)) or pg.url.endswith('#/app/home'))
        await pg.click('.bottomnav .tab:has-text("Inbox")'); await pg.wait_for_timeout(500); await pg.click('.bottomnav .tab:has-text("Folders")'); await pg.wait_for_timeout(500)
        await pg.click('.topbar button[aria-label="Back"]'); await pg.wait_for_timeout(500); print('#4 back returns to previous screen:', pg.url.endswith('#/app/inbox'))
        # 5 no To review tab; 1 last folder lists files (server: isLeafLevel only after every level is picked)
        await pg.goto(URL+'#/app/folders/r/repo-ap'); await pg.wait_for_timeout(1000)
        tabs=[await x.inner_text() for x in await pg.locator('[role=tab]').all()]
        print('#5 tabs:', tabs)
        await pg.click('.chip.path-chip'); await pg.click('.sheet .opt:has-text("Document Type → Supplier")'); await pg.wait_for_timeout(800)
        await pg.click('.group-row:has-text("Purchase Order")'); await pg.wait_for_timeout(800)
        await pg.click('.group-row:has-text("Nexus")'); await pg.wait_for_timeout(900)
        print('#1 files at last folder:', await pg.locator('.file-row').count(), M.STATE['itemQueries'][-1]['filters'], 'No subfolders' not in await text(pg))
        await pg.screenshot(path=OUT+'fix-leaf-files.png')
        # 6 permissions: repo-ap open (no policies) → edit + delete; repo-exp policy without editMetadata/delete → hidden; repo-hr group-only policy we can't read → hidden
        await open_file(pg, 'repo-ap', 'INV-2026-4001')
        a=await pg.inner_text('.fv-actions'); print('#6 open repo:', 'Edit details' in a, 'Delete' in a, 'Request signature' in a)
        # 9, 11, 12 typed metadata form
        await pg.click('.fv-actions button:has-text("Edit details")'); await pg.wait_for_timeout(1200)
        s='.sheet'
        typ=lambda sel: pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}'); return e ? e.tagName.toLowerCase()+':'+(e.type||'') : null}})()")
        print('#9 controls:', await typ('[id="md-Supplier"]'), await typ('[id="md-Document Type"]'), await typ('[id="md-Invoice Date"]'), await typ('[id="md-Amount"]'), await pg.get_attribute('[id="md-Amount"]', 'inputmode'), await typ('[id="md-Status"]'))
        opts=await pg.evaluate("[...document.querySelectorAll('[id=\"md-Supplier\"] option')].map(o=>o.value).filter(Boolean)")
        print('#9 master options:', opts, 'secret-pass' not in json.dumps(opts), await pg.input_value('[id="md-Vendor Code"]'))
        await pg.select_option('[id="md-Supplier"]', 'Nexus Industrial'); await pg.wait_for_timeout(200)
        vopts=await pg.evaluate("[...document.querySelectorAll('[id=\"md-Vendor Code\"] option')].map(o=>o.value).filter(Boolean)")
        print('#9 cascade:', vopts, repr(await pg.input_value('[id="md-Vendor Code"]')))
        await pg.select_option('[id="md-Supplier"]', 'Acme Supplies'); await pg.wait_for_timeout(200); print('#9 auto-fill:', await pg.input_value('[id="md-Vendor Code"]'))
        print('#9 unique values:', await pg.evaluate("[...document.querySelectorAll('[id=\"md-Status-l\"] option')].map(o=>o.value)"), '#9 read-only:', await pg.get_attribute('[id="md-Received By"]', 'readonly') is not None, 'Read only' in await text(pg, s))
        t=await text(pg, s); print('#11 required marks:', t.count('*') >= 3, '(optional)' in t)
        print('#12 table rows:', await pg.locator('.mt-row').count(), await pg.input_value('input[aria-label="Line Items row 1 Description"]'))
        await pg.click('.mt-tools .chip:has-text("Add row")'); await pg.fill('input[aria-label="Line Items row 2 Description"]', 'Nuts'); await pg.fill('input[aria-label="Line Items row 2 Qty"]', '5')
        await pg.fill('[id="md-Invoice Number"]', ''); await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(400)
        print('#11 required blocks save:', 'Invoice Number is required' in await text(pg, s), len(M.STATE.get('patches', [])) == 0)
        await pg.fill('[id="md-Invoice Number"]', 'INV-2026-4001'); await pg.fill('[id="md-Invoice Date"]', '2026-10-05')
        await pg.screenshot(path=OUT+'fix-edit-form.png', full_page=True)
        await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(800)
        pb=M.STATE['patches'][-1]; print('#9 PATCH:', sorted(pb.keys()), pb.get('Supplier'), pb.get('VendorCode'), pb.get('InvoiceDate'), json.loads(pb['LineItems'])['data'][-1], 'InvoiceNumber' not in pb, 'ReceivedBy' not in pb)
        await pg.click('.fv-bar button[aria-label="Close"]')
        await open_file(pg, 'repo-exp', 'Lunch')
        a=await pg.inner_text('.fv-actions'); print('#6 restricted repo:', 'Edit details' not in a, 'Delete' not in a, 'Request signature' not in a, 'Share' in a)
        await pg.click('.fv-bar button[aria-label="Close"]'); print('#6 upload allowed there:', await pg.locator('.fab').count() == 1)
        await pg.goto(URL+'#/app/folders/r/repo-hr'); await pg.wait_for_timeout(1000); print('#6 group-only policy (unreadable) hides upload:', await pg.locator('.fab').count() == 0)
        # 7, 8 AI summary: saved summary shows at once (no new call / credit), designed, extra sections, never raw JSON
        n0=len([c for c in M.STATE['calls'] if c[1].endswith('/ai-summary')])
        await open_file(pg, 'repo-ap', 'INV-2026-4002')
        await pg.click('.fv-ai'); await pg.wait_for_timeout(500)
        t=await text(pg, '.sheet'); n1=len([c for c in M.STATE['calls'] if c[1].endswith('/ai-summary')])
        print('#8 saved summary direct:', 'Supplier Invoice INV-2026-4002' in t, 'Summarise this document' not in t, n1 == n0, 'no credit used' in t)
        print('#7 designed:', 'PARTIES' in t.upper() and 'Buyer: Example Corp' in t, 'Subtotal' in t, '{' not in t and '"' not in t, 'should never show' not in t)
        await pg.screenshot(path=OUT+'fix-ai-summary.png')
        await pg.click('button:has-text("Back to file")'); await pg.click('.fv-bar button[aria-label="Close"]')
        # 10, 12, 13 intelligent upload: draft saved right after OCR, table filled from OCR, listed in Drafts after leaving and reloading
        await pg.goto(URL+'#/app/upload'); await pg.wait_for_timeout(800)
        await pg.set_input_files('input[aria-label="Choose files"]', files=[{'name':'draft-me.pdf','mimeType':'application/pdf','buffer':M.PDF}])
        await pg.click('.bottombar .btn.primary:has-text("with AI")'); await pg.wait_for_timeout(900)
        await pg.click('.smart .btn.primary:has-text("Continue")'); await pg.wait_for_timeout(1200)
        print('#12 OCR table:', await pg.locator('.smart .mt-row').count(), await pg.input_value('input[aria-label="Line Items row 2 Description"]'))
        print('#10 staged as draft after OCR:', M.STATE['smartStage'][-1]['metadata'].get('Invoice Number'), 'Saved as a draft' in await text(pg))
        await pg.click('.smart .btn:has-text("Finish later")'); await pg.wait_for_timeout(1000)
        print('#10 drafts list:', 'draft-me.pdf' in await text(pg, '.drafts') if await pg.locator('.drafts').count() else False)
        await pg.reload(); await pg.wait_for_timeout(1500)
        print('#10 drafts after reload:', 'draft-me.pdf' in await text(pg, '.drafts') if await pg.locator('.drafts').count() else False)
        await pg.screenshot(path=OUT+'fix-drafts.png', full_page=True)
        await pg.click('.drafts .file-row:has-text("draft-me.pdf")'); await pg.wait_for_timeout(1200)
        print('#10 draft opens review:', 'Review & export' in await pg.inner_text('.screen'), await pg.input_value('[id="rv-Invoice Number"]'))
        print('#13 OCR only via EZOFIS:', sorted({c[1] for c in M.STATE['calls'] if 'ocr' in c[1].lower()}))
        for w in (320, 1024):
            await pg.set_viewport_size({'width': w, 'height': 760}); await pg.wait_for_timeout(300)
            print(f'{w} no h-scroll:', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('.main').scrollWidth <= document.querySelector('.main').clientWidth + 1"))
        print('errors', errs); await b.close()
asyncio.run(main())
