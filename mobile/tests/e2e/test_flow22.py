import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Sections and rules on New request, modelled on the "New Packaging Requisition" form: each section is a card with its
# mandatory progress; a field shown by an enableSettings rule that names it by jsonId (V5 style); a form-level rule
# (settings.rules) showing a field; a section shown only for "Obsolete"; and the "Packaging components" multi-choice
# pre-selected from the brand master row picked in Variant (masterPreselect*, column given by label).
# The form replaces the expense form in this process only.
GB, GV, GC = 'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000003'
REQ = {'validation': {'fieldRule': 'REQUIRED'}}
def choice(i, label, opts, extra=None, req=True):
    st = {'specific': {'optionsType': 'CUSTOM', 'customOptions': ','.join(opts)}, 'validation': {'fieldRule': 'REQUIRED' if req else 'OPTIONAL'}}
    for k, v in (extra or {}).items(): st.setdefault(k, {}).update(v)
    return {'id': i, 'label': label, 'type': 'SINGLE_CHOICE', 'settings': st}
COMPS = ['Bottle', 'Cap', 'Pump', 'Tube', 'Outer Carton', 'Inner Carton', 'Unit Box', 'Label (Front / Wrap around)', 'Label(Back)', 'Wrapper', 'P.O.S Material / Others']
FORM = {'panels': [
    {'id': 'pn-1', 'settings': {'title': 'New Packaging Requisition'}, 'fields': [
        choice('k-act', 'Action Type', ['New Packaging Requisition', 'Change of Name', 'Change of Design', 'Update TBA Details', 'Obsolete'],
               {'validation': {'enableSettings': [{'value': 'Change of Name', 'controls': ['oldNameJson']}, {'value': 'Obsolete', 'controls': ['pn-obs']}]}}),
        {'id': 'k-old', 'jsonId': 'oldNameJson', 'label': 'Previous Name', 'type': 'SHORT_TEXT', 'settings': REQ},
        choice('k-unit', 'Company Unit', ['Amlion Personal Care', 'Amlion Toothpaste']),
        choice('k-ptype', 'Product Type', ['Single', 'Combo']),
        {'id': 'k-combo', 'label': 'Combo Items', 'type': 'SHORT_TEXT', 'settings': {}}]},
    {'id': 'pn-2', 'settings': {'title': 'Product Description'}, 'fields': [
        {'id': 'k-brand', 'label': 'Brand', 'type': 'SINGLE_SELECT', 'settings': {'specific': {'optionsType': 'MASTER', 'masterFormId': 'mf-brand', 'masterFormColumn': GB}, 'validation': {'fieldRule': 'REQUIRED'}}},
        {'id': 'k-var', 'label': 'Variant', 'type': 'SINGLE_SELECT', 'settings': {'specific': {'optionsType': 'MASTER', 'masterFormId': 'mf-brand', 'masterFormColumn': GV, 'masterFormParentColumn': 'k-brand'}, 'validation': {'fieldRule': 'REQUIRED'}}},
        {'id': 'k-type', 'label': 'Type of Product', 'type': 'SHORT_TEXT', 'settings': {}},
        {'id': 'k-size', 'label': 'Size', 'type': 'SHORT_TEXT', 'settings': REQ},
        {'id': 'k-comps', 'label': 'Packaging components required', 'type': 'MULTIPLE_CHOICE', 'settings': {'specific': {'optionsType': 'CUSTOM', 'customOptions': ','.join(COMPS),
            'masterPreselectEnabled': True, 'masterPreselectSourceFieldId': 'k-var', 'masterPreselectColumn': 'Components'}}}]},
    {'id': 'pn-obs', 'settings': {'title': 'Obsolete Details'}, 'fields': [
        {'id': 'k-why', 'label': 'Reason for obsolete', 'type': 'LONG_TEXT', 'settings': REQ}]}],
    'settings': {'rules': [{'id': 'r1', 'conditions': [{'fieldId': 'k-ptype', 'operator': 'EQUALS', 'value': 'Combo'}], 'actions': [{'type': 'SHOW', 'targetFieldId': 'k-combo'}], 'elseActions': [{'type': 'HIDE', 'targetFieldId': 'k-combo'}]},
                           {'id': 'calc', 'calculations': [{'fieldId': 'x', 'formula': '1'}]}]}}
