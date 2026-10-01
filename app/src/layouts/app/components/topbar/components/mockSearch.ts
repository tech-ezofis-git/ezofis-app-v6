export const MOCK_DATA = [
  /* 1. request — matched on the request number itself (exact) */
  {
    badges: [{ label: 'Pending', tone: 'warn' }],
    due: '15 Aug',
    fields: {
      'Amount': '84,500',
      'Cost centre': 'CC-104',
      'Current stage': 'Finance review',
      'Invoice number': 'INV-2026-0451',
      'Payment terms': 'Net 30',
      'Pending with': 'M. Iqbal',
      'Request number': 'REQ-2026-00871',
      'Vendor name': 'Alpha Traders',
    },
    id: 'REQ-1',
    pendingWith: 'M. Iqbal',
    raisedBy: 'S. Nathan',
    raisedOn: '04 Aug 2026',
    stage: 'Finance review',
    stageCount: 3,
    stageNo: 2,
    status: 'pending',
    subtitle: 'Vendor invoice approval',
    title: 'REQ-2026-00871',
    type: 'request',
  },

  /* 2. document — matched in the file's own detail fields */
  {
    badges: [],
    fields: {
      'Amount': '84,500',
      'Invoice date': '02 Aug 2026',
      'Invoice number': 'INV-2026-0451',
      'PO number': 'PO-2026-991',
      'Vendor name': 'Alpha Traders',
    },
    folder: 'Vendor Archive',
    id: 'DOC-1',
    line: 'Uploaded by R. Kumar · 12 Aug 2026',
    title: 'INV-2026-0451_AlphaTraders.pdf',
    type: 'document',
  },

  /* 3. document — matched inside the scanned text */
  {
    badges: [],
    content: [
      {
        page: 1,
        text: 'Material received in full from Alpha Traders against PO-2026-991. No shortage reported.',
      },
    ],
    fields: { 'GRN number': 'GRN-88214', 'PO number': 'PO-2026-991' },
    folder: 'Goods Receipt',
    id: 'DOC-2',
    line: 'Uploaded by System · 09 Aug 2026',
    title: 'GRN-88214.pdf',
    type: 'document',
  },

  /* 4. document — matched in a line item inside the document */
  {
    badges: [],
    fields: { 'Amount': '84,500', 'PO number': 'PO-2026-991' },
    folder: 'Procurement Ledger',
    id: 'DOC-3',
    line: 'Uploaded by D. Prakash · 30 Jul 2026',
    lineItems: [
      {
        no: 3,
        text: 'Alpha Traders — corrugated packaging, 500 units, 12,000',
      },
    ],
    title: 'PO-2026-991.pdf',
    type: 'document',
  },

  /* 5. document — matched on a tag */
  {
    badges: [],
    fields: { 'GST number': '33AAECA1234F1Z5', 'Valid till': '31 Mar 2027' },
    folder: 'Statutory',
    id: 'DOC-4',
    line: 'Uploaded by D. Prakash · 03 Jun 2026',
    tags: ['Alpha Traders', 'Statutory'],
    title: 'GST_certificate.pdf',
    type: 'document',
  },

  /* 6. request — matched in the form the user filled in */
  {
    badges: [{ label: 'Approved', tone: 'ok' }],
    closedOn: '29 Jul 2026',
    fields: {
      'Category': 'Packaging',
      'Credit limit': '500,000',
      'Request number': 'REQ-2026-00812',
      'Vendor name': 'Alpha Traders',
    },
    id: 'REQ-2',
    raisedBy: 'D. Prakash',
    raisedOn: '21 Jul 2026',
    stage: 'Payment posting',
    status: 'approved',
    subtitle: 'New vendor onboarding',
    title: 'REQ-2026-00812',
    type: 'request',
  },

  /* 7. request — matched in a comment on the request */
  {
    badges: [{ label: 'Sent back', tone: 'err' }],
    comments: [
      {
        by: 'M. Iqbal',
        text: 'Hold this — the same amount was already paid to Alpha Traders last month.',
      },
    ],
    fields: {
      'Amount': '12,900',
      'Request number': 'REQ-2026-00903',
      'Vendor name': 'Beta Industries',
    },
    id: 'REQ-3',
    pendingWith: 'S. Nathan',
    raisedBy: 'S. Nathan',
    raisedOn: '10 Aug 2026',
    stage: 'Duplicate check',
    status: 'returned',
    subtitle: 'Payment release',
    title: 'REQ-2026-00903',
    type: 'request',
  },

  /* 8. request — matched inside a file attached to the request */
  {
    attachments: [
      {
        name: 'Rate contract 2026.docx',
        text: 'This rate contract is entered into with Alpha Traders for the supply of packaging material.',
      },
    ],
    badges: [{ label: 'Pending', tone: 'warn' }],
    due: '20 Aug',
    fields: {
      'Contract number': 'CT-2026-014',
      'Request number': 'REQ-2026-00925',
    },
    id: 'REQ-4',
    pendingWith: 'K. Devi',
    raisedBy: 'R. Kumar',
    raisedOn: '11 Aug 2026',
    stage: 'Legal review',
    stageCount: 2,
    stageNo: 1,
    status: 'pending',
    subtitle: 'Contract renewal',
    title: 'REQ-2026-00925',
    type: 'request',
  },

  /* 9. folder — matched by what the documents inside it contain */
  {
    badges: [],
    fields: { Owner: 'Accounts Payable', Retention: '7 years' },
    id: 'FLD-1',
    inside: { count: 312, term: 'Alpha Traders' },
    line: '1,284 documents · 6 sub-folders',
    title: 'Vendor Archive',
    type: 'folder',
  },

  /* 10. workflow — matched in the form design */
  {
    badges: [{ label: 'Active', tone: 'ok' }],
    design: [
      {
        field: 'Vendor name',
        values: 'Alpha Traders, Beta Industries, Gamma Supplies',
      },
    ],
    fields: { Owner: 'Finance ops', Version: '4' },
    id: 'FRM-1',
    line: '3 stages · 27 requests running',
    title: 'Vendor invoice approval',
    type: 'form',
  },
]

