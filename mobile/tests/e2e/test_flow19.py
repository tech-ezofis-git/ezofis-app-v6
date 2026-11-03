import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Field settings, phase 2 (controls.jsx ruleError / limits, formRules.js): content rules, text length, number range /
# integer / decimals, date and time limits, prefix / suffix, help text, tooltip, hidden label, and the show / read-only /
# mandatory rules (enableSettings, readonlySettings, mandatorySettings, settings.logic) on New request and the Edit form.
# The fields are added to the mock in this process only.
V = lambda **k: {'validation': k}
P2 = [
    {'id': 'p-code', 'label': 'Cost Code', 'type': 'SHORT_TEXT', 'settings': {'general': {'description': 'Three to six letters or numbers.', 'tooltip': 'Ask finance if you are not sure.'}, 'specific': {'prefixLabel': 'CC-'}, 'validation': {'contentRule': 'ALPHA_NUMERIC', 'rangeType': 'RANGE', 'minimum': 3, 'maximum': 6}}},
    {'id': 'p-qty', 'label': 'Quantity', 'type': 'NUMBER', 'settings': {'specific': {'suffixLabel': 'pcs'}, 'validation': {'contentRule': 'INTEGER', 'minimum': 1, 'maximum': 10}}},
    {'id': 'p-rate', 'label': 'Rate', 'type': 'NUMBER', 'settings': V(decimalDigits=2)},
    {'id': 'p-date', 'label': 'Travel Date', 'type': 'DATE', 'settings': V(dateLimitType='RANGE', fixedStartDate='2026-01-01', fixedEndDate='2026-12-31')},
    {'id': 'p-time', 'label': 'Departure', 'type': 'TIME', 'settings': V(timeLimitType='RANGE', fixedStartTime='09:00', fixedEndTime='17:00', timeFormat='12')},
    {'id': 'p-trip', 'label': 'Trip Type', 'type': 'SINGLE_SELECT', 'settings': {'specific': {'optionsType': 'CUSTOM', 'customOptions': 'Domestic,International'},
        'validation': {'enableSettings': [{'value': 'International', 'controls': ['p-passport']}], 'mandatorySettings': [{'value': 'International', 'controls': ['p-passport']}], 'readonlySettings': [{'value': 'Domestic', 'controls': ['p-notes']}]}}},
    {'id': 'p-passport', 'label': 'Passport No', 'type': 'SHORT_TEXT', 'settings': {}},
    {'id': 'p-notes', 'label': 'Trip Notes', 'type': 'LONG_TEXT', 'settings': {}},
    {'id': 'p-big', 'label': 'Bulk Reason', 'type': 'SHORT_TEXT', 'settings': {'logic': [{'action': 'SHOW', 'fieldId': 'p-qty', 'operator': 'GREATER_THAN', 'value': 5}]}},
    {'id': 'p-nolabel', 'label': 'Secret Label', 'type': 'SHORT_TEXT', 'settings': {'general': {'hideLabel': True, 'placeholder': 'Reference'}}},
]
M.FORMS['form-exp']['formJson']['panels'][0]['fields'] += P2
M.STATE['inbox'][0]['formData'].update({'p-trip': 'Domestic', 'p-notes': 'Hotel near office', 'p-qty': '3', 'p-code': 'AB12'})

