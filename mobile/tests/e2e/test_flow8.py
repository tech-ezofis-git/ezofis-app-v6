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
        await pg.goto(URL+'#/app/inbox/'+M.AP+'~inst-ap-1'); await pg.wait_for_timeout(1000)
        await pg.click('button[aria-label="Open INV-2026-3005.pdf"]'); await pg.wait_for_timeout(2500)
        g=await pg.evaluate("()=>{const r=e=>e.getBoundingClientRect(); const s=document.querySelector('.fv-scroll'), p=document.querySelector('.fv-preview'), m=document.querySelector('.fv-meta'); return {scrollH: Math.round(r(s).height), preview: Math.round(r(p).height), metaTopVisible: Math.round(r(s).bottom - r(m).top), canScroll: s.scrollHeight > s.clientHeight}}")
        print('LAYOUT', g, 'ratio', round(g['preview']/g['scrollH'],2))
        t=await pg.inner_text('.fv'); print('META:', 'Invoice No' in t, 'Matched Status' in t, 'Ocr' not in t and 'Tenant' not in t and 'Storage' not in t, '| icons:', await pg.locator('.fv-bar button[aria-label="Download"]').count(), await pg.locator('.fv-bar button[aria-label="Share"]').count(), '| canvas', await pg.locator('.fv canvas').count())
        await pg.screenshot(path=OUT+'fv-live.png')
        await pg.evaluate("document.querySelector('.fv-scroll').scrollTo(0, 99999)"); await pg.wait_for_timeout(300); await pg.screenshot(path=OUT+'fv-live-scrolled.png')
        await pg.click('.fv-ai'); await pg.wait_for_timeout(400)
        t=await pg.inner_text('.sheet'); print('AI sheet:', 'From the AI agent' in t, 'Duplicate' in t, 'Summarise this document' in t)
        await pg.click('.sheet button:has-text("Summarise this document")'); await pg.wait_for_timeout(800)
        t=await pg.inner_text('.sheet'); print('AI generated:', 'Vertex Industrial Supply' in t, 'calls', M.STATE.get('aiSum'))
        await pg.screenshot(path=OUT+'fv-ai.png')
        await pg.click('.sheet button:has-text("Back to file")'); await pg.wait_for_timeout(300); print('back to file:', await pg.locator('.sheet').count()==0, await pg.locator('.fv').count()==1)
        # sample folders file
        pg2=await ctx.new_page(); await pg2.goto(URL+'#/welcome'); await pg2.evaluate('localStorage.clear()'); await pg2.goto(URL+'#/app/folders'); await pg2.reload(); await pg2.wait_for_timeout(800)
        link=await pg2.evaluate("()=>{const a=[...document.querySelectorAll('button,a')].find(x=>/\\.pdf/i.test(x.textContent)); if(a){a.click(); return a.textContent.slice(0,40)} return null}"); await pg2.wait_for_timeout(600)
        print('sample opened:', link, pg2.url.split('#')[1]); await pg2.screenshot(path=OUT+'fv-sample.png')
        print('errors', errs); await b.close()
asyncio.run(main())
