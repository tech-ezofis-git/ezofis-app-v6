import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Ask EZOFIS AI on the Repository Assistant chatbot API (mocked; no live calls).
def chats(): return M.STATE.get('chat', [])
async def ask(pg, q, wait=900):
    await pg.fill('textarea[aria-label="Your question"]', q); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(wait)
async def no_hscroll(pg): return await pg.evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('.main').scrollWidth <= document.querySelector('.main').clientWidth + 1")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        # explore mode: sign-in prompt
        await pg.goto(URL+'#/app/ask'); await pg.wait_for_timeout(500)
        print('EXPLORE prompt:', 'Sign in to ask EZOFIS AI' in await pg.inner_text('.main'))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(900)
        await pg.click('.qa.ai'); await pg.wait_for_timeout(600)
        t=await pg.inner_text('.main'); print('OPEN from Home:', pg.url.endswith('#/app/ask'), 'what are you looking for' in t, await pg.locator('.ask-sug').count())
        await pg.screenshot(path=OUT+'ask-empty.png')
        # ask → rich answer
        await ask(pg, 'show invoices from vertex')
        body=chats()[-1]; sid=body['sessionId']
        print('REQUEST:', body['message'], sid.startswith('mobile-'), 'specificId' not in body, 'token' not in body)
        t=await pg.inner_text('.main')
        print('ANSWER:', '6 results' in t, await pg.locator('.ask-p b').count() >= 1, 'FILTERS APPLIED' in t.upper(), 'Vertex Industrial Supply' in t, await pg.locator('.ask-rc').count(), 'Show 2 more' in t, 'Open on the web' in t, 'bbce89bf' not in t, 'Request · Request' not in t)
        await pg.locator('.ask-me').first.scroll_into_view_if_needed(); await pg.evaluate("document.querySelector('.main').scrollTop = 0")
        await pg.screenshot(path=OUT+'ask-answer.png')
        await pg.evaluate("document.querySelector('.main').scrollTop = 520"); await pg.screenshot(path=OUT+'ask-answer-cards.png')
        await pg.click('text=Show 2 more'); await pg.wait_for_timeout(200); print('SHOW MORE:', await pg.locator('.ask-rc').count())
        # open a document from the answer
        await pg.click('button[aria-label="Open file INV-2026-3005.pdf"]'); await pg.wait_for_timeout(1800)
        print('FILE OPEN:', await pg.locator('.fv').count(), [c[1] for c in M.STATE['calls'] if c[1].endswith('/file')][-1:])
        await pg.screenshot(path=OUT+'ask-file.png')
        await pg.click('.fv-bar button[aria-label="Close"]'); await pg.wait_for_timeout(300)
        # repository picker → scoped follow-up in the same chat
        await ask(pg, 'where are the invoices?')
        print('PICKER:', await pg.locator('.ask-repo').count())
        await pg.click('.ask-repo:has-text("Accounts Payable")'); await pg.wait_for_timeout(900)
        body=chats()[-1]; t=await pg.inner_text('.screen')
        print('SCOPED:', body.get('specificId'), body['sessionId']==sid, 'Searching in Accounts Payable' in t, 'In Accounts Payable' in t)
        await pg.click('button[aria-label="Search everywhere"]'); await pg.wait_for_timeout(200); print('SCOPE cleared:', await pg.locator('.ask-scope').count()==0)
        # open a request card, then come back to the same thread
        n=await pg.locator('.ask-me').count()
        await pg.click('button[aria-label="Open request EXP-2026-92"] >> nth=0'); await pg.wait_for_timeout(1000)
        print('REQUEST OPEN:', '/app/inbox/'+M.EXP in pg.url.replace('%7E','~'), 'Beertown Public House' in await pg.inner_text('.main'))
        await pg.go_back(); await pg.wait_for_timeout(600); print('THREAD kept:', await pg.locator('.ask-me').count()==n)
        # errors, action needing the web, empty answer
        await ask(pg, 'please fail'); t=await pg.inner_text('.main'); print('502:', 'Ask AI is unavailable right now' in t, await pg.locator('.ask-err button:has-text("Try again")').count())
        await ask(pg, 'start the expense workflow'); print('ACTION note:', 'Finish it on cloud.ezofis.com' in await pg.inner_text('.main'))
        await ask(pg, 'nothing matches this'); print('EMPTY answer:', "couldn't find anything" in await pg.inner_text('.main'))
        # Stop while the assistant is slow
        async def slow(route):
            await asyncio.sleep(3); await handler(route)
        await pg.route('**/repositories/assistant/chatbot', slow)
        await pg.fill('textarea[aria-label="Your question"]', 'hello there'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(800)
        busy=await pg.locator('.ask-thinking').count(); send_disabled=await pg.is_disabled('button[aria-label="Send question"]')
        await pg.screenshot(path=OUT+'ask-thinking.png')
        await pg.click('.ask-stop'); await pg.wait_for_timeout(3500)
        t=await pg.inner_text('.main'); print('STOP:', busy, send_disabled, 'Stopped.' in t, 'Hi! Ask me' not in t)
        await pg.unroute('**/repositories/assistant/chatbot', slow)
        # layout
        for w,h in ((320,640),(1024,768)):
            await pg.set_viewport_size({'width':w,'height':h}); await pg.wait_for_timeout(300)
            print(f'{w} no h-scroll:', await no_hscroll(pg), 'composer:', await pg.locator('.ask-composer').is_visible())
            await pg.screenshot(path=OUT+f'ask-{w}.png')
        await pg.set_viewport_size({'width':390,'height':844})
        # new chat → new session
        await pg.click('button[aria-label="Start a new chat"]'); await pg.wait_for_timeout(300)
        print('NEW CHAT:', await pg.locator('.ask-sug').count(), await pg.locator('.ask-me').count())
        await pg.click('.ask-sug >> nth=0'); await pg.wait_for_timeout(900); print('NEW session:', chats()[-1]['sessionId']!=sid, chats()[-1]['message'])
        # Home chip deep-link (?q=)
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(800)
        await pg.click('.askai-chip >> nth=1'); await pg.wait_for_timeout(1000)
        print('HOME chip:', pg.url.endswith('#/app/ask'), chats()[-1]['message'])
        print('errors', errs); await b.close()
asyncio.run(main())
