import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); errs=[]
        for w,h in ((390,844),(320,640),(1024,768)):
            ctx=await b.new_context(viewport={'width':w,'height':h}); await ctx.route('https://cloud.ezofis.com/**',handler)
            pg=await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
            await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(1500)
            r=await pg.evaluate("()=>{const c=document.querySelector('.update-card').getBoundingClientRect(), s=document.querySelector('.sheet-body').getBoundingClientRect(); return {above: Math.round(s.top-c.top), h: Math.round(c.height)}}")
            order=await pg.evaluate("()=>[...document.querySelectorAll('.update-card, .sec-title, .askai, [class*=askai], .sec-label')].map(e=>(e.className.split(' ')[0]+':'+e.textContent.slice(0,22)))")
            print(w, r, 'ratio', round(r['above']/r['h'],2)); print(order[:8])
            await pg.screenshot(path=OUT+f'home-ov-{w}.png', full_page=False)
            await ctx.close()
        ctx=await b.new_context(viewport={'width':390,'height':844}); pg=await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate('localStorage.clear()'); await pg.goto(URL+'#/app/home'); await pg.reload(); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=OUT+'home-ov-sample.png')
        print('errors', errs); await b.close()
asyncio.run(main())
