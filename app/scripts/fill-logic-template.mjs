import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const missingMsgids = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'missing-msgids.json'), 'utf8'),
)

const translations = __TRANSLATIONS__

function unescapePo(value) {
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function escapePo(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

const missingSet = new Set(missingMsgids)
const translationKeys = new Set(Object.keys(translations))
const missingTranslations = missingMsgids.filter((id) => !translationKeys.has(id))
const extraTranslations = [...translationKeys].filter((id) => !missingSet.has(id))

if (missingTranslations.length > 0) {
  console.error(`Missing translations for ${missingTranslations.length} msgids:`)
  for (const id of missingTranslations.slice(0, 20)) console.error(`  - ${id}`)
  process.exit(1)
}

if (extraTranslations.length > 0) {
  console.warn(`Warning: ${extraTranslations.length} extra translation keys not in missing-msgids.json`)
}

for (const locale of ['ar', 'fr', 'ms']) {
  const file = path.join(__dirname, '..', 'src', 'locales', locale, 'messages.po')
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const out = []
  let filled = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const match = line.match(/^msgid "(.*)"$/)
    if (match && match[1] !== '') {
      const msgid = unescapePo(match[1])
      out.push(line)
      i += 1
      if (i < lines.length && lines[i].startsWith('msgstr "')) {
        const current = lines[i]
        if (current === 'msgstr ""') {
          const tr = translations[msgid]?.[locale]
          if (tr !== undefined && tr !== '') {
            out.push(`msgstr "${escapePo(tr)}"`)
            filled += 1
          } else {
            out.push(current)
          }
        } else {
          out.push(current)
        }
      } else if (i < lines.length) {
        out.push(lines[i])
      }
      continue
    }
    out.push(line)
  }

  fs.writeFileSync(file, out.join('\n'))
  console.log(`${locale}: filled ${filled}`)
}
