import os
import asyncio, json, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Staying signed in and the background inbox check:
# - opening the app with a saved session goes straight to Home (no intro), and Skip never sends a signed-in user to sign-in
# - a 401 from one endpoint while the token still works (/me/tenants) keeps the session ("no access" instead)
# - a real expiry (every call 401) signs out, and the sign-in screen remembers the last email
# - public/runners/inbox.js run in Node with a fake Background Runner: baseline, then a notification only for new requests
HERE = os.path.dirname(os.path.abspath(__file__))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/'); await pg.wait_for_timeout(1500)
        print('SIGNED IN start goes to Home:', pg.url.endswith('#/app/home'))
        await pg.goto(URL+'#/loading'); await pg.wait_for_timeout(200); await pg.click('button:has-text("Skip")'); await pg.wait_for_timeout(500)
        print('SKIP keeps you signed in:', pg.url.endswith('#/app/home'))
        # one endpoint says 401 but the token is fine
        async def inbox401(route):
            await route.fulfill(status=401, content_type='application/json', body='{"message":"Unauthorized"}')
        await pg.route('**/api/Workflows/inbox/all-workflows**', inbox401)
        await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1500)
        kept=await pg.evaluate("!!localStorage.getItem('ezofis.session')")
        print('STRAY 401 keeps session:', kept, not pg.url.endswith('#/login'), [c[1] for c in M.STATE['calls'] if c[1] == '/me/tenants'][:1])
        await pg.unroute('**/api/Workflows/inbox/all-workflows**', inbox401)
        # real expiry
        await pg.evaluate("localStorage.setItem('ezofis.lastLogin', JSON.stringify({email:'student.lawyer@example.com', tenantId:'t1'}))")
        await pg.wait_for_timeout(5500)  # the token check is cached for 5 s
        await pg.goto(URL+'#/app/settings'); await pg.wait_for_timeout(300)
        M.STATE['fail401']=True; await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1500)
        print('EXPIRED signs out:', pg.url.endswith('#/login'), await pg.evaluate("!localStorage.getItem('ezofis.session')"))
        M.STATE['fail401']=False
        print('EMAIL remembered:', await pg.input_value('input[type=email]') if await pg.locator('input[type=email]').count() else 'no email input')
        print('errors', errs)
        await b.close()
    # background runner script in Node
    out = subprocess.run(['node', os.path.join(HERE, 'fixtures', 'run_runner.cjs'), os.path.join(HERE, '..', '..', 'public', 'runners', 'inbox.js')], capture_output=True, text=True)
    print(out.stdout.strip() or out.stderr.strip())
asyncio.run(main())
