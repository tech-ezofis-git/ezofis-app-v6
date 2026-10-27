import os
import asyncio, json, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import SESSION, URL, OUT, H
D=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures') + '/'
FILES={'f-docx':('quote.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'),'f-xlsx':('po.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
       'f-pptx':('review.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation'),'f-msg':('mail.msg','application/vnd.ms-outlook')}
# mail.msg is optional (drop any Outlook .msg into fixtures/ to test the .msg viewer)
FILES={k: v for k, v in FILES.items() if os.path.exists(D + v[0])}
async def handler(route):
    req=route.request
    if req.method=='OPTIONS': return await route.fulfill(status=204,headers=H)
    u=urllib.parse.urlparse(req.url); path=u.path[len('/api'):]; qs=dict(urllib.parse.parse_qsl(u.query))
    for k,(fn,ct) in FILES.items():
        if path.endswith(f'/items/{k}/file'): return await route.fulfill(status=200, headers={**H,'Content-Type':ct}, body=open(D+fn,'rb').read())
    if path.endswith('/attachments') and req.method=='GET':
        return await route.fulfill(status=200, headers=H, body=json.dumps({'attachments':[{'id':k,'fileName':fn,'contentType':ct,'fileSize':1000,'repositoryId':'repo-exp','itemId':k} for k,(fn,ct) in FILES.items()]}))
    s,d=M.handle(req.method, path, qs, None)
    if isinstance(d, tuple): return await route.fulfill(status=s, headers={**H,'Content-Type':d[2]}, body=d[1])
    await route.fulfill(status=s,headers=H,body=json.dumps(d))
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':780}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        await pg.click('[role=tab][aria-label^="Attachments"]')
        for k,(fn,ct) in FILES.items():
            await pg.click(f'button[aria-label="Open {fn}"]'); await pg.wait_for_timeout(3000)
            v=pg.locator('.fv'); txt=await v.inner_text()
            frames=[await f.locator('body').inner_text() for f in [pg.frame_locator('.fv .mail-frame')] if await pg.locator('.fv .mail-frame').count()]
            print(fn, '| error' if 'couldn' in txt else '| ok', '|', (txt.replace('\n',' / ')[:200]), '| frame:', (frames[0][:150].replace('\n',' / ') if frames else '-'))
            await pg.screenshot(path=OUT+'office-'+fn+'.png')
            await pg.click('.fv-bar button[aria-label="Close"]'); await pg.wait_for_timeout(300)
        print('errors', errs)
        await b.close()
asyncio.run(main())