M.FORMS['form-exp'] = {'name': 'Packaging Form', 'formJson': FORM}
M.FORMS['mf-brand'] = {'name': 'Brand Master', 'formJson': {'panels': [{'fields': [{'id': GB, 'label': 'Brand', 'type': 'SHORT_TEXT'}, {'id': GV, 'label': 'Variant', 'type': 'SHORT_TEXT'}, {'id': GC, 'label': 'Components', 'type': 'MULTIPLE_CHOICE'}]}]}}
M.EX.MASTERS['mf-brand'] = [{GB: 'Amlion', GV: 'Mint 100g', GC: ['Tube', 'Cap', 'Unit Box']}, {GB: 'Amlion', GV: 'Herbal 200ml', GC: 'Bottle, Pump, Label(Back)'}, {GB: 'Glow', GV: 'Rose 50ml', GC: ['Bottle', 'Cap']}]

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1500)
        secs=[await x.inner_text() for x in await pg.locator('.nr-sec-h .tt b:first-child').all()]
        print('SECTIONS:', secs, '| counts:', [await x.inner_text() for x in await pg.locator('.nr-sec-h .cnt').all()])
        print('HIDDEN at start:', await pg.locator('#nf-k-old').count() == 0, await pg.locator('#nf-k-combo').count() == 0, 'Obsolete Details' not in secs)
        await pg.screenshot(path=OUT+'sec-start.png', full_page=True)
        await pg.click('section[aria-label="New Packaging Requisition"] button[role=radio]:has-text("Change of Name")'); await pg.wait_for_timeout(200)
        print('SHOW by jsonId rule:', await pg.locator('#nf-k-old').count() == 1)
        await pg.click('section[aria-label="New Packaging Requisition"] button[role=radio]:has-text("Obsolete")'); await pg.wait_for_timeout(200)
        secs=[await x.inner_text() for x in await pg.locator('.nr-sec-h .tt b:first-child').all()]
        print('SECTION shown by rule:', 'Obsolete Details' in secs, '| previous name hidden again:', await pg.locator('#nf-k-old').count() == 0)
        await pg.click('button[role=radio]:has-text("Combo")'); await pg.wait_for_timeout(200)
        print('FORM rule shows Combo Items:', await pg.locator('#nf-k-combo').count() == 1)
        await pg.click('button[role=radio]:has-text("Single")'); await pg.wait_for_timeout(200)
        print('FORM rule else hides it:', await pg.locator('#nf-k-combo').count() == 0)
        # linked multi-choice
        await pg.select_option('select#nf-k-brand', 'Amlion'); await pg.wait_for_timeout(200)
        await pg.select_option('select#nf-k-var', 'Mint 100g'); await pg.wait_for_timeout(300)
        on=lambda: pg.evaluate("[...document.querySelectorAll('section[aria-label=\"Product Description\"] .choice-row .chip[aria-pressed=true]')].map(x=>x.textContent)")
        print('PRESELECT (array cell):', await on())
        await pg.select_option('select#nf-k-var', 'Herbal 200ml'); await pg.wait_for_timeout(300)
        print('PRESELECT (text cell):', await on())
        await pg.click('section[aria-label="Product Description"] .chip:has-text("Wrapper")'); await pg.wait_for_timeout(100)
        print('USER change kept:', 'Wrapper' in await on())
        # collapse / progress
        await pg.click('section[aria-label="Product Description"] .nr-sec-h'); await pg.wait_for_timeout(100)
        print('COLLAPSE:', await pg.locator('#nf-k-size').count() == 0)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(500)
        t=await pg.inner_text('.main')
        print('SUBMIT opens sections + errors:', await pg.locator('#nf-k-size').count() == 1, 'Size is required' in t, 'Reason for obsolete is required' in t, 'Previous Name is required' not in t, len(M.STATE['started']) == 0)
        await pg.fill('#nf-k-size', '100 g'); await pg.fill('#nf-k-why', 'Discontinued'); await pg.click('button[role=radio]:has-text("Amlion Toothpaste")'); await pg.wait_for_timeout(200)
        print('PROGRESS:', [await x.inner_text() for x in await pg.locator('.nr-sec-h .cnt').all()])
        await pg.screenshot(path=OUT+'sec-filled.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        fd=M.STATE['started'][-1]['formData'] if M.STATE['started'] else {}
        print('PAYLOAD:', fd.get('k-act'), fd.get('k-var'), fd.get('k-comps'), fd.get('k-why'), '| hidden not sent:', 'k-old' not in fd and 'k-combo' not in fd, '| no helper keys:', not any(k.startswith('__') for k in fd))
        print('errors', errs)
        await b.close()
asyncio.run(main())
