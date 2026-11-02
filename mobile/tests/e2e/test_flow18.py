import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Field controls, phase 1 (src/controls.jsx): time, date-time, yes/no toggle, consent, divider, read-only values, link,
# currency, counter and phone on New request, the approver's Edit form and the folder metadata form.
# The new field types are added to the mock in this process only, so the other flows keep their fixtures.
CTL = [
    {'id': 'c-time', 'label': 'Pickup Time', 'type': 'TIME', 'settings': {'validation': {'fieldRule': 'REQUIRED', 'timeFormat': '12'}}},
    {'id': 'c-dt', 'label': 'Meeting Start', 'type': 'DATE_TIME', 'settings': {}},
    {'id': 'c-div2', 'label': 'Section', 'type': 'DIVIDER', 'settings': {}},
    {'id': 'c-yn', 'label': 'Billable', 'type': 'YES_NO_TOGGLE', 'settings': {'specific': {'customOptions': 'Yes,No', 'optionsType': 'CUSTOM'}}},
    {'id': 'c-url', 'label': 'Receipt Link', 'type': 'URL', 'settings': {}},
    {'id': 'c-cur', 'label': 'Tip Amount', 'type': 'CURRENCY_AMOUNT', 'settings': {'specific': {'defaultCurrency': 'CAD'}}},
    {'id': 'c-cnt', 'label': 'Guests', 'type': 'COUNTER', 'settings': {'specific': {'preventNegative': True}}},
    {'id': 'c-phone', 'label': 'Contact Phone', 'type': 'PHONE_NUMBER', 'settings': {'validation': {'fieldRule': 'REQUIRED'}}},
    {'id': 'c-score', 'label': 'Score', 'type': 'SCORE', 'settings': {}},
    {'id': 'c-consent', 'label': 'Declaration', 'type': 'CONSENT', 'settings': {'specific': {'customOptions': 'I confirm these details are correct', 'optionsType': 'CUSTOM'}, 'validation': {'fieldRule': 'REQUIRED'}}},
]
M.FORMS['form-exp']['formJson']['panels'][0]['fields'] += CTL
M.STATE['inbox'][0]['formData'].update({'c-dt': '2026-10-20 14:30', 'c-yn': True, 'c-cur': {'currency': 'CAD', 'value': 41.16}, 'c-phone': '+1 555 0100', 'c-score': '8'})
fld = M.fld
M.REPO_FIELDS['repo-ap'] += [fld(11, 'Received Time', 'ReceivedTime', 'TIME'), fld(12, 'Posted At', 'PostedAt', 'DATE_TIME'), fld(13, 'Portal Link', 'PortalLink', 'LINK'),
                             fld(14, 'Net Amount', 'NetAmount', 'CURRENCY_AMOUNT'), fld(15, 'Batch Ref', 'BatchRef', 'AUTO_GENERATED'), fld(16, 'Billing Address', 'BillingAddress', 'SHORT_TEXT')]
M.ITEMS[0]['fields'].update({'PostedAt': '2026-10-20T14:30:00', 'BatchRef': 'B-0042', 'ReceivedTime': '09:15:00'})

async def open_file(pg, repo, name):
    await pg.goto(URL + '#/app/folders'); await pg.wait_for_timeout(300)
    await pg.goto(URL + f'#/app/folders/r/{repo}?tab=files'); await pg.wait_for_timeout(1000)
    await pg.click(f'.file-row:has-text("{name}")'); await pg.wait_for_timeout(1500)
