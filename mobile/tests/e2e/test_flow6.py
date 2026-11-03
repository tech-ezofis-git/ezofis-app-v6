import os
import asyncio, json, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wfmock as M, expform as EX
M.META[M.EXP]['formId']='form-exp-real'
from test_flow1 import handler, SESSION, URL, OUT
from playwright.async_api import async_playwright
async def val(pg, label):
    return await pg.evaluate("""(l)=>{const f=[...document.querySelectorAll('.field')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent.trim().replace(/\\s*\\*$/,'').trim()===l); if(!f) return null; const i=f.querySelector('input,select,textarea,.input'); return i? (i.value!==undefined&&i.tagName!=='DIV'? i.value : i.textContent.trim()) : null;}""", label)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}); await ctx.route('https://cloud.ezofis.com/**',handler)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL+'#/welcome'); await pg.evaluate(f"localStorage.setItem('ezofis.session', {json.dumps(SESSION)})")
        await pg.goto(URL+'#/app/new/'+M.EXP); await pg.wait_for_timeout(1800)
        t=await pg.inner_text('.main')
        print('NO leftover options:', 'Option 1' not in t, '| budget chip:', 'Budget' in t and '2,162.88' in t)
        for l in ['Email','Phone Number','Paid Via','Code','Backlog','Type Code','GL-Type','Position','Total Expense Amount']:
            print('  ', l, '=', repr(await val(pg,l)))
        await pg.screenshot(path=OUT+'nr-top.png')
        await pg.click('button:has-text("Add row")'); await pg.wait_for_timeout(300)
        await pg.set_input_files('.nr-trow input[type=file] >> nth=0', files=[{'name':'receipt.pdf','mimeType':'application/pdf','buffer':M.PDF}]); await pg.wait_for_timeout(1500)
        print('OCR fields sent:', M.STATE['ocr'][-1]['__multipart'].split('name="fields"')[1][4:200].split('\r\n')[0] if M.STATE['ocr'] else None)
        for l in ['Bill No','Merchant','Date','Category','Total','HST','Tips','Grand Total','Pre-Tax Amount','Currency Type','Total Expense Amount']:
            print('  ', l, '=', repr(await val(pg,l)))
        opts=await pg.eval_on_selector_all('.nr-trow select', 'ss=>ss.map(s=>[s.previousElementSibling&&s.previousElementSibling.textContent.trim(), [...s.options].map(o=>o.value).filter(Boolean)])')
        print('row selects:', opts)
        await pg.select_option('.nr-trow select >> nth=1', 'Staff Events'); await pg.wait_for_timeout(300)
        print('GL Number after Expense For=Staff Events:', repr(await val(pg,'GL Number')))
        await pg.screenshot(path=OUT+'nr-row.png', full_page=True)
        await pg.fill('textarea#nr-comment','Team dinner')
        await pg.click('.bottombar button:has-text("Submit")'); await pg.wait_for_timeout(2000)
        print('uploadWithOcr fields:', M.STATE['ocrUpload'][-1]['__multipart'].count('name="'), 'calls', len(M.STATE['ocrUpload']))
        st=M.STATE['started'][-1]; print('START keys:', list(st.keys()), 'envType', st.get('envType'))
        fd=st['formData']; print('formData top:', {k[:8]:v for k,v in fd.items() if k!=EX.TB})
        print('row:', {k[:8]:v for k,v in fd[EX.TB][0].items()})
        print('stagedFiles:', st['stagedFiles'])
        print('comment posted:', [c[3] for c in M.STATE['calls'] if c[0]=='POST' and c[1].endswith('/comments')][-1:], '->', pg.url.split('#')[1])
        print('masters fetched:', sorted(set(m[:8] for m in M.STATE['masterCalls'])), 'errors:', errs)
        await b.close()
asyncio.run(main())
