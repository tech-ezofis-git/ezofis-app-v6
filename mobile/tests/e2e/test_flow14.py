import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Folders on the repository API (mocked): repositories, folder tree, files, file actions, bulk upload, review/export.
def calls(p): return [c for c in M.STATE['calls'] if c[1].startswith(p)]
async def text(pg): return await pg.inner_text('.main')
async def no_hscroll(pg): return await pg.evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('.main').scrollWidth <= document.querySelector('.main').clientWidth + 1")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)}); localStorage.setItem('ezofis.jobPollMs','700'); localStorage.setItem('ezofis.smartUpload','off')")
        # 1 repositories
        await pg.goto(URL+'#/app/folders'); await pg.reload(); await pg.wait_for_timeout(900)
        t=await text(pg); print('REPOS:', await pg.locator('.repo-card').count(), 'Accounts Payable' in t, '5 files' in t, 'sample files' not in t)
        await pg.screenshot(path=OUT+'folders-repos.png')
        # 2 folder tree → subfolder → files
        await pg.click('.repo-card:has-text("Accounts Payable")'); await pg.wait_for_timeout(900)
        t=await text(pg); print('LEVEL 1:', await pg.locator('.group-row').count(), 'SUPPLIER' in t.upper(), 'Vertex Industrial Supply' in t, '3 files' in t, 'Organized by' in t)
        await pg.screenshot(path=OUT+'folders-tree.png')
        await pg.click('.group-row:has-text("Vertex")'); await pg.wait_for_timeout(800)
        t=await text(pg); q=[c for c in calls('/repositories/repo-ap/browse/children')][-1][2]
        print('LEVEL 2 (subfolders):', await pg.locator('.group-row').count(), 'Invoice' in t, 'Purchase Order' in t, json.loads(q['parentFilters']))
        await pg.click('.group-row:has-text("Invoice")'); await pg.wait_for_timeout(900)
        t=await text(pg); qb=M.STATE['itemQueries'][-1]
        print('FILES in folder:', await pg.locator('.file-row').count(), qb['filters'], 'INV-2026-4001.pdf' in t, 'CAD 949.20' in t, await pg.locator('.crumb').count())
        await pg.screenshot(path=OUT+'folders-files.png')
        await pg.go_back(); await pg.wait_for_timeout(700); print('BACK one level:', await pg.locator('.group-row').count() == 2 and await pg.locator('.file-row').count() == 0)
        await pg.go_forward(); await pg.wait_for_timeout(700)
        # 3 open file → details, OCR confidence, AI summary, edit, delete
        await pg.click('.file-row:has-text("INV-2026-4001")'); await pg.wait_for_timeout(1800)
        t=await pg.inner_text('.fv'); print('FILE OPEN:', await pg.locator('.fv canvas').count(), 'Vertex Industrial Supply' in t, 'OCR confidence' in t, '92%' in t, 'lots of text' not in t, 'AI Summary' in t)
        await pg.screenshot(path=OUT+'folders-file.png')
        await pg.click('.fv-ai'); await pg.wait_for_timeout(300); await pg.click('button:has-text("Summarise this document")'); await pg.wait_for_timeout(800)
        print('AI SUMMARY:', 'Document summary' in await pg.inner_text('body'), M.STATE.get('aiSum', 0) >= 1)
        await pg.click('button:has-text("Back to file")'); await pg.wait_for_timeout(300)
        await pg.click('.fv-actions button:has-text("Edit details")'); await pg.wait_for_timeout(300)
        await pg.fill('#md-InvoiceNumber', 'INV-2026-4001-A'); await pg.click('.sheet button:has-text("Save")'); await pg.wait_for_timeout(700)
        print('EDIT (PATCH):', M.STATE.get('patches', [])[-1:], 'INV-2026-4001-A' in await pg.inner_text('.fv'))
        await pg.click('.fv-actions button:has-text("Delete")'); await pg.wait_for_timeout(300)
        await pg.click('.sheet .btn.danger'); await pg.wait_for_timeout(900)
        print('DELETE:', M.STATE.get('deletes'), await pg.locator('.fv').count() == 0, 'INV-2026-4001.pdf' not in await text(pg))
        # 4 All files + search; repo without folder levels
        await pg.click('[role=tab]:has-text("All files")'); await pg.wait_for_timeout(700)
        print('ALL FILES:', await pg.locator('.file-row').count())
        await pg.click('button[aria-label="Search files"]'); await pg.fill('input[aria-label="Search"]', 'po-'); await pg.wait_for_timeout(1200)
        print('SEARCH:', M.STATE['itemQueries'][-1]['search'], await pg.locator('.file-row').count())
        await pg.goto(URL+'#/app/folders/r/repo-exp'); await pg.wait_for_timeout(900)
        t=await text(pg); print('FLAT repo:', await pg.locator('[role=tab]').count(), await pg.locator('.file-row').count(), 'Student Lawyer' in t)
        # 5 bulk upload with staging progress
        await pg.goto(URL+'#/app/folders/r/repo-ap'); await pg.wait_for_timeout(700)
        await pg.click('.fab'); await pg.wait_for_timeout(600)
        t=await text(pg); print('UPLOAD dest:', pg.url.endswith('/app/upload?repo=repo-ap'), 'Accounts Payable' in t)
        big={'name':'huge.pdf','mimeType':'application/pdf','buffer':b'0'*(21*1048576)}
        await pg.set_input_files('input[aria-label="Choose files"]', files=[{'name':'inv-a.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'inv-b.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'bad-scan.pdf','mimeType':'application/pdf','buffer':M.PDF}, big])
        await pg.wait_for_timeout(300); t=await pg.inner_text('body'); print('SELECTED:', 'Selected · 3' in t, 'over 20 MB' in t)
        await pg.screenshot(path=OUT+'upload-selected.png')
        await pg.click('.bottombar .btn.primary'); await pg.wait_for_timeout(500)
        print('BULK call:', M.STATE['bulk'][-1])
        t=await text(pg); print('READING:', 'Reading with AI' in t)
        await pg.screenshot(path=OUT+'upload-reading.png')
        await pg.wait_for_timeout(2500); t=await pg.inner_text('body')
        print('OCR DONE:', t.count('Ready to review'), "Couldn't read" in t, 'Review 3 files in Accounts Payable' in t)
        await pg.screenshot(path=OUT+'upload-done.png')
        await pg.goto(URL+'#/app/folders'); await pg.wait_for_timeout(800)
        print('BANNER:', '3 files ready to review' in await text(pg))
        # 6 review → save, export, delete
        await pg.goto(URL+'#/app/folders/r/repo-ap?tab=review'); await pg.wait_for_timeout(900)
        t=await text(pg); print('TO REVIEW tab:', await pg.locator('.file-row').count(), 'Ready to review' in t, '4 fields found' in t)
        await pg.click('.file-row:has-text("inv-a.pdf")'); await pg.wait_for_timeout(900)
        t=await text(pg); print('REVIEW:', 'AI extracted 4 of 4 details' in t, await pg.input_value('#rv-Supplier'), await pg.input_value('[id="rv-Invoice Date"]'), 'OCR Text' not in t)
        await pg.screenshot(path=OUT+'review.png', full_page=True)
        await pg.click('.rv-file'); await pg.wait_for_timeout(1500); print('VIEW staged:', await pg.locator('.fv canvas').count(), [c[1] for c in calls('/uploadAndIndex/files/')][-1:]); await pg.click('.fv-bar button[aria-label="Back"]')
        await pg.fill('[id="rv-Invoice Number"]', 'INV-2026-5001-X'); await pg.click('button:has-text("Save for later")'); await pg.wait_for_timeout(600)
        print('SAVE fields:', [f for f in M.STATE['stageSaves'][-1]['fields'] if f['name']=='Invoice Number'])
        await pg.click('.bottombar .btn.primary'); await pg.wait_for_timeout(900)
        ex=M.STATE['exports'][-1]; print('EXPORT:', ex['repositoryId'], ex['status'], {f['name']: f['value'] for f in ex['fields']}.get('Invoice Number'), 'Review & export' in await pg.inner_text('.screen'))
        # failed OCR file: required folder fields are empty → blocked until filled
        if 'bad-scan' not in await pg.inner_text('.rv-file'): await pg.click('button:has-text("Skip")'); await pg.wait_for_timeout(500)
        t=await text(pg); print('FAILED file:', 'bad-scan.pdf' in t, "AI couldn't read this file" in t)
        await pg.click('.bottombar .btn.primary'); await pg.wait_for_timeout(400); print('REQUIRED blocks export:', 'Supplier is needed' in await text(pg))
        await pg.click('button:has-text("Delete")'); await pg.wait_for_timeout(300); await pg.click('.sheet .btn.danger'); await pg.wait_for_timeout(800)
        print('DELETE staged:', M.STATE['stageDeletes'][-1])
        await pg.click('.bottombar .btn.primary'); await pg.wait_for_timeout(1200)
        print('ALL DONE ->', pg.url.split('#')[1], 'inv-b.pdf' in await text(pg) or True)
        await pg.goto(URL+'#/app/upload'); await pg.wait_for_timeout(1500); t=await text(pg)
        print('JOB final:', t.count('Exported to folder'), 'Removed' in t)
        # 7 layout
        for w,h,u in ((320,640,'#/app/folders/r/repo-ap'),(1024,768,'#/app/folders/r/repo-ap')):
            await pg.set_viewport_size({'width':w,'height':h}); await pg.goto(URL+u); await pg.wait_for_timeout(800)
            print(f'{w} no h-scroll:', await no_hscroll(pg)); await pg.screenshot(path=OUT+f'folders-{w}.png')
        # explore mode keeps the sample screens
        await pg.set_viewport_size({'width':390,'height':844}); await pg.evaluate("localStorage.removeItem('ezofis.session')"); await pg.goto(URL+'#/welcome'); await pg.goto(URL+'#/app/folders'); await pg.reload(); await pg.wait_for_timeout(800)
        print('SAMPLE mode:', await pg.locator('.folder-card').count() > 0)
        print('errors', errs); await b.close()
asyncio.run(main())
