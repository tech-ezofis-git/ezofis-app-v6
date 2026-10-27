import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def tabs(pg): return await pg.evaluate("()=>[...document.querySelectorAll('.seg[role=tablist] button')].map(b=>b.getAttribute('aria-label')+(b.classList.contains('on')?' *':''))")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        for w in (390, 320):
            ctx=await b.new_context(viewport={'width':w,'height':780}); await ctx.route('https://cloud.ezofis.com/**',handler)
            pg=await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
            await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1200); print(w, 'ALL:', await tabs(pg))
            await pg.goto(URL+'#/app/inbox?wf='+M.EXP); await pg.wait_for_timeout(1500); print(w, 'EXP:', await tabs(pg), 'rows', await pg.locator('.card[role=button], [role=button].lcard, .lcard').count())
            await pg.screenshot(path=OUT+f'tabs-exp-{w}.png')
            if w == 390:
                await pg.click('.seg[role=tablist] button:nth-child(2)'); await pg.wait_for_timeout(1000); print('Approved tab:', await tabs(pg), (await pg.inner_text('main, body'))[:0], 'EXP-2026-93' in await pg.inner_text('body'))
                await pg.click('.seg[role=tablist] button:nth-child(3)'); await pg.wait_for_timeout(1000); print('Rejected tab empty text:', 'Nothing in Rejected' in await pg.inner_text('body'))
                print('byActivity bodies:', [x['activityIds'] for x in M.STATE.get('byAct', [])])
                await pg.goto(URL+'#/app/inbox?wf='+M.AP); await pg.wait_for_timeout(1200); print('AP:', await tabs(pg))
                await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1500)
                btns = await pg.evaluate("()=>[...document.querySelectorAll('.actionbar button')].map(b=>[b.textContent, getComputedStyle(b).backgroundColor, getComputedStyle(b).color])")
                print('ACTIONS:', btns); await pg.screenshot(path=OUT+'actions-colored.png')
                await pg.click('.actionbar button:has-text("Reject")'); await pg.wait_for_timeout(400)
                print('confirm btn:', await pg.evaluate("()=>{const b=[...document.querySelectorAll('.sheet button')].find(x=>x.textContent==='Reject'); return b && getComputedStyle(b).backgroundColor}"))
            await ctx.close()
        print('errors', errs); await b.close()
asyncio.run(main())
