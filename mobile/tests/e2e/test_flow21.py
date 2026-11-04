import os
import asyncio, json, sys, subprocess, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
from PIL import Image
# Phase 4: dropdown sources (DYNAMIC options list, REPOSITORY field values scoped by a parent field), FIXED-row tables with
# row labels and column totals, QR / barcode scan into fields (settings.specific.qrValue) and a folder BARCODE field,
# and typed folder-table columns from the field settings. The fields are added to the mock in this process only.
HERE = os.path.dirname(os.path.abspath(__file__))
def qr_png(text):
    d = tempfile.mkdtemp(); pgm = os.path.join(d, 'q.pgm'); png = os.path.join(d, 'q.png')
    subprocess.run(['node', os.path.join(HERE, 'fixtures', 'make_qr.cjs'), text, pgm], check=True)
    Image.open(pgm).save(png); return png

S = lambda **k: {'specific': k}
P4 = [
    {'id': 'q-size', 'label': 'Package Size', 'type': 'SINGLE_SELECT', 'settings': S(optionsType='DYNAMIC', options=[{'id': 'S', 'name': 'Small'}, {'id': 'L', 'name': 'Large'}])},
    {'id': 'q-sup', 'label': 'Supplier', 'type': 'SINGLE_SELECT', 'settings': S(optionsType='REPOSITORY', repositoryId='repo-ap', repositoryField='Supplier')},
    {'id': 'q-doc', 'label': 'Document Kind', 'type': 'SINGLE_SELECT', 'settings': S(optionsType='REPOSITORY', repositoryId='repo-ap', repositoryField='DocumentType', repositoryFieldParent='q-sup')},
    {'id': 'q-sku', 'label': 'Item SKU', 'type': 'SHORT_TEXT', 'settings': S(qrValue=True)},
    {'id': 'q-qty', 'label': 'Scanned Quantity', 'type': 'NUMBER', 'settings': S(qrValue=True)},
    {'id': 'q-tbl', 'label': 'Trip Costs', 'type': 'TABLE', 'settings': S(rowsType='FIXED', fixedRowCount=3, tableFixedRowLabels=['Flight', 'Hotel', 'Meals'], tableColumns=[
        {'id': 'q-lbl', 'label': 'Item', 'type': 'LABEL'}, {'id': 'q-amt', 'label': 'Amount', 'type': 'NUMBER', 'settings': S(showColumnTotal=True)}, {'id': 'q-when', 'label': 'Date', 'type': 'DATE'}])},
]
M.FORMS['form-exp']['formJson']['panels'][0]['fields'] += P4
fld = M.fld
TBL = {'general': {}, 'specific': {'tableColumns': [{'label': 'Item', 'type': 'SHORT_TEXT'}, {'label': 'Cost', 'type': 'NUMBER', 'settings': {'validation': {'fieldRule': 'REQUIRED'}}}, {'label': 'Charged On', 'type': 'DATE'}]}, 'validation': {}}
M.REPO_FIELDS['repo-ap'] += [fld(17, 'Asset Tag', 'AssetTag', 'BARCODE'), fld(18, 'Charges', 'Charges', 'TABLE', 0, False, False, TBL)]

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1500)
        opts=lambda sel: pg.evaluate(f"[...document.querySelectorAll('{sel} option')].map(o=>o.value+'='+o.textContent).filter(x=>!x.startsWith('='))")
        print('DYNAMIC options:', await opts('select#nf-q-size'))
        sup=await opts('select#nf-q-sup'); print('REPOSITORY options:', sup, 'Nexus Industrial=Nexus Industrial' in sup)
        print('PARENT empty → child waits:', await pg.inner_text('select#nf-q-doc option'), await pg.is_disabled('select#nf-q-doc'))
        await pg.select_option('select#nf-q-sup', 'Nexus Industrial'); await pg.wait_for_timeout(700)
        print('CHILD scoped by parent:', await opts('select#nf-q-doc'), [f for f in M.STATE.get('facets', []) if f[0] == 'DocumentType'][-1:])
        # fixed rows
        t=await pg.inner_text('.main')
        print('FIXED rows:', await pg.locator('.nr-trow').count(), 'Flight' in t and 'Hotel' in t and 'Meals' in t, 'Trip Costs' in t, await pg.locator('section.nr-table:has-text("Trip Costs") button:has-text("Add row")').count() == 0, await pg.locator('section.nr-table:has-text("Trip Costs") button[aria-label^="Delete row"]').count() == 0)
        amts=pg.locator('section.nr-table:has-text("Trip Costs") .nr-trow input[inputmode=decimal]')
        await amts.nth(0).fill('450'); await amts.nth(1).fill('320.5'); await amts.nth(2).fill('80'); await pg.wait_for_timeout(200)
        print('TOTAL:', await pg.inner_text('[aria-label="Trip Costs totals"]'))
        # scan a QR photo into a text field and a number field
        await pg.set_input_files('.field:has(#nf-q-sku) input[type=file][capture]', qr_png('SKU-4471')); await pg.wait_for_timeout(2500)
        print('SCAN text:', await pg.input_value('#nf-q-sku'))
        await pg.set_input_files('.field:has(#nf-q-qty) input[type=file][capture]', qr_png('not a number')); await pg.wait_for_timeout(2500)
        print('SCAN wrong type reported:', "doesn't fit this field" in await pg.inner_text('.field:has(#nf-q-qty)'), repr(await pg.input_value('#nf-q-qty')))
        await pg.set_input_files('.field:has(#nf-q-qty) input[type=file][capture]', qr_png('12')); await pg.wait_for_timeout(2500)
        print('SCAN number:', await pg.input_value('#nf-q-qty'))
        await pg.screenshot(path=OUT+'p4-new.png', full_page=True)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        await pg.select_option('select#nf-q-size', 'L'); await pg.select_option('select#nf-q-doc', 'Invoice')
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(1500)
        fd=M.STATE['started'][-1]['formData'] if M.STATE['started'] else {}
        print('PAYLOAD:', fd.get('q-size'), fd.get('q-sup'), fd.get('q-doc'), fd.get('q-sku'), fd.get('q-qty'), [(r.get('q-lbl'), r.get('q-amt')) for r in fd.get('q-tbl', [])])
        # folder: barcode field with scan, typed table columns from the field settings
        await pg.goto(URL + '#/app/folders/r/repo-ap?tab=files'); await pg.wait_for_timeout(1000)
        await pg.click('.file-row:has-text("INV-2026-4001")'); await pg.wait_for_timeout(1500)
        await pg.click('.fv-actions button:has-text("Edit details")'); await pg.wait_for_timeout(1200)
        await pg.set_input_files('.field:has([id="md-Asset Tag"]) input[type=file][capture]', qr_png('TAG-0099')); await pg.wait_for_timeout(2500)
        print('META barcode scan:', await pg.input_value('[id="md-Asset Tag"]'))
        await pg.click('.field:has-text("Charges") .mt-tools .chip:has-text("Add row")'); await pg.wait_for_timeout(200)
        print('META typed cells:', await pg.locator('[id="mt-Charges-0-Cost"]').get_attribute('inputmode'), await pg.locator('[id="mt-Charges-0-Charged On"]').get_attribute('type'), 'Cost *' in (await pg.inner_text('.field:has-text("Charges")')).replace('\n', ' '))
        await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(400)
        print('META column required:', 'Row 1: Cost is required' in await pg.inner_text('.sheet'))
        await pg.fill('[id="mt-Charges-0-Cost"]', 'abc'); await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(400)
        print('META column rule:', 'Row 1: Cost · Enter a number' in await pg.inner_text('.sheet'))
        await pg.fill('[id="mt-Charges-0-Cost"]', '75'); await pg.fill('[id="mt-Charges-0-Charged On"]', '2026-10-02')
        await pg.screenshot(path=OUT+'p4-meta.png', full_page=True)
        await pg.click('.sheet .btn.primary:has-text("Save")'); await pg.wait_for_timeout(800)
        pb=(M.STATE.get('patches') or [{}])[-1]
        print('META PATCH:', pb.get('AssetTag'), json.loads(pb.get('Charges', '{"data":[]}'))['data'])
        print('errors', errs)
        await b.close()
asyncio.run(main())
