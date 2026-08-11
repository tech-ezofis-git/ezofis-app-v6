import fs from 'node:fs'

const po = fs.readFileSync('src/locales/ar/messages.po', 'utf8')
const missing = []
const re = /msgid "((?:\\.|[^"\\])*)"\nmsgstr "((?:\\.|[^"\\])*)"/g
let m
while ((m = re.exec(po))) {
  const msgid = m[1]
  const msgstr = m[2]
  if (!msgid) continue
  if (msgstr === '' || msgstr === msgid) missing.push(msgid.replace(/\\"/g, '"'))
}
fs.writeFileSync('scripts/missing-request-msgids.json', JSON.stringify(missing, null, 2))
console.log('missing', missing.length)
console.log(missing.join('\n'))
