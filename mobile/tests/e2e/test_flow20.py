import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
# Field controls, phase 3 (controls.jsx): full name / contact / address as text (as the web stores them), country dial
# code with a default, star rating (half stars), opinion scale 0-10 with labels, signature pad, and a file field that
# takes several files (first in the field, the rest go to Attachments, as on the web). Added to the mock in-process only.
P3 = [
    {'id': 'c-name', 'label': 'Traveller Name', 'type': 'FULL_NAME', 'settings': {'validation': {'fieldRule': 'REQUIRED'}}},
    {'id': 'c-addr', 'label': 'Home Address', 'type': 'ADDRESS', 'settings': {}},
    {'id': 'c-cc', 'label': 'Dial Code', 'type': 'COUNTRY_CODE', 'settings': {'specific': {'defaultCountryCode': '+971'}}},
    {'id': 'c-rate', 'label': 'Hotel Rating', 'type': 'RATING', 'settings': {'specific': {'iconCount': 5, 'allowHalfRating': True}}},
    {'id': 'c-op', 'label': 'Trip Experience', 'type': 'OPINION_SCALE', 'settings': {'specific': {'opinionLabels': {'min': 'Poor', 'mid': 'Okay', 'max': 'Great'}}}},
    {'id': 'c-sig', 'label': 'Employee Signature', 'type': 'SIGNATURE', 'settings': {'validation': {'fieldRule': 'REQUIRED'}}},
    {'id': 'c-files', 'label': 'Supporting Documents', 'type': 'FILE_UPLOAD', 'settings': {'specific': {'allowMultipleFiles': True}}},
]
M.FORMS['form-exp']['formJson']['panels'][0]['fields'] += P3
M.STATE['inbox'][0]['formData'].update({'c-rate': 4, 'c-op': 7, 'c-cc': '+44', 'c-name': 'Sam Example'})

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1300)
        t=await pg.inner_text('.main')
        print('NO blocking notice:', "can't fill yet" not in t)
        print('CONTROLS:', await pg.locator('input#nf-c-name').count() == 1, await pg.locator('textarea#nf-c-addr').count() == 1, await pg.input_value('#nf-c-cc'), await pg.locator('#nf-c-rate .star').count(), await pg.locator('#nf-c-op .nums button').count(), 'Poor' in t and 'Great' in t, 'Not signed yet' in t)
        await pg.select_option('select#nf-'+M.F['email'], 'student.lawyer@example.com'); await pg.fill('input#nf-'+M.F['pos'], 'Associate')
        await pg.fill('#nf-c-cc', '971'); await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(500); t=await pg.inner_text('.main')
        print('REQUIRED + FORMAT:', 'Traveller Name is required' in t, 'Employee Signature is required' in t, 'Enter a dialing code' in t, len(M.STATE['started']) == 0)
        await pg.fill('#nf-c-name', 'Sam Example'); await pg.fill('#nf-c-addr', '1 Example Street\nSpringfield'); await pg.fill('#nf-c-cc', '+971')
        await pg.click('#nf-c-rate .star >> nth=3'); await pg.click('#nf-c-rate .star >> nth=3')
        print('RATING half:', await pg.inner_text('#nf-c-rate .val'))
        await pg.click('#nf-c-op .nums button >> nth=8')
        # draw a signature
        await pg.click('#nf-c-sig button:has-text("Sign")'); await pg.wait_for_timeout(200)
        box=await pg.locator('canvas.sigpad').bounding_box()
        await pg.mouse.move(box['x']+30, box['y']+120); await pg.mouse.down()
        for k in range(1, 12): await pg.mouse.move(box['x']+30+k*20, box['y']+120+(k%3-1)*25)
        await pg.mouse.up(); await pg.click('button:has-text("Use signature")'); await pg.wait_for_timeout(200)
        print('SIGNATURE preview:', await pg.locator('#nf-c-sig img').count() == 1, await pg.locator('#nf-c-sig button:has-text("Sign again")').count() == 1)
        # several files: first in the field, the rest to Attachments
        await pg.set_input_files('input[type=file][multiple]#nf-c-files', [
            {'name': 'booking.pdf', 'mimeType': 'application/pdf', 'buffer': M.PDF}, {'name': 'ticket.pdf', 'mimeType': 'application/pdf', 'buffer': M.PDF}, {'name': 'visa.pdf', 'mimeType': 'application/pdf', 'buffer': M.PDF}])
        await pg.wait_for_timeout(600); t=await pg.inner_text('.main')
        print('MULTI files:', 'booking.pdf' in t, 'ticket.pdf' in t, 'visa.pdf' in t, 'Upload files' in t or 'booking.pdf' in t)
        await pg.screenshot(path=OUT+'p3-new.png', full_page=True)
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(2500)
        st=M.STATE['started'][-1] if M.STATE['started'] else {}
        fd=st.get('formData') if 'formData' in st else st
        if isinstance(fd, str): fd=json.loads(fd)
        if '__multipart' in st:
            import re; m=re.search(r'name="formData"\r\n\r\n(.*?)\r\n--', st['__multipart'], re.S); fd=json.loads(m.group(1)) if m else {}
            print('MULTIPART file part:', re.findall(r'name="file"; filename="([^"]+)"', st['__multipart']), '| extra uploads:', [u for u in M.STATE['uploads']][-2:])
        print('PAYLOAD:', fd.get('c-name'), repr(fd.get('c-addr')), fd.get('c-cc'), fd.get('c-rate'), fd.get('c-op'), str(fd.get('c-sig', ''))[:22], (fd.get('c-files') or {}).get('fileName'))
        print('PAYLOAD shapes:', fd.get('c-rate') == 3.5, fd.get('c-op') == 8, str(fd.get('c-sig', '')).startswith('data:image/png;base64,'))
        # detail + approver edit
        await pg.goto(URL+'#/app/inbox/'+M.EXP+'~inst-exp-1'); await pg.wait_for_timeout(1000); t=await pg.inner_text('.main')
        print('DETAIL display:', '4 of 5' in t, '7 of 10' in t)
        await pg.click('[role=tab]:has-text("Form")'); await pg.click('button[aria-label="Edit form"]'); await pg.wait_for_timeout(700)
        print('EDIT controls:', await pg.locator('#f-c-rate .star.on').count() == 4, await pg.locator('#f-c-op .nums button.on').inner_text(), await pg.input_value('#f-c-cc'), await pg.locator('#f-c-sig').count() == 1)
        await pg.click('#f-c-op .nums button >> nth=9'); await pg.click('text=Keep changes'); await pg.wait_for_timeout(600)
        print('EDIT saved:', 'You edited 1 field' in await pg.inner_text('.main'))
        await pg.set_viewport_size({'width': 320, 'height': 700}); await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1200)
        print('320px no h-scroll:', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        await pg.locator('#nf-c-op').scroll_into_view_if_needed(); await pg.screenshot(path=OUT+'p3-new-320.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
