import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
M.META[M.EXP]['formId']='form-exp-real'
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
BIG=b'%PDF-1.4\n'+b'0'*(21*1048576)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        await pg.click('[role=tab][aria-label^="Attachments"]')
        n0=len(M.STATE['uploads'])
        async with pg.expect_file_chooser() as fc: await pg.click('button:has-text("Add attachments")')
        ch=await fc.value; print('chooser multiple:', ch.is_multiple())
        await ch.set_files([{'name':'a.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'b.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'huge.pdf','mimeType':'application/pdf','buffer':BIG}])
        await pg.wait_for_timeout(2500)
        print('inbox uploads:', len(M.STATE['uploads'])-n0, '| toast:', await pg.locator('.toast').inner_text() if await pg.locator('.toast').count() else None)
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1500)
        async with pg.expect_file_chooser() as fc: await pg.click('button:has-text("Add files")')
        await (await fc.value).set_files([{'name':'ok.pdf','mimeType':'application/pdf','buffer':M.PDF},{'name':'huge.pdf','mimeType':'application/pdf','buffer':BIG}])
        await pg.wait_for_timeout(500)
        t=await pg.inner_text('.main'); print('NR attachments:', 'ok.pdf' in t, 'huge.pdf' not in t, [x for x in t.split(chr(10)) if '.pdf' in x], '| toast:', await pg.locator('.toast').inner_text())
        await pg.click('button:has-text("Add row")'); await pg.wait_for_timeout(300)
        await pg.set_input_files('.nr-trow input[type=file] >> nth=0', files=[{'name':'big.pdf','mimeType':'application/pdf','buffer':BIG}]); await pg.wait_for_timeout(500)
        print('receipt 21MB rejected:', 'big.pdf' not in await pg.inner_text('.nr-trow'), '|', await pg.locator('.toast').inner_text())
        print('errors', errs); await b.close()
asyncio.run(main())
