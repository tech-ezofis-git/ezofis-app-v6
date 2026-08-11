import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** @type {Record<string, {ar: string, fr: string, ms: string}>} */
const translations = {
  'Extracting data': {
    ar: 'جاري استخراج البيانات',
    fr: 'Extraction des données',
    ms: 'Mengekstrak data',
  },
  'Matching PO details': {
    ar: 'جاري مطابقة تفاصيل أمر الشراء',
    fr: 'Rapprochement des détails BC',
    ms: 'Memadankan butiran PO',
  },
  'Policy Compliance': {
    ar: 'الامتثال للسياسات',
    fr: 'Conformité aux politiques',
    ms: 'Pematuhan Polisi',
  },
  'AP Agent Decision': {
    ar: 'قرار وكيل الحسابات الدائنة',
    fr: "Décision de l'agent AP",
    ms: 'Keputusan Ejen AP',
  },
  'File uploaded successfully': {
    ar: 'تم رفع الملف بنجاح',
    fr: 'Fichier téléversé avec succès',
    ms: 'Fail berjaya dimuat naik',
  },
  'Records matched successfully': {
    ar: 'تمت مطابقة السجلات بنجاح',
    fr: 'Enregistrements rapprochés avec succès',
    ms: 'Rekod berjaya dipadankan',
  },
  'Guidelines validated': {
    ar: 'تم التحقق من الإرشادات',
    fr: 'Directives validées',
    ms: 'Garis panduan disahkan',
  },
  'Final decision determined': {
    ar: 'تم تحديد القرار النهائي',
    fr: 'Décision finale déterminée',
    ms: 'Keputusan akhir ditentukan',
  },
  'Initializing upload...': {
    ar: 'جاري تهيئة الرفع...',
    fr: "Initialisation de l'envoi...",
    ms: 'Memulakan muat naik...',
  },
  'Uploading file...': {
    ar: 'جاري رفع الملف...',
    fr: 'Téléversement du fichier...',
    ms: 'Memuat naik fail...',
  },
  'Upload failed': {
    ar: 'فشل الرفع',
    fr: "Échec de l'envoi",
    ms: 'Muat naik gagal',
  },
  'Quick Hint': {
    ar: 'تلميح سريع',
    fr: 'Astuce rapide',
    ms: 'Petua Pantas',
  },
  'Refresh Preview': {
    ar: 'تحديث المعاينة',
    fr: "Actualiser l'aperçu",
    ms: 'Muat Semula Pratonton',
  },
  'This is taking a bit longer. You can safely navigate away; we\'ll notify you in the inbox once ready.':
    {
      ar: 'يستغرق الأمر وقتاً أطول قليلاً. يمكنك المغادرة بأمان؛ سنُعلمك في الوارد عند الجاهزية.',
      fr: 'Cela prend un peu plus de temps. Vous pouvez quitter en toute sécurité ; nous vous notifierons dans la boîte de réception une fois prêt.',
      ms: 'Ini mengambil sedikit masa lebih lama. Anda boleh keluar dengan selamat; kami akan maklumkan di peti masuk apabila sedia.',
    },
  'Analyzing context & keywords': {
    ar: 'جاري تحليل السياق والكلمات المفتاحية',
    fr: 'Analyse du contexte et des mots-clés',
    ms: 'Menganalisis konteks & kata kunci',
  },
  'Analyzing spatial layout': {
    ar: 'جاري تحليل التخطيط المكاني',
    fr: 'Analyse de la mise en page spatiale',
    ms: 'Menganalisis susun atur ruang',
  },
  'Extracting textual metadata': {
    ar: 'جاري استخراج البيانات الوصفية النصية',
    fr: 'Extraction des métadonnées textuelles',
    ms: 'Mengekstrak metadata teks',
  },
  'Recognizing table structures': {
    ar: 'جاري التعرف على هياكل الجداول',
    fr: 'Reconnaissance des structures de tableaux',
    ms: 'Mengenal pasti struktur jadual',
  },
  'Mapping semantic entities': {
    ar: 'جاري ربط الكيانات الدلالية',
    fr: 'Correspondance des entités sémantiques',
    ms: 'Memetakan entiti semantik',
  },
  'Cross-referencing records': {
    ar: 'جاري الإسناد الترافقي للسجلات',
    fr: 'Recoupement des enregistrements',
    ms: 'Merujuk silang rekod',
  },
  'Validating data consistency': {
    ar: 'جاري التحقق من اتساق البيانات',
    fr: 'Validation de la cohérence des données',
    ms: 'Mengesahkan konsistensi data',
  },
  'Validating guidelines': {
    ar: 'جاري التحقق من الإرشادات',
    fr: 'Validation des directives',
    ms: 'Mengesahkan garis panduan',
  },
  'Data extraction complete': {
    ar: 'اكتمل استخراج البيانات',
    fr: 'Extraction des données terminée',
    ms: 'Pengekstrakan data selesai',
  },
  'Processing Timeline': {
    ar: 'الجدول الزمني للمعالجة',
    fr: 'Chronologie du traitement',
    ms: 'Garis Masa Pemprosesan',
  },
  'Invoice Summary': {
    ar: 'ملخص الفاتورة',
    fr: 'Résumé de la facture',
    ms: 'Ringkasan Invois',
  },
  'Invoice Decision Details': {
    ar: 'تفاصيل قرار الفاتورة',
    fr: 'Détails de la décision de facture',
    ms: 'Butiran Keputusan Invois',
  },
  'Net 30 Days': {
    ar: 'صافي 30 يوماً',
    fr: 'Net 30 jours',
    ms: 'Net 30 Hari',
  },
  EXTRACTED: {
    ar: 'مستخرج',
    fr: 'EXTRAIT',
    ms: 'DIEKSTRAK',
  },
  'PO VALUE': {
    ar: 'قيمة أمر الشراء',
    fr: 'VALEUR BC',
    ms: 'NILAI PO',
  },
  'ITEM DESCRIPTION': {
    ar: 'وصف البند',
    fr: 'DESCRIPTION ARTICLE',
    ms: 'PENERANGAN ITEM',
  },
  STATUS: {
    ar: 'الحالة',
    fr: 'STATUT',
    ms: 'STATUS',
  },
  'PO Line Items': {
    ar: 'بنود أمر الشراء',
    fr: 'Lignes du BC',
    ms: 'Item Baris PO',
  },
  'Duplicate Payment Check': {
    ar: 'فحص الدفع المكرر',
    fr: 'Contrôle des paiements en double',
    ms: 'Semakan Pembayaran Pendua',
  },
  'Supplier Verification Registry': {
    ar: 'سجل التحقق من المورد',
    fr: 'Registre de vérification fournisseur',
    ms: 'Daftar Pengesahan Pembekal',
  },
  'GL Account Matching Report': {
    ar: 'تقرير مطابقة حساب دفتر الأستاذ',
    fr: 'Rapport de rapprochement compte GL',
    ms: 'Laporan Pemadanan Akaun GL',
  },
  'Payment Terms Analysis': {
    ar: 'تحليل شروط الدفع',
    fr: 'Analyse des conditions de paiement',
    ms: 'Analisis Syarat Pembayaran',
  },
  'Legal Matter Association Check': {
    ar: 'فحص ارتباط المسألة القانونية',
    fr: "Vérification d'association juridique",
    ms: 'Semakan Perkaitan Matter Undang-undang',
  },
  "Please click 'Verify' to check if this supplier is legitimate and prevent fraud.":
    {
      ar: "يرجى النقر على «تحقق» للتحقق من شرعية هذا المورد ومنع الاحتيال.",
      fr: "Veuillez cliquer sur « Vérifier » pour contrôler la légitimité de ce fournisseur et prévenir la fraude.",
      ms: "Sila klik 'Sahkan' untuk menyemak sama ada pembekal ini sah dan mencegah penipuan.",
    },
  'Supplier verification completed: {0}': {
    ar: 'اكتمل التحقق من المورد: {0}',
    fr: 'Vérification du fournisseur terminée : {0}',
    ms: 'Pengesahan pembekal selesai: {0}',
  },
  'Verification failed. 1 credit has been refunded.': {
    ar: 'فشل التحقق. تم استرداد رصيد واحد.',
    fr: 'Échec de la vérification. 1 crédit a été remboursé.',
    ms: 'Pengesahan gagal. 1 kredit telah dikembalikan.',
  },
  'Request shared successfully': {
    ar: 'تمت مشاركة الطلب بنجاح',
    fr: 'Demande partagée avec succès',
    ms: 'Permintaan berjaya dikongsi',
  },
  'Share Request': {
    ar: 'مشاركة الطلب',
    fr: 'Partager la demande',
    ms: 'Kongsi Permintaan',
  },
  'Add more people...': {
    ar: 'أضف المزيد من الأشخاص...',
    fr: "Ajouter d'autres personnes...",
    ms: 'Tambah lebih ramai orang...',
  },
  'Add names or emails': {
    ar: 'أضف أسماء أو بريداً إلكترونياً',
    fr: 'Ajouter des noms ou e-mails',
    ms: 'Tambah nama atau e-mel',
  },
  'Send notification': {
    ar: 'إرسال إشعار',
    fr: 'Envoyer une notification',
    ms: 'Hantar pemberitahuan',
  },
  'Add message (optional)': {
    ar: 'أضف رسالة (اختياري)',
    fr: 'Ajouter un message (facultatif)',
    ms: 'Tambah mesej (pilihan)',
  },
  'Sharing...': {
    ar: 'جاري المشاركة...',
    fr: 'Partage...',
    ms: 'Berkongsi...',
  },
  'Notify me when accessed': {
    ar: 'أعلمني عند الوصول',
    fr: "M'avertir lors de l'accès",
    ms: 'Beritahu saya apabila diakses',
  },
  New: {
    ar: 'جديد',
    fr: 'Nouveau',
    ms: 'Baharu',
  },
  Owner: {
    ar: 'المالك',
    fr: 'Propriétaire',
    ms: 'Pemilik',
  },
  Invited: {
    ar: 'مدعو',
    fr: 'Invité',
    ms: 'Dijemput',
  },
  'Request Owner': {
    ar: 'مالك الطلب',
    fr: 'Propriétaire de la demande',
    ms: 'Pemilik Permintaan',
  },
  Vendor: {
    ar: 'البائع',
    fr: 'Fournisseur',
    ms: 'Vendor',
  },
  Amount: {
    ar: 'المبلغ',
    fr: 'Montant',
    ms: 'Jumlah',
  },
  '{0} of {1} matched': {
    ar: '{0} من {1} مطابق',
    fr: '{0} sur {1} correspondants',
    ms: '{0} daripada {1} sepadan',
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
  'View Document': {
    ar: 'عرض المستند',
    fr: 'Voir le document',
    ms: 'Lihat Dokumen',
  },
  'Save Folder': {
    ar: 'حفظ المجلد',
    fr: 'Enregistrer le dossier',
    ms: 'Simpan Folder',
  },
  'Saving…': {
    ar: 'جارٍ الحفظ...',
    fr: 'Enregistrement…',
    ms: 'Menyimpan…',
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
    const encoded = msgstr.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const next = po.replace(re, `$1msgstr "${encoded}"`)
    if (next === po) {
      miss += 1
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
