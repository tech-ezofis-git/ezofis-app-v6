import os
import asyncio, json, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from playwright.async_api import async_playwright
OUT=os.environ.get('SHOTS', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')) + '/'; os.makedirs(OUT, exist_ok=True)
URL='file://' + os.environ.get('APP_HTML', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'dist-single', 'index.html')))
H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*','Content-Type':'application/json'}
async def handler(route):
    req=route.request
    if req.method=='OPTIONS': return await route.fulfill(status=204,headers=H)
    u=urllib.parse.urlparse(req.url); path=u.path[len('/api'):]; qs=dict(urllib.parse.parse_qsl(u.query))
    body=None
    if req.post_data and 'json' in (req.headers.get('content-type') or ''): body=json.loads(req.post_data)
    elif 'multipart' in (req.headers.get('content-type') or ''): body={'__multipart': req.post_data_buffer.decode('latin1')}
    if path.startswith('/form/') or path.startswith('/uploadAndIndex'): assert req.headers.get('x-tenant-id')=='t1'
    assert req.headers.get('authorization')=='Bearer jwt', ('auth', path); assert path == '/me/tenants' or req.headers.get('x-tenant-id')=='t1', ('tenant', path)  # /me/tenants is per user, no tenant
    s,d=M.handle(req.method, path, qs, body)
    if isinstance(d, tuple) and d[0]=='bytes': return await route.fulfill(status=s, headers={**H, 'Content-Type': d[2]}, body=d[1])
    await route.fulfill(status=s,headers=H,body=json.dumps(d))