async def errs_text(pg): return await pg.inner_text('.main')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1300)
        t=await errs_text(pg)
        print('HELP text:', 'Three to six letters or numbers.' in t, '| tooltip hidden first:', 'Ask finance' not in t)
        await pg.click('button[aria-label="About Cost Code"]'); await pg.wait_for_timeout(150)
        print('TOOLTIP opens:', 'Ask finance if you are not sure.' in await errs_text(pg))
        print('PREFIX/SUFFIX:', await pg.locator('.ctl-money:has(#nf-p-code) .cur').first.inner_text(), await pg.locator('.ctl-money:has(#nf-p-qty) .cur.suf').inner_text())
        print('HIDDEN label:', 'Secret Label' not in t, await pg.get_attribute('#nf-p-nolabel', 'placeholder'))
        print('LIMITS on pickers:', await pg.get_attribute('#nf-p-date', 'min'), await pg.get_attribute('#nf-p-date', 'max'), await pg.get_attribute('#nf-p-time', 'min'), await pg.get_attribute('#nf-p-time', 'max'))
        print('SHOW rule: passport hidden until International:', await pg.locator('#nf-p-passport').count() == 0, '| bulk reason hidden:', await pg.locator('#nf-p-big').count() == 0)
        # base required fields of the mock form
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        # bad values
        await pg.fill('#nf-p-code', 'a$'); await pg.fill('#nf-p-qty', '2.5'); await pg.fill('#nf-p-rate', '1.234'); await pg.fill('#nf-p-date', '2025-05-01'); await pg.fill('#nf-p-time', '08:00')
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(500); t=await errs_text(pg)
        print('RULES block submit:', 'Use letters and numbers only' in t, 'Use a whole number' in t, 'Use at most 2 decimal places' in t, 'Pick a date on or after 01 Jan 2026' in t, 'Pick a time at or after 9:00 AM' in t, len(M.STATE['started']) == 0)
        await pg.fill('#nf-p-code', 'ab'); await pg.fill('#nf-p-qty', '20'); await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(400); t=await errs_text(pg)
        print('LENGTH / RANGE:', 'Use at least 3 characters' in t, 'Should be at most 10' in t)
        print('LOGIC show (qty > 5):', await pg.locator('#nf-p-big').count() == 1)
        await pg.fill('#nf-p-code', 'AB12'); await pg.fill('#nf-p-qty', '4'); await pg.fill('#nf-p-rate', '1.25'); await pg.fill('#nf-p-date', '2026-11-03'); await pg.fill('#nf-p-time', '10:30')
        print('LOGIC hides again:', await pg.locator('#nf-p-big').count() == 0)
        await pg.select_option('select#nf-p-trip', 'International'); await pg.wait_for_timeout(200)
        lab=await pg.inner_text('label[for="nf-p-passport"]') if await pg.locator('label[for="nf-p-passport"]').count() else ''
        print('SHOW + MANDATORY rule:', await pg.locator('#nf-p-passport').count() == 1, '*' in lab)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(400)
        print('Passport required:', 'Passport No is required' in await errs_text(pg), len(M.STATE['started']) == 0)
        await pg.fill('#nf-p-passport', 'X1234567'); await pg.fill('#nf-p-notes', 'Conference')
        await pg.select_option('select#nf-p-trip', 'Domestic'); await pg.wait_for_timeout(200)
        print('READ-ONLY rule:', await pg.get_attribute('#nf-p-notes', 'readonly') is not None, '| passport hidden again:', await pg.locator('#nf-p-passport').count() == 0)
        await pg.screenshot(path=OUT+'p2-new.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        fd=M.STATE['started'][-1]['formData'] if M.STATE['started'] else {}
        print('PAYLOAD:', fd.get('p-code'), fd.get('p-qty'), fd.get('p-rate'), fd.get('p-date'), fd.get('p-time'), fd.get('p-trip'), '| hidden passport not sent:', 'p-passport' not in fd)
        # approver Edit form: same rules on the request values
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000)
        await pg.click('[role=tab]:has-text("Form")'); await pg.click('button[aria-label="Edit form"]'); await pg.wait_for_timeout(700)
        t=await errs_text(pg)
        print('EDIT rules:', await pg.get_attribute('#f-p-notes', 'readonly') is not None, 'Passport No' not in t, 'Three to six letters or numbers.' in t, await pg.get_attribute('#f-p-date', 'min'))
        await pg.fill('#f-p-qty', '12'); await pg.fill('#f-p-code', 'A-1'); await pg.click('text=Keep changes'); await pg.wait_for_timeout(400); t=await errs_text(pg)
        print('EDIT blocks bad values:', 'Should be at most 10' in t, 'Use letters and numbers only' in t, 'Edit form' in t)
        await pg.screenshot(path=OUT+'p2-edit.png', full_page=True)
        await pg.fill('#f-p-qty', '7'); await pg.fill('#f-p-code', 'A1B'); await pg.click('text=Keep changes'); await pg.wait_for_timeout(600)
        print('EDIT saves good values:', 'You edited 2 fields' in await errs_text(pg))
        await pg.set_viewport_size({'width': 320, 'height': 700}); await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        print('320px no h-scroll:', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