const ID_RE = /^[A-Z]{2,4}-\d{4}-\d{3,6}$/i
const norm = (s: any) => String(s || '').toLowerCase()
const esc = (s: any) =>
  String(s).replace(
    /[&<>"]/g,
    (c) =>
      (
        ({ '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }) as Record<
          string,
          string
        >
      )[c] || c,
  )

export function foundLine(f: any, needles: any) {
  const q = (t: any) => '“…' + hl(t, needles) + '…”'
  switch (f.kind) {
    case 'text':
      return `<span class="txt">In the document text, page ${f.page}: ${q(f.snippet)}</span>`
    case 'lineitem':
      return `<span class="txt">In line item ${f.no}: ${q(f.snippet)}</span>`
    case 'tag':
      return `<span class="txt">Tagged ${hl(f.value, needles)}</span>`
    case 'comment':
      return `<span class="txt">In a comment by ${esc(f.by)}: ${q(f.snippet)}</span>`
    case 'attachment':
      return `<span class="txt">In the attached ${esc(f.name)}: ${q(f.snippet)}</span>`
    case 'design':
      return `<span class="txt">Used as a choice in the form field ${esc(f.field)}</span>`
    case 'inside':
      return `<span class="txt">${f.count} documents inside mention this</span>`
    case 'form':
      return `<span class="txt">${esc(f.field)}: ${hl(f.value, needles)}</span>`
    default:
      return `<span class="txt">${esc(f.field)}: ${hl(f.value, needles)}</span>`
  }
}

export function hl(text: any, needles: any) {
  let out = esc(text)
  ;(needles || []).filter(Boolean).forEach((n: any) => {
    const r = new RegExp(
      '(' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')',
      'ig',
    )
    out = out.replace(
      r,
      '<mark class="bg-primary-3 text-primary-11 px-0.5 rounded-sm">$1</mark>',
    )
  })
  return out
}

export function lineFor(item: any) {
  if (item.type !== 'request') return item.line
  const who = item.pendingWith ? ` — with ${item.pendingWith}` : ''
  if (item.status === 'pending')
    return (
      `${item.stage} (stage ${item.stageNo} of ${item.stageCount})${who}` +
      (item.due ? ` · Due ${item.due}` : '') +
      ` · Raised by ${item.raisedBy}, ${item.raisedOn}`
    )
  if (item.status === 'returned')
    return `Sent back from ${item.stage}${who} · Raised ${item.raisedOn}`
  return `Completed at ${item.stage} on ${item.closedOn} · Raised by ${item.raisedBy}`
}

export function searchMock(raw: any) {
  if (!raw) return []
  const phrases = [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  const rest = raw.replace(/"[^"]+"/g, '').trim()
  const whole = raw.replace(/"/g, '').trim()
  const needles = [...phrases, ...(rest ? rest.split(/\s+/) : [])]
  const out: any[] = []

  MOCK_DATA.forEach((item) => {
    const found: any[] = []
    let score = 0
    const AT = item.attachments || [],
      C = item.content || [],
      CM = item.comments || [],
      DZ = item.design || [],
      F = item.fields || {},
      L = item.lineItems || [],
      T = item.tags || []

    Object.entries(F).forEach(([k, v]) => {
      if (
        norm(v) === norm(whole) ||
        (ID_RE.test(whole) && norm(v) === norm(whole))
      ) {
        found.push({ field: k, kind: 'exact', value: v })
        score += 100
      }
    })
    if (ID_RE.test(whole) && norm(item.title) === norm(whole)) {
      found.push({ kind: 'exact' })
      score += 100
    }

    needles.forEach((t) => {
      if (
        norm(item.title).includes(norm(t)) ||
        norm(item.subtitle || '').includes(norm(t))
      ) {
        found.push({ kind: 'name' })
        score += 30
      }
      Object.entries(F).forEach(([k, v]) => {
        if (norm(v).includes(norm(t))) {
          found.push({
            field: k,
            kind: item.type === 'request' ? 'form' : 'field',
            value: v,
          })
          score += 25
        }
      })
      C.forEach((c) => {
        if (norm(c.text).includes(norm(t))) {
          found.push({ kind: 'text', page: c.page, snippet: c.text })
          score += 20
        }
      })
      L.forEach((l) => {
        if (norm(l.text).includes(norm(t))) {
          found.push({ kind: 'lineitem', no: l.no, snippet: l.text })
          score += 20
        }
      })
      T.forEach((tag) => {
        if (norm(tag).includes(norm(t))) {
          found.push({ kind: 'tag', value: tag })
          score += 18
        }
      })
      CM.forEach((c) => {
        if (norm(c.text).includes(norm(t))) {
          found.push({ by: c.by, kind: 'comment', snippet: c.text })
          score += 16
        }
      })
      AT.forEach((a) => {
        if (norm(a.text).includes(norm(t)) || norm(a.name).includes(norm(t))) {
          found.push({ kind: 'attachment', name: a.name, snippet: a.text })
          score += 16
        }
      })
      DZ.forEach((d) => {
        if (norm(d.values).includes(norm(t))) {
          found.push({ field: d.field, kind: 'design' })
          score += 12
        }
      })
      if (item.inside && norm(item.inside.term).includes(norm(t))) {
        found.push({ count: item.inside.count, kind: 'inside' })
        score += 10
      }
    })

    if (!found.length) return
    const seen = new Set()
    const uniq: any[] = []
    found.forEach((f) => {
      const k = f.kind + f.field + f.snippet + f.value
      if (!seen.has(k)) {
        seen.add(k)
        uniq.push(f)
      }
    })
    const onScreen = norm(
      item.title + ' ' + (item.subtitle || '') + ' ' + item.line,
    )
    const visible = uniq.filter((f) => {
      if (f.kind === 'name' || f.kind === 'exact') return false
      if (f.value && onScreen.includes(norm(f.value))) return false
      return true
    })
    out.push({
      ...item,
      found: visible,
      needles,
      pinned: uniq.some((f) => f.kind === 'exact'),
      score,
    })
  })
  out.sort((a, b) => b.score - a.score)
  return out
}
