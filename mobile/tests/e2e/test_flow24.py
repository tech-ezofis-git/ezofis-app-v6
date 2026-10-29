import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Notifications from the server (MOBILE_APP_NOTIFICATIONS_API): the bell list, unread badge, relative times, mark read
# on tap (opens the ticket), delete, mark all read, and a new server notification announced by the watcher.

def calls(method, prefix): return [c for c in M.STATE['calls'] if c[0] == method and c[1].startswith(prefix)]

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)}); localStorage.setItem('ezofis.pollMs','2000')")
        await pg.goto(URL+'#/app/home'); await pg.reload(); await pg.wait_for_timeout(1500)  # pollMs is read when the app loads
        print('BELL unread on Home:', await pg.get_attribute('button[aria-label^="Notifications,"]', 'aria-label'))
        await pg.goto(URL+'#/app/notifications'); await pg.wait_for_timeout(1200)
        t=await pg.inner_text('.main')
        print('LIST from server:', 'Ticket EXP-2026-92 received for Expense Reimbursement (Approver)' in t, 'EXP-2026-88' in t, '5 min ago' in t, '2 days ago' in t, 'TODAY' in t.upper() and 'EARLIER' in t.upper(), len(calls('GET', '/notifications')) >= 1)
        print('UNREAD styling:', await pg.locator('button[aria-label^="Unread: "]').count() == 1)
        await pg.click('.chip:has-text("Unread")'); await pg.wait_for_timeout(200)
        print('UNREAD filter:', await pg.locator('.notif-row').count() == 1)
        await pg.click('.chip:has-text("All")')
        await pg.screenshot(path=OUT+'notif-list.png', full_page=True)
        # delete one
        await pg.click('button[aria-label="Delete Ticket EXP-2026-88 received for Expense Reimbursement (Approver)"]'); await pg.wait_for_timeout(400)
        print('DELETE:', [c[1] for c in calls('DELETE', '/notifications/')], 'EXP-2026-88' not in await pg.inner_text('.main'))
        # tap the unread one: marked read on the server and the ticket opens
        await pg.click('button[aria-label^="Unread: "]'); await pg.wait_for_timeout(1200)
        print('TAP marks read + opens ticket:', [c[1] for c in calls('PATCH', '/notifications/')], '/app/inbox/' in pg.url, 'EXP-2026-92' in await pg.inner_text('.main'))
        # a new notification arrives on the server while the app is open → toast with the server text
        M.STATE['notifications'].insert(0, M.notif(1290, 'EXP-2026-95', 0))
        await pg.goto(URL+'#/app/home')
        toast=''
        for _ in range(40):  # the watcher checks every 2 s here; the toast shows for about 3.6 s
            await pg.wait_for_timeout(250)
            if await pg.locator('.toast:has-text("EXP-2026-95")').count(): toast=await pg.inner_text('.toast'); break
        print('NEW server notification announced:', 'EXP-2026-95' in toast, repr(toast[:70]))
        await pg.goto(URL+'#/app/notifications'); await pg.wait_for_timeout(1200)
        print('NEW in the list:', 'EXP-2026-95' in await pg.inner_text('.main'))
        await pg.click('text=Mark all read'); await pg.wait_for_timeout(400)
        print('MARK ALL read:', '/notifications/1290/read' in [c[1] for c in calls('PATCH', '/notifications/')], await pg.locator('button[aria-label^="Unread: "]').count() == 0)
        print('errors', errs)
        await b.close()
asyncio.run(main())
