import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# 0.4.9 round: no-folder users, workflow table layout, organization card, welcome / sign-in, loading card, file filters, workflow chips.
async def text(pg, sel='.main'): return await pg.inner_text(sel)
async def no_hscroll(pg): return await pg.evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('.main') ? document.querySelector('.main').scrollWidth <= document.querySelector('.main').clientWidth + 1 : true")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':780}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        # 4, 5 welcome + sign-in
        await pg.goto(URL+'#/welcome'); await pg.wait_for_timeout(800)
        gap=await pg.evaluate("(()=>{const s=document.querySelector('.welcome-signin').getBoundingClientRect(); const b=document.querySelector('.banner').getBoundingClientRect(); return Math.round(b.top - s.bottom)})()")
        t=await pg.inner_text('body')
        print('#4 space sign-in → banner (px):', gap, gap >= 24, '| business text:', 'Built for business users' in t, 'Approve requests' in t, 'Upload & file' in t, 'Find your workspace' not in t)
        await pg.screenshot(path=OUT+'r9-welcome.png', full_page=True)
        await pg.click('.welcome-signin'); await pg.wait_for_timeout(600)
        print('#5 provider logos:', await pg.locator('.sso .sso-logo').count() == 2, await pg.locator('.sso .slot').count() == 0, await pg.locator('.sso svg rect').count() == 4, await pg.locator('.sso svg path[fill="#4285F4"]').count() == 1)
        await pg.screenshot(path=OUT+'r9-signin.png')
        # 6 loading animation on Home while the inbox loads
        await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        async def slow(route):
            await asyncio.sleep(2.5); await handler(route)
        await pg.route('**/Workflows/inbox/all-workflows**', slow)
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(900)
        anim=await pg.evaluate("(()=>{const e=document.querySelector('.update-card.loading .upd-shimmer'); return !!e && getComputedStyle(e).animationName})()")
        print('#6 loading card:', await pg.locator('.update-card.loading').count() == 1, 'Checking your inbox' in await text(pg), anim)
        await pg.screenshot(path=OUT+'r9-home-loading.png')
        await pg.wait_for_timeout(2600); print('#6 then real data:', await pg.locator('.update-card.loading').count() == 0, 'waiting for you' in await text(pg))
        await pg.unroute('**/Workflows/inbox/all-workflows**', slow)
        # 8 workflow chips
        await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1000)
        chips=[(await c.inner_text()).replace('\n', ' ') for c in await pg.locator('.content .chips .chip').all()]
        print('#8 chips:', chips)
        await pg.click('.chips .chip:has-text("Earlier")'); await pg.wait_for_timeout(300)
        print('#8 earlier only older:', 'EXP-2026-92' not in await text(pg) and 'EXP-2026-90' in await text(pg))
        # 2 workflow form table (New request) and request detail at phone + tablet widths
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1300); await pg.click('button:has-text("Add row")'); await pg.wait_for_timeout(300)
        geo=await pg.evaluate("(()=>{const r=document.querySelector('.nr-trow').getBoundingClientRect(); const h=document.querySelector('.nr-trow .nr-row-h').getBoundingClientRect(); const b=document.querySelector('.nr-trow .nr-row-b').getBoundingClientRect(); return [Math.round(r.width), Math.round(h.width), Math.round(b.width), b.top >= h.bottom - 1]})()")
        print('#2 phone: header and fields full width, fields below header:', geo, geo[1] == geo[0] - 2 or abs(geo[1]-geo[0]) <= 2, abs(geo[2]-geo[0]) <= 2, geo[3], await no_hscroll(pg))
        await pg.locator('.nr-trow').first.scroll_into_view_if_needed(); await pg.screenshot(path=OUT+'r9-table-phone.png')
        await pg.set_viewport_size({'width': 820, 'height': 900}); await pg.wait_for_timeout(400)
        cols=await pg.evaluate("getComputedStyle(document.querySelector('.nr-row-b')).gridTemplateColumns.split(' ').length")
        print('#2 tablet: fields in', cols, 'columns', await no_hscroll(pg)); await pg.locator('.nr-trow').first.scroll_into_view_if_needed(); await pg.screenshot(path=OUT+'r9-table-tablet.png')
        await pg.set_viewport_size({'width': 360, 'height': 780})
        # 3 settings: organization card, no switch
        await pg.goto(URL+'#/app/settings'); await pg.wait_for_timeout(800); t=await text(pg)
        print('#3 org card:', await pg.locator('.org-card').count() == 1, 'EZOFIS Admin' in t, 'switch' not in t.lower(), await pg.locator('.org-logo b').inner_text())
        await pg.screenshot(path=OUT+'r9-settings.png', full_page=True)
        # 7 file filters
        await pg.goto(URL+'#/app/folders/r/repo-ap?tab=files'); await pg.wait_for_timeout(1000)
        n0=await pg.locator('.file-row').count()
        await pg.click('.flt-bar .chip:has-text("Filter")'); await pg.wait_for_timeout(600)
        names=[await x.inner_text() for x in await pg.locator('.flt-h b').all()]
        print('#7 filter fields:', names)
        await pg.click('.flt-h:has-text("Supplier")'); await pg.wait_for_timeout(500)
        await pg.click('.flt-field .chip:has-text("Nexus Industrial")'); await pg.click('.chip:has-text("Oldest first")'); await pg.fill('input[aria-label="Date from"]', '2026-01-01')
        await pg.screenshot(path=OUT+'r9-filter.png')
        await pg.click('.sheet .btn.primary:has-text("Show files")'); await pg.wait_for_timeout(900)
        q=M.STATE['itemQueries'][-1]
        print('#7 query:', q['filters'], q['sortOrder'], q.get('dateFrom'), await pg.locator('.file-row').count(), '<', n0, await pg.locator('.flt-tag').count())
        await pg.click('.flt-tag:has-text("Nexus") button'); await pg.wait_for_timeout(800); print('#7 remove tag:', M.STATE['itemQueries'][-1]['filters'])
        await pg.screenshot(path=OUT+'r9-filtered.png')
        # 1 no folders: Folders menu + upload hidden
        orig=list(M.REPOS); M.REPOS.clear()
        await pg.goto(URL+'#/app/home'); await pg.reload(); await pg.wait_for_timeout(1300)
        tabs=[await x.inner_text() for x in await pg.locator('.bottomnav .tab').all()]
        print('#1 no folders — tabs:', [x.strip() for x in tabs], '| scan hidden:', await pg.locator('.qa:has-text("Scan")').count() == 0)
        await pg.set_viewport_size({'width': 1024, 'height': 760}); await pg.wait_for_timeout(400)
        print('#1 rail:', await pg.locator('.rail-fab').count() == 0, 'Folders' not in await pg.inner_text('.rail'))
        M.REPOS.extend(orig)
        print('errors', errs); await b.close()
asyncio.run(main())