async def kind(pg, sel): return await pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}'); return e ? e.tagName.toLowerCase()+':'+(e.getAttribute('type')||e.getAttribute('role')||'') : null}})()")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        # ---- New request ----
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1300)
        t=await pg.inner_text('.main')
        print('NEW no blocking notice:', "can't fill yet" not in t, '| controls:', await kind(pg,'#nf-c-time'), await kind(pg,'#nf-c-dt'), await kind(pg,'#nf-c-yn'), await kind(pg,'#nf-c-url'), await kind(pg,'#nf-c-phone'), await kind(pg,'#nf-c-consent'))
        print('NEW divider shown:', await pg.locator('hr.ctl-divider').count() >= 1, '| score read-only:', await pg.locator('#nf-c-score.locked').count() == 1, '| currency code:', await pg.inner_text('.ctl-money .cur'), '| consent text:', 'I confirm these details are correct' in t)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(500)
        t=await pg.inner_text('.main'); print('NEW required:', 'Pickup Time is required' in t, 'Contact Phone is required' in t, 'Turn on Declaration to continue' in t, len(M.STATE['started']) == 0)
        await pg.fill('#nf-c-time', '14:05'); await pg.fill('#nf-c-dt', '2026-10-28T09:30'); await pg.click('#nf-c-yn')
        await pg.fill('#nf-c-url', 'not a link'); await pg.fill('#nf-c-cur', '12.50'); await pg.fill('#nf-c-phone', '+1 555 0100')
        at0=await pg.is_disabled('button[aria-label="Decrease"]')
        await pg.click('button[aria-label="Increase"]'); await pg.click('button[aria-label="Increase"]'); await pg.click('button[aria-label="Decrease"]')
        print('NEW counter:', await pg.input_value('#nf-c-cnt'), '| no negatives (decrease off at 0):', at0)
        await pg.click('#nf-c-consent')
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(500)
        t=await pg.inner_text('.main'); print('NEW link format checked:', 'Enter a web address' in t, len(M.STATE['started']) == 0)
        await pg.fill('#nf-c-url', 'example.com/receipt/1')
        await pg.screenshot(path=OUT+'ctl-new.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        fd=M.STATE['started'][-1]['formData'] if M.STATE['started'] else {}
        print('NEW payload:', {k: fd.get(k) for k in ('c-time', 'c-dt', 'c-yn', 'c-url', 'c-cur', 'c-cnt', 'c-phone', 'c-consent')})
        print('NEW payload shapes:', fd.get('c-time') == '14:05', fd.get('c-dt') == '2026-10-28 09:30', fd.get('c-yn') is True, fd.get('c-consent') is True, fd.get('c-cnt') == '1', fd.get('c-cur') == '12.50', 'c-score' not in fd)
        # ---- request detail + approver Edit form ----
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        t=await pg.inner_text('.main'); print('DETAIL display:', '20 Oct 2026, 2:30 PM' in t, 'CAD 41.16' in t, 'Billable' in t)
        await pg.click('[role=tab]:has-text("Form")'); await pg.click('button[aria-label="Edit form"]'); await pg.wait_for_timeout(700)
        t=await pg.inner_text('.main')
        print('EDIT shows new types:', 'Meeting Start' in t, 'Billable' in t, 'Contact Phone' in t, 'Tip Amount' in t, 'Score' not in t, 'Paid Via' not in t)
        print('EDIT prefilled:', await pg.input_value('#f-c-dt'), await pg.get_attribute('#f-c-yn', 'aria-checked'), await pg.input_value('#f-c-cur'), await pg.input_value('#f-c-phone'))
        await pg.click('#f-c-yn'); await pg.fill('#f-c-cur', '45'); await pg.fill('#f-c-dt', '2026-10-21T08:00')
        await pg.screenshot(path=OUT+'ctl-edit.png', full_page=True)
        await pg.click('text=Keep changes'); await pg.wait_for_timeout(700)
        t=await pg.inner_text('.main'); print('EDIT draft banner:', 'You edited 3 fields' in t)
        await pg.click('.actionbar button:has-text("Approve")'); await pg.wait_for_timeout(200); await pg.click('.sheet button.btn.primary, .sheet button.btn.colored'); await pg.wait_for_timeout(1000)
        mv=[c for c in M.STATE['calls'] if c[1].endswith('/move-next')]; mf=mv[-1][3]['formData'] if mv else {}
        print('EDIT sent:', mf.get('c-yn') is False, mf.get('c-cur') == {'currency': 'CAD', 'value': '45'}, mf.get('c-dt') == '2026-10-21 08:00', mf.get('c-phone') == '+1 555 0100')
        # ---- folder metadata form ----
        await open_file(pg, 'repo-ap', 'INV-2026-4001')
        await pg.click('.fv-actions button:has-text("Edit details")'); await pg.wait_for_timeout(1200)
        print('META controls:', await kind(pg,'[id="md-Received Time"]'), await kind(pg,'[id="md-Posted At"]'), await kind(pg,'[id="md-Portal Link"]'), await kind(pg,'[id="md-Billing Address"]'), await pg.locator('.ctl-money').count() == 1)
        print('META values kept:', await pg.input_value('[id="md-Received Time"]'), await pg.input_value('[id="md-Posted At"]'), '| auto-generated read-only:', 'B-0042' in await pg.inner_text('.sheet'), await pg.locator('[id="md-Batch Ref"].locked').count() == 1)
        await pg.fill('[id="md-Portal Link"]', 'bad link'); await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(400)
        print('META link checked:', 'Enter a web address' in await pg.inner_text('.sheet'))
        await pg.fill('[id="md-Portal Link"]', 'https://example.com/inv/4001'); await pg.fill('[id="md-Posted At"]', '2026-10-22T16:45'); await pg.fill('[id="md-Received Time"]', '10:20')
        await pg.screenshot(path=OUT+'ctl-meta.png', full_page=True)
        await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(800)
        pb=(M.STATE.get('patches') or [{}])[-1]
        print('META PATCH:', pb.get('PortalLink'), pb.get('PostedAt'), pb.get('ReceivedTime'), 'BatchRef' not in pb)
        # narrow phone width: nothing overflows
        await pg.set_viewport_size({'width': 320, 'height': 700}); await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        print('320px no h-scroll:', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        await pg.screenshot(path=OUT+'ctl-new-320.png', full_page=True)
        print('errors', errs)
        await b.close()
asyncio.run(main())
