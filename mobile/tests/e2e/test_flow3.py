import os
import asyncio, json, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        # card file chip
        await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1000)
        await pg.click('button.card-file[aria-label="Open INV-2026-3005.pdf"] >> nth=0'); await pg.wait_for_timeout(2000)
        print('CARD file viewer:', await pg.locator('.fv canvas').count(), pg.url.split('#')[1], [c[1] for c in M.STATE['calls'] if c[1].endswith('/file')][-1:])
        await pg.click('.fv-bar button[aria-label="Close"]')
        # table file link
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        await pg.click('.tbl-row .file-link'); await pg.wait_for_timeout(1500)
        print('TABLE file viewer:', await pg.locator('.fv').count(), [c[1] for c in M.STATE['calls'] if c[1].endswith('/file')][-1:])
        await pg.click('.fv-bar button[aria-label="Close"]')
        # start with table + no file → start/json
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        t=await pg.inner_text('.main'); print('TABLE editor:', 'Expense Receipt' in t, 'Add row' in t)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.select_option('select#nf-'+M.F['paid'], 'Cash'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        await pg.click('button:has-text("Add row")'); await pg.fill('.nr-trow input:not([type=file]) >> nth=0', '777'); await pg.fill('.nr-trow input:not([type=file]) >> nth=1', 'Uber')
        await pg.screenshot(path=OUT+'new-table.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        print('JSON start:', json.dumps(M.STATE['started'][-1]), '->', pg.url.split('#')[1])
        # start with 2 files → multipart /start + 1 attachment
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'Partner')
        await pg.set_input_files('input[type=file]', files=[{'name':'a.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'b.pdf','mimeType':'application/pdf','buffer':M.PDF}])
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(2000)
        mp=M.STATE['started'][-1]['__multipart']
        names=re.findall(r'name="([^"]+)"', mp); fdj=re.search(r'name="formData"\r\n\r\n(.*?)\r\n', mp, re.S).group(1); env=re.search(r'name="envType"\r\n\r\n(.*?)\r\n', mp).group(1)
        print('MULTIPART fields:', names, 'envType', env, 'formData', fdj); print('extra upload ->', M.STATE['uploads'][-1:], pg.url.split('#')[1])
        # 403 handling
        orig=M.handle
        def h403(method, path, qs, body):
            if path.endswith('/start/json'): return 403, {'message': 'Forbidden'}
            return orig(method, path, qs, body)
        M.handle=h403
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'X'); await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(800)
        print('403 msg:', "don't have access" in await pg.inner_text('.main'))
        M.handle=orig
        print('page errors:', errs)
        await b.close()
asyncio.run(main())
