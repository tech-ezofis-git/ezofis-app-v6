import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        await ctx.grant_permissions(['notifications'], origin='file://') if False else None
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)}); localStorage.setItem('ezofis.pollMs','2000')")
        await pg.goto(URL+'#/app/inbox'); await pg.reload(); await pg.wait_for_timeout(2500)
        before = await pg.inner_text('body'); print('before has EXP-2026-95:', 'EXP-2026-95' in before)
        # a ticket arrives: the server adds it to the inbox and creates a notification (MOBILE_APP_NOTIFICATIONS_API)
        M.STATE['inbox'].insert(0, M.exp_row(5, 'EXP-2026-95', 0, '77.00', 'Uber'))
        M.STATE['notifications'].insert(0, M.notif(1295, 'EXP-2026-95', 0))
        toast = False
        for _ in range(20):
            await pg.wait_for_timeout(250)
            if await pg.locator('.toast:has-text("EXP-2026-95")').count(): toast = True; break
        await pg.wait_for_timeout(1000)
        after = await pg.inner_text('body'); print('auto-refreshed list:', 'EXP-2026-95' in after, '| toast:', toast)
        await pg.goto(URL+'#/app/notifications'); await pg.wait_for_timeout(800); t=await pg.inner_text('body'); print('in-app notif:', 'Ticket EXP-2026-95 received' in t, '| turn-on banner:', 'Turn on' in t)
        await pg.screenshot(path=OUT+'notifs.png')
        await pg.goto(URL+'#/app/settings'); await pg.wait_for_timeout(800); t=await pg.inner_text('body'); print('settings:', 'Phone notifications' in t, 'Auto-refresh' in t)
        await pg.screenshot(path=OUT+'settings-notify.png', full_page=True)
        # form not reset: open new request form, inject new item, ensure stays
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1500)
        M.STATE['inbox'].insert(0, M.exp_row(6, 'EXP-2026-96', 0, '12.00', 'Cab'))
        await pg.wait_for_timeout(3000); print('still on form:', pg.url.endswith('/app/new/'+M.EXP))
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(1500); print('home after stale refresh total:', (await pg.inner_text('.update-card'))[:60].replace('\n',' | '))
        print('errors', errs); await b.close()
asyncio.run(main())
