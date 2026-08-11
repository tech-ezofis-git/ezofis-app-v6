import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const translations = {
  'Document Mapping': {
    ar: 'ربط المستند',
    fr: 'Correspondance du document',
    ms: 'Pemetaan Dokumen',
  },
  'Authorized Amount': {
    ar: 'المبلغ المصرح به',
    fr: 'Montant autorisé',
    ms: 'Jumlah Dibenarkan',
  },
  'Validation Log': {
    ar: 'سجل التحقق',
    fr: 'Journal de validation',
    ms: 'Log Pengesahan',
  },
  'Historical Match Results': {
    ar: 'نتائج المطابقة التاريخية',
    fr: 'Résultats de rapprochement historiques',
    ms: 'Hasil Padanan Sejarah',
  },
  'Cross-Check Status': {
    ar: 'حالة الفحص المتقاطع',
    fr: 'Statut de recoupement',
    ms: 'Status Semakan Silang',
  },
  'System Response': {
    ar: 'استجابة النظام',
    fr: 'Réponse du système',
    ms: 'Respons Sistem',
  },
  'Security & Auditing Policy': {
    ar: 'سياسة الأمان والتدقيق',
    fr: "Politique de sécurité et d'audit",
    ms: 'Polisi Keselamatan & Audit',
  },
  'PO Number (Extracted)': {
    ar: 'رقم أمر الشراء (مستخرج)',
    fr: 'Numéro de BC (extrait)',
    ms: 'Nombor PO (Diekstrak)',
  },
  'Supplier Details': {
    ar: 'تفاصيل المورد',
    fr: 'Détails du fournisseur',
    ms: 'Butiran Pembekal',
  },
  'Supplier Code': {
    ar: 'رمز المورد',
    fr: 'Code fournisseur',
    ms: 'Kod Pembekal',
  },
  'Suggested Allocation': {
    ar: 'التوزيع المقترح',
    fr: 'Allocation suggérée',
    ms: 'Peruntukan Dicadangkan',
  },
  'Matched GL Account': {
    ar: 'حساب دفتر الأستاذ المطابق',
    fr: 'Compte GL correspondant',
    ms: 'Akaun GL Sepadan',
  },
  'Payment Deadlines': {
    ar: 'مواعيد الدفع',
    fr: 'Échéances de paiement',
    ms: 'Tarikh Akhir Pembayaran',
  },
  'Billing Terms': {
    ar: 'شروط الفوترة',
    fr: 'Conditions de facturation',
    ms: 'Syarat Pengebilan',
  },
  'Time Remaining': {
    ar: 'الوقت المتبقي',
    fr: 'Temps restant',
    ms: 'Masa Berbaki',
  },
  'View Document': {
    ar: 'عرض المستند',
    fr: 'Voir le document',
    ms: 'Lihat Dokumen',
  },
}

function updatePo(locale) {
  const file = path.join(root, 'src/locales', locale, 'messages.po')
  let po = fs.readFileSync(file, 'utf8')
  let ok = 0

  for (const [msgid, byLocale] of Object.entries(translations)) {
    const msgstr = byLocale[locale]
    if (!msgstr) continue
    const esc = msgid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(msgid "${esc}"\\n)msgstr "[^"]*"`, 'g')
    const encoded = msgstr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const next = po.replace(re, `$1msgstr "${encoded}"`)
    if (next !== po) {
      ok += 1
      po = next
    }
  }

  fs.writeFileSync(file, po)
  console.log(`[${locale}] updated=${ok}`)
}

for (const locale of ['ar', 'fr', 'ms']) updatePo(locale)
