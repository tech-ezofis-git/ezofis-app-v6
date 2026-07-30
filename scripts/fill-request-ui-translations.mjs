import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const translations = {
  Matched: {
    ar: 'مطابق',
    fr: 'Correspondant',
    ms: 'Sepadan',
  },
  Discrepancies: {
    ar: 'التناقضات',
    fr: 'Écarts',
    ms: 'Percanggahan',
  },
  'High Value': {
    ar: 'قيمة عالية',
    fr: 'Valeur élevée',
    ms: 'Nilai Tinggi',
  },
  'High Value (≥$10k)': {
    ar: 'قيمة عالية (≥10 آلاف دولار)',
    fr: 'Valeur élevée (≥10 k$)',
    ms: 'Nilai Tinggi (≥$10k)',
  },
  'Not Matched': {
    ar: 'غير مطابق',
    fr: 'Non correspondant',
    ms: 'Tidak Sepadan',
  },
  'Partially Matched': {
    ar: 'مطابق جزئياً',
    fr: 'Partiellement correspondant',
    ms: 'Sepadan Separa',
  },
  Overdue: {
    ar: 'متأخر',
    fr: 'En retard',
    ms: 'Tertunggak',
  },
  Supplier: {
    ar: 'المورد',
    fr: 'Fournisseur',
    ms: 'Pembekal',
  },
  'Supplier Name': {
    ar: 'اسم المورد',
    fr: 'Nom du fournisseur',
    ms: 'Nama Pembekal',
  },
  'Vendor Name': {
    ar: 'اسم البائع',
    fr: 'Nom du vendeur',
    ms: 'Nama Vendor',
  },
  'Invoice Number': {
    ar: 'رقم الفاتورة',
    fr: 'Numéro de facture',
    ms: 'Nombor Invois',
  },
  'Invoice Amount': {
    ar: 'مبلغ الفاتورة',
    fr: 'Montant de la facture',
    ms: 'Jumlah Invois',
  },
  'PO Number': {
    ar: 'رقم أمر الشراء',
    fr: 'Numéro de BC',
    ms: 'Nombor PO',
  },
  'Payment Terms': {
    ar: 'شروط الدفع',
    fr: 'Conditions de paiement',
    ms: 'Syarat Pembayaran',
  },
  Currency: {
    ar: 'العملة',
    fr: 'Devise',
    ms: 'Mata Wang',
  },
  'Tax Amount': {
    ar: 'مبلغ الضريبة',
    fr: 'Montant de la taxe',
    ms: 'Jumlah Cukai',
  },
  Attachments: {
    ar: 'المرفقات',
    fr: 'Pièces jointes',
    ms: 'Lampiran',
  },
  History: {
    ar: 'السجل',
    fr: 'Historique',
    ms: 'Sejarah',
  },
  'PO Matching': {
    ar: 'مطابقة أمر الشراء',
    fr: 'Rapprochement BC',
    ms: 'Pemadanan PO',
  },
  'Duplicate Detection': {
    ar: 'اكتشاف التكرار',
    fr: 'Détection des doublons',
    ms: 'Pengesanan Pendua',
  },
  'Supplier Verification': {
    ar: 'التحقق من المورد',
    fr: 'Vérification du fournisseur',
    ms: 'Pengesahan Pembekal',
  },
  'Not Verified': {
    ar: 'غير مُتحقق',
    fr: 'Non vérifié',
    ms: 'Tidak Disahkan',
  },
  Verified: {
    ar: 'مُتحقق',
    fr: 'Vérifié',
    ms: 'Disahkan',
  },
  Verify: {
    ar: 'تحقق',
    fr: 'Vérifier',
    ms: 'Sahkan',
  },
  'AI Insights': {
    ar: 'رؤى الذكاء الاصطناعي',
    fr: 'Insights IA',
    ms: 'Cerapan AI',
  },
  'Invoice Value': {
    ar: 'قيمة الفاتورة',
    fr: 'Valeur de la facture',
    ms: 'Nilai Invois',
  },
  'PO Value': {
    ar: 'قيمة أمر الشراء',
    fr: 'Valeur du BC',
    ms: 'Nilai PO',
  },
  'No PO Found': {
    ar: 'لم يتم العثور على أمر شراء',
    fr: 'Aucun BC trouvé',
    ms: 'PO tidak dijumpai',
  },
  'No Duplicate': {
    ar: 'لا تكرار',
    fr: 'Pas de doublon',
    ms: 'Tiada Pendua',
  },
  'No duplicates detected': {
    ar: 'لم يتم اكتشاف تكرارات',
    fr: 'Aucun doublon détecté',
    ms: 'Tiada pendua dikesan',
  },
  Approved: {
    ar: 'موافق عليه',
    fr: 'Approuvé',
    ms: 'Diluluskan',
  },
  'Partially Approved': {
    ar: 'موافق عليه جزئياً',
    fr: 'Partiellement approuvé',
    ms: 'Diluluskan Separa',
  },
  Rejected: {
    ar: 'مرفوض',
    fr: 'Rejeté',
    ms: 'Ditolak',
  },
  'Pending Review': {
    ar: 'قيد المراجعة',
    fr: 'En attente de revue',
    ms: 'Menunggu Semakan',
  },
  'Document Preview': {
    ar: 'معاينة المستند',
    fr: 'Aperçu du document',
    ms: 'Pratonton Dokumen',
  },
  'Ready for Approval': {
    ar: 'جاهز للموافقة',
    fr: 'Prêt pour approbation',
    ms: 'Sedia untuk Kelulusan',
  },
  'Go to Inbox': {
    ar: 'الانتقال إلى الوارد',
    fr: 'Aller à la boîte de réception',
    ms: 'Pergi ke Peti Masuk',
  },
  'GL Account Matching': {
    ar: 'مطابقة حساب دفتر الأستاذ',
    fr: 'Rapprochement compte GL',
    ms: 'Pemadanan Akaun GL',
  },
  'Back Order': {
    ar: 'طلب متأخر',
    fr: 'Commande en souffrance',
    ms: 'Pesanan Tertunda',
  },
  'Matter Validation': {
    ar: 'التحقق من المسألة',
    fr: 'Validation du dossier',
    ms: 'Pengesahan Matter',
  },
  'PO Matching Analysis': {
    ar: 'تحليل مطابقة أمر الشراء',
    fr: 'Analyse du rapprochement BC',
    ms: 'Analisis Pemadanan PO',
  },
  'Loading document...': {
    ar: 'جاري تحميل المستند...',
    fr: 'Chargement du document...',
    ms: 'Memuatkan dokumen...',
  },
  'Loading Attachments...': {
    ar: 'جاري تحميل المرفقات...',
    fr: 'Chargement des pièces jointes...',
    ms: 'Memuatkan lampiran...',
  },
  'Loading Comments...': {
    ar: 'جاري تحميل التعليقات...',
    fr: 'Chargement des commentaires...',
    ms: 'Memuatkan ulasan...',
  },
  'Loading History...': {
    ar: 'جاري تحميل السجل...',
    fr: "Chargement de l'historique...",
    ms: 'Memuatkan sejarah...',
  },
  'Setting up...': {
    ar: 'جاري الإعداد...',
    fr: 'Configuration...',
    ms: 'Sedang menyediakan...',
  },
  'Finalizing Results...': {
    ar: 'جاري إنهاء النتائج...',
    fr: 'Finalisation des résultats...',
    ms: 'Memuktamadkan keputusan...',
  },
  'Preparing your request...': {
    ar: 'جاري تجهيز طلبك...',
    fr: 'Préparation de votre demande...',
    ms: 'Menyediakan permintaan anda...',
  },
  Analysis: {
    ar: 'التحليل',
    fr: 'Analyse',
    ms: 'Analisis',
  },
  'AUTO-VERIFIED': {
    ar: 'تم التحقق تلقائياً',
    fr: 'AUTO-VÉRIFIÉ',
    ms: 'DISAHKAN AUTO',
  },
  'Next Action': {
    ar: 'الإجراء التالي',
    fr: 'Action suivante',
    ms: 'Tindakan Seterusnya',
  },
  'Schedule Payment': {
    ar: 'جدولة الدفع',
    fr: 'Planifier le paiement',
    ms: 'Jadualkan Pembayaran',
  },
  'Total Due': {
    ar: 'المبلغ المستحق',
    fr: 'Total dû',
    ms: 'Jumlah Terhutang',
  },
  'Field Matching': {
    ar: 'مطابقة الحقول',
    fr: 'Correspondance des champs',
    ms: 'Pemadanan Medan',
  },
  Extracted: {
    ar: 'مستخرج',
    fr: 'Extrait',
    ms: 'Diekstrak',
  },
  'Line Item Matching': {
    ar: 'مطابقة بنود السطر',
    fr: 'Correspondance des lignes',
    ms: 'Pemadanan Item Baris',
  },
  'Duplicate': {
    ar: 'مكرر',
    fr: 'Doublon',
    ms: 'Pendua',
  },
  'Verifying...': {
    ar: 'جاري التحقق...',
    fr: 'Vérification...',
    ms: 'Mengesahkan...',
  },
  'Supplier verified': {
    ar: 'تم التحقق من المورد',
    fr: 'Fournisseur vérifié',
    ms: 'Pembekal disahkan',
  },
  'Previous Request': {
    ar: 'الطلب السابق',
    fr: 'Demande précédente',
    ms: 'Permintaan Sebelumnya',
  },
  'Next Request': {
    ar: 'الطلب التالي',
    fr: 'Demande suivante',
    ms: 'Permintaan Seterusnya',
  },
  'Close AI Insights': {
    ar: 'إغلاق رؤى الذكاء الاصطناعي',
    fr: 'Fermer les insights IA',
    ms: 'Tutup Cerapan AI',
  },
  'Share Request': {
    ar: 'مشاركة الطلب',
    fr: 'Partager la demande',
    ms: 'Kongsi Permintaan',
  },
}

function updatePo(locale) {
  const file = path.join(root, 'src/locales', locale, 'messages.po')
  let po = fs.readFileSync(file, 'utf8')
  let ok = 0
  let miss = 0

  for (const [msgid, byLocale] of Object.entries(translations)) {
    const msgstr = byLocale[locale]
    if (!msgstr) continue
    const esc = msgid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(msgid "${esc}"\\n)msgstr "[^"]*"`, 'g')
    const next = po.replace(re, `$1msgstr "${msgstr.replace(/"/g, '\\"')}"`)
    if (next === po) {
      miss += 1
      console.log(`[${locale}] MISS ${msgid}`)
    } else {
      ok += 1
      po = next
    }
  }

  fs.writeFileSync(file, po)
  console.log(`[${locale}] updated=${ok} miss=${miss}`)
}

for (const locale of ['ar', 'fr', 'ms']) {
  updatePo(locale)
}
