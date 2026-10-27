import os
import asyncio, json, sys, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import SESSION, URL, OUT, H
import urllib.parse
from email.message import EmailMessage
msg = EmailMessage()
msg['Subject'] = '[171-GUELPH-ST] Fw: Elevator door operator quote request'
msg['From'] = 'Seth Morgan <seth@example.com>'; msg['To'] = 'quotes@example.com'; msg['Cc'] = 'Pilot <pilot@example.com>'
msg['Date'] = 'Mon, 14 Sep 2026 19:08:31 -0700'
msg.set_content('Hi team,\nPlease quote the attached.\nThanks, Seth')
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
msg.add_alternative('<html><body><p>Hi team,</p><p>Please quote the <b>attached</b> door operator survey — Unit 4 &amp; 5.</p><img src="cid:logo1" width="40"><script>alert(1)</script><p>Thanks,<br>Seth</p></body></html>', subtype='html')
msg.get_payload()[1].add_related(PNG, 'image', 'png', cid='<logo1>')
msg.add_attachment(M.PDF, maintype='application', subtype='pdf', filename='Door survey.pdf')
EML = msg.as_bytes()
async def handler(route):
    req=route.request
    if req.method=='OPTIONS': return await route.fulfill(status=204,headers=H)
    u=urllib.parse.urlparse(req.url); path=u.path[len('/api'):]; qs=dict(urllib.parse.parse_qsl(u.query))
    if path.endswith('/items/item-eml/file'): return await route.fulfill(status=200, headers={**H,'Content-Type':'message/rfc822'}, body=EML)
    if path.endswith('/attachments') and req.method=='GET':
        return await route.fulfill(status=200, headers=H, body=json.dumps({'attachments':[{'id':'e1','fileName':'[171-GUELPH-ST] Fw_ quote.eml','contentType':'message/rfc822','fileSize':len(EML),'repositoryId':'repo-exp','itemId':'item-eml','createdAtUtc':'2026-10-26T10:00:00Z'}]}))
    s,d=M.handle(req.method, path, qs, None)
    if isinstance(d, tuple): return await route.fulfill(status=s, headers={**H,'Content-Type':d[2]}, body=d[1])
    await route.fulfill(status=s,headers=H,body=json.dumps(d))
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':780}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); dialogs=[]; pg.on('dialog', lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        await pg.click('[role=tab][aria-label^="Attachments"]'); await pg.click('button[aria-label^="Open [171"]'); await pg.wait_for_timeout(2500)
        t=await pg.inner_text('.fv'); print('EMAIL:', 'Elevator door operator quote request' in t, 'Seth Morgan' in t, 'quotes@example.com' in t, 'Door survey.pdf' in t, 'Delivered-To' not in t and 'Content-Type' not in t)
        fr=pg.frame_locator('.mail-frame'); body=await fr.locator('body').inner_text(); print('HTML body:', 'door operator survey' in body, 'cid img replaced:', await fr.locator('img').get_attribute('src'))
        await pg.screenshot(path=OUT+'email.png')
        await pg.click('.fv button:has-text("Door survey.pdf")'); await pg.wait_for_timeout(2000)
        print('nested pdf canvases:', await pg.locator('.fv >> nth=1').locator('canvas').count())
        await pg.click('.fv >> nth=1 >> .fv-bar button[aria-label="Back"]'); await pg.wait_for_timeout(300)
        print('back to email:', await pg.locator('.fv').count()==1, 'dialogs (script blocked):', dialogs, 'errors', errs)
        await b.close()
asyncio.run(main())