SESSION=json.dumps({'accessToken':'jwt','tokenType':'Bearer','userId':'u1','expiresAt':4102444800000,'tenantId':'t1','tenantName':'EZOFIS Admin','role':'Lawyers','email':'student.lawyer@example.com'})
def calls(pfx): return [c for c in M.STATE['calls'] if c[1].startswith(pfx)]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/home'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('HOME:', 'STUDENT LAWYER' in t.upper(), '44 requests waiting' in t, 'No AI exceptions in Expense' in t, 'Open by workflow' in t)
        await pg.screenshot(path=OUT+'live-home.png', full_page=True)
        # 1 inbox all workflows
        await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('INBOX:', 'Expense Reimbursement' in t, 'CIBC Visa Card' in t, 'Show all 42' in t, 'Inbox · 44' in t, 'Duplicate' in t, 'CAD 949.20' in t)
        await pg.screenshot(path=OUT+'live-inbox.png')
        # 2 detail
        await pg.click('text=EXP-2026-92'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('DETAIL:', 'Expense Form' in t, 'Paid Via' in t, 'Merchant' in t, 'Beertown Public House' in t, 'Divider' not in t, 'Approve' in t, 'Waiting on you' in t)
        await pg.screenshot(path=OUT+'live-detail.png')
        await pg.click('[role=tab]:has-text("Chat")'); await pg.fill('input[aria-label="Add a comment"]','Looks fine'); await pg.click('button[aria-label="Send comment"]'); await pg.wait_for_timeout(600)
        t=await pg.inner_text('.main'); print('COMMENT:', 'Looks fine' in t, [c[3] for c in calls('/Workflows/') if c[0]=='POST' and c[1].endswith('/comments')])
        await pg.click('[role=tab]:has-text("History")'); await pg.wait_for_timeout(200); t=await pg.inner_text('.main'); print('HISTORY:', 'Moved to Approver' in t, 'Student Lawyer' in t)
        await pg.click('[role=tab]:has-text("Files")'); await pg.wait_for_timeout(200); t=await pg.inner_text('.main'); print('FILES:', 'BeerTown Food receipt' in t, '88 KB' in t)
        # 3 edit then approve
        await pg.click('[role=tab]:has-text("Form")'); await pg.click('button[aria-label="Edit form"]'); await pg.wait_for_timeout(600)
        t=await pg.inner_text('.main'); print('EDIT fields:', 'Position' in t, 'Description' in t, 'Paid Via' not in t)
        await pg.fill('textarea', 'Client lunch'); await pg.click('text=Keep changes'); await pg.wait_for_timeout(700)
        t=await pg.inner_text('.main'); print('DRAFT banner:', 'You edited 1 field' in t, 'Client lunch' in t)
        await pg.click('.actionbar button:has-text("Approve")'); await pg.wait_for_timeout(200); await pg.click('.sheet button.btn.primary, .sheet button.btn.colored'); await pg.wait_for_timeout(1000)
        mv=[c for c in M.STATE['calls'] if c[1].endswith('/move-next')]; print('MOVE-NEXT:', mv[-1][1], {k:(v if k!='formData' else {kk:vv for kk,vv in v.items() if kk==M.F['desc']}) for k,v in mv[-1][3].items()})
        t=await pg.inner_text('.screen'); print('DONE:', 'Approve done' in t, 'is now complete' in t, 'NEXT IN YOUR INBOX' in t.upper())
        await pg.screenshot(path=OUT+'live-done.png')
        # 4 reject needs comment
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-2'); await pg.wait_for_timeout(900)
        await pg.click('.actionbar button:has-text("Reject")'); await pg.click('.sheet button.btn.danger, .sheet button.btn.colored'); await pg.wait_for_timeout(200)
        t=await pg.inner_text('.sheet'); print('REJECT needs comment:', 'Add a comment' in t)
        await pg.keyboard.press('Escape')
        # 5 AP agent ticket: AI card + signature-only action blocked
        await pg.goto(URL+'#/app/inbox/'+M.AP+'~inst-ap-1'); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('AP:', 'AI agent' in t, 'Duplicate of INV-2026-3005' in t, 'Invoice No' in t, 'MATCHED' in t)
        await pg.screenshot(path=OUT+'live-ap.png')
        print('AP buttons:', await pg.locator('.actionbar button').all_inner_texts())
        await pg.click('.actionbar button:has-text("NON-INVOICE")')
        await pg.wait_for_timeout(300); t=await pg.inner_text('.sheet'); print('SIGNATURE blocked:', 'needs a signature' in t)
        await pg.keyboard.press('Escape')
        # 6 sent / completed across workflows, per workflow filter
        await pg.goto(URL+'#/app/inbox?tab=completed'); await pg.wait_for_timeout(1000)
        t=await pg.inner_text('.main'); print('COMPLETED all:', 'EXP-2026-92' in t, 'EXP-2026-93' in t, 'draft' not in [c[2].get('workflowId') for c in calls('/Workflows/completed')])
        await pg.goto(URL+'#/app/inbox?tab=sent&wf='+M.AP); await pg.wait_for_timeout(900)
        t=await pg.inner_text('.main'); print('SENT AP:', 'Accounts Payable' in t, 'Nothing you acted on' in t)
        # 7 401 -> login
        M.STATE['fail401']=True; await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1200)
        print('401 ->', pg.url.split('#')[1], await pg.evaluate("localStorage.getItem('ezofis.session')"))
        M.STATE['fail401']=False
        # 8 tablet split
        await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.set_viewport_size({'width':1180,'height':820}); await pg.goto(URL+'#/app/inbox'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'live-tablet.png')
        t=await pg.inner_text('.main'); print('TABLET split detail:', 'Expense Form' in t or 'AI agent' in t)
        # 9 explore mode (fresh app, no session) still uses sample data
        pg2=await ctx.new_page(); await pg2.goto(URL+'#/welcome'); await pg2.evaluate("localStorage.clear()"); await pg2.goto(URL+'#/app/inbox'); await pg2.reload(); await pg2.wait_for_timeout(800)
        t=await pg2.inner_text('.main'); print('SAMPLE mode:', 'INV-2026-3101' in t)
        print('page errors:', errs)
        await b.close()
if __name__ == "__main__": asyncio.run(main())
