import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        # 1 attachment opens (pdf.js) + document link
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(900)
        await pg.click('[role=tab][aria-label^="Attachments"]'); await pg.click('button[aria-label^="Open BeerTown"]'); await pg.wait_for_timeout(2500)
        print('VIEWER pdf pages:', await pg.locator('.fv canvas.pdf-page').count(), [c[1] for c in M.STATE['calls'] if c[1].endswith('/file')])
        await pg.screenshot(path=OUT+'viewer.png'); await pg.click('.fv-bar button[aria-label="Close"]')
        # 3 filled / all toggle
        await pg.click('[role=tab][aria-label="Form"]'); await pg.wait_for_timeout(200)
        t=await pg.inner_text('.main'); print('TOGGLE:', 'Filled' in t and 'All fields' in t, 'empty field' in t, 'OCR Text' not in t)
        await pg.click('.seg.mini button:has-text("All fields")'); await pg.wait_for_timeout(200)
        t=await pg.inner_text('.main'); print('ALL fields shows Not filled:', 'Not filled' in t, 'OCR Text' not in t)
        await pg.screenshot(path=OUT+'form-all.png', full_page=True)
        # 2 + 4 AP: tech fields hidden, line items with PO compare, doc open link
        await pg.goto(URL+'#/app/inbox/'+M.AP+'~inst-ap-1'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main')
        print('HIDDEN tech:', not any(k in t.replace(' ','') for k in ['OcrText','TenantId','WorkflowInstanceId','StorageProviderId','RepositoryId','Ocr Text','Tenant Id']), 'Invoice No' in t)
        print('LINES PO:', 'Line items' in t, 'Motor Control Starter' in t, 'PO 3' in t, "don't match the PO" in t, 'PO matching' in t)
        await pg.screenshot(path=OUT+'ap-lines.png', full_page=True)
        print('DOC open link:', await pg.locator('button[aria-label="Open INV-2026-3005.pdf"]').count())
        await pg.goto(URL+'#/app/inbox/'+M.AP+'~inst-ap-2'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('LINES extracted:', 'Cable tray' in t, 'Extracted from the document' in t)
        # 1 initiate workflow
        await pg.goto(URL+'#/app/new'); await pg.wait_for_timeout(1200)
        t=await pg.inner_text('.main'); print('PICK:', 'Expense Reimbursement' in t, 'Accounts Payable' not in t)
        await pg.click('button.nr-row:has-text("Expense Reimbursement")'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('FORM:', 'Paid Via' in t, 'Requested Date' not in t, 'OCR Text' not in t, True)
        await pg.screenshot(path=OUT+'new-form.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(300)
        t=await pg.inner_text('.main'); print('REQUIRED errors:', 'Position is required' in t)
        await pg.select_option('select', 'approver@example.com')
        await pg.select_option('select#nf-'+M.F['paid'], 'Cash'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        await pg.set_input_files('input[type=file]', files=[{'name':'r.pdf','mimeType':'application/pdf','buffer':M.PDF}])
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        print('STARTED body:', json.dumps(M.STATE['started'][-1])[:400]); print('UPLOAD to', M.STATE['uploads'][-1:], 'url', pg.url.split('#')[1])
        print('page errors:', errs)
        # 5 narrow phones
        for w in (320, 360, 390):
            await pg.set_viewport_size({'width':w,'height':760})
            await pg.goto(URL+'#/app/inbox?tab=completed'); await pg.wait_for_timeout(900)
            hs=await pg.eval_on_selector_all('.seg button', 'b=>b.map(x=>x.getBoundingClientRect().height)')
            await pg.screenshot(path=OUT+f'tabs-{w}.png', clip={'x':0,'y':0,'width':w,'height':260})
            await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-2'); await pg.wait_for_timeout(900)
            hu=await pg.eval_on_selector_all('.utabs button', 'b=>b.map(x=>[x.getBoundingClientRect().height, x.scrollWidth<=x.clientWidth+1])')
            await pg.screenshot(path=OUT+f'utabs-{w}.png', clip={'x':0,'y':0,'width':w,'height':220})
            print('W', w, 'seg heights', hs, 'utabs', hu)
        await b.close()
asyncio.run(main())
