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
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(1500); print('updates text gone:', 'Updates for you' not in await pg.inner_text('body')); await pg.screenshot(path=OUT+'home-noupd.png')
        await pg.goto(URL+'#/app/new'); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'newreq-pick.png'); print('rows', await pg.locator('.nr-row').count())
        await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1500); print('ALL', await pg.evaluate("()=>[...document.querySelectorAll('.seg[role=tablist] button')].map(b=>b.getAttribute('aria-label'))"))
        await pg.goto(URL+'#/app/inbox?wf='+M.EXP); await pg.wait_for_timeout(1500); print('EXP', await pg.evaluate("()=>[...document.querySelectorAll('.seg[role=tablist] button')].map(b=>b.getAttribute('aria-label'))"))
        print('errors', errs); await b.close()
asyncio.run(main())
