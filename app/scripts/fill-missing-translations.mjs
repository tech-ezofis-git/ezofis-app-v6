import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const missingMsgids = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'missing-msgids.json'), 'utf8'),
)

const translations = {
  "{0} fields": {
    "ar": "{0} حقول",
    "fr": "{0} champs",
    "ms": "{0} medan"
  },
  "{0} fields configured": {
    "ar": "تم تكوين {0} حقول",
    "fr": "{0} champs configurés",
    "ms": "{0} medan dikonfigurasi"
  },
  "{0} fields ready": {
    "ar": "{0} حقول جاهزة",
    "fr": "{0} champs prêts",
    "ms": "{0} medan sedia"
  },
  "{0} invites sent": {
    "ar": "تم إرسال {0} دعوات",
    "fr": "{0} invitations envoyées",
    "ms": "{0} jemputan dihantar"
  },
  "{0} people": {
    "ar": "{0} أشخاص",
    "fr": "{0} personnes",
    "ms": "{0} orang"
  },
  "{0} preview": {
    "ar": "معاينة {0}",
    "fr": "Aperçu {0}",
    "ms": "Pratonton {0}"
  },
  "{0} selected. Click Connect {1} to link your account.": {
    "ar": "تم تحديد {0}. انقر على اتصال {1} لربط حسابك.",
    "fr": "{0} sélectionné. Cliquez sur Connecter {1} pour lier votre compte.",
    "ms": "{0} dipilih. Klik Sambung {1} untuk pautkan akaun anda."
  },
  "{0} selected. How should documents be organized? Choose Recommend fields to generate a starter set.": {
    "ar": "تم تحديد {0}. كيف يجب تنظيم المستندات؟ اختر «الحقول الموصى بها» لإنشاء مجموعة أولية.",
    "fr": "{0} sélectionné. Comment organiser les documents ? Choisissez Recommander des champs pour générer un jeu de départ.",
    "ms": "{0} dipilih. Bagaimana dokumen patut disusun? Pilih Syor medan untuk jana set permulaan."
  },
  "{0}, {1} and {2} others": {
    "ar": "{0} و{1} و{2} آخرين",
    "fr": "{0}, {1} et {2} autres",
    "ms": "{0}, {1} dan {2} lagi"
  },
  "{enabledCount} of {0} permissions enabled": {
    "ar": "{enabledCount} من {0} أذونات مفعّلة",
    "fr": "{enabledCount} sur {0} autorisations activées",
    "ms": "{enabledCount} daripada {0} kebenaran didayakan"
  },
  "{fieldName} is mandatory.": {
    "ar": "{fieldName} إلزامي.",
    "fr": "{fieldName} est obligatoire.",
    "ms": "{fieldName} adalah wajib."
  },
  "{fileType} Viewer": {
    "ar": "عارض {fileType}",
    "fr": "Visionneuse {fileType}",
    "ms": "Pemapar {fileType}"
  },
  "{mappedCount}/{0} fields mapped": {
    "ar": "{mappedCount}/{0} حقول مرتبطة",
    "fr": "{mappedCount}/{0} champs mappés",
    "ms": "{mappedCount}/{0} medan dipetakan"
  },
  "{mappedRequiredCount} of {0} required fields mapped": {
    "ar": "{mappedRequiredCount} من {0} حقول مطلوبة مرتبطة",
    "fr": "{mappedRequiredCount} sur {0} champs obligatoires mappés",
    "ms": "{mappedRequiredCount} daripada {0} medan wajib dipetakan"
  },
  "{requiredMapped} / {requiredTotal} Required Mapped": {
    "ar": "{requiredMapped} / {requiredTotal} مطلوب مرتبط",
    "fr": "{requiredMapped} / {requiredTotal} obligatoires mappés",
    "ms": "{requiredMapped} / {requiredTotal} Wajib Dipetakan"
  },
  "{targetUsersText} will be granted {0} security permission on the folder {folderName}.": {
    "ar": "سيُمنح {targetUsersText} {0} إذن أمني على المجلد {folderName}.",
    "fr": "{targetUsersText} se verra accorder {0} autorisation de sécurité sur le dossier {folderName}.",
    "ms": "{targetUsersText} akan diberikan {0} kebenaran keselamatan pada folder {folderName}."
  },
  "{targetUsersText} will be granted {0} security permissions on the folder {folderName}.": {
    "ar": "سيُمنح {targetUsersText} {0} أذونات أمنية على المجلد {folderName}.",
    "fr": "{targetUsersText} se verra accorder {0} autorisations de sécurité sur le dossier {folderName}.",
    "ms": "{targetUsersText} akan diberikan {0} kebenaran keselamatan pada folder {folderName}."
  },
  "* Map all required fields to save.": {
    "ar": "* اربط جميع الحقول المطلوبة للحفظ.",
    "fr": "* Mappez tous les champs obligatoires pour enregistrer.",
    "ms": "* Petakan semua medan wajib untuk simpan."
  },
  "+{remainingPrincipalsCount} more": {
    "ar": "+{remainingPrincipalsCount} المزيد",
    "fr": "+{remainingPrincipalsCount} de plus",
    "ms": "+{remainingPrincipalsCount} lagi"
  },
  "0 fields": {
    "ar": "0 حقول",
    "fr": "0 champs",
    "ms": "0 medan"
  },
  "0 skipped": {
    "ar": "0 تم تخطيه",
    "fr": "0 ignorés",
    "ms": "0 dilangkau"
  },
  "1 sheet": {
    "ar": "ورقة واحدة",
    "fr": "1 feuille",
    "ms": "1 helaian"
  },
  "100% Accuracy": {
    "ar": "دقة 100%",
    "fr": "Précision à 100 %",
    "ms": "Ketepatan 100%"
  },
  "2 / 6 fields": {
    "ar": "2 / 6 حقول",
    "fr": "2 / 6 champs",
    "ms": "2 / 6 medan"
  },
  "4 fields": {
    "ar": "4 حقول",
    "fr": "4 champs",
    "ms": "4 medan"
  },
  "6 / 6 fields": {
    "ar": "6 / 6 حقول",
    "fr": "6 / 6 champs",
    "ms": "6 / 6 medan"
  },
  "91% average": {
    "ar": "متوسط 91%",
    "fr": "Moyenne de 91 %",
    "ms": "Purata 91%"
  },
  "A maximum of 5 files can be processed at once. Only the first 5 will be processed.": {
    "ar": "يمكن معالجة 5 ملفات كحد أقصى دفعة واحدة. سيتم معالجة أول 5 فقط.",
    "fr": "Un maximum de 5 fichiers peut être traité à la fois. Seuls les 5 premiers seront traités.",
    "ms": "Maksimum 5 fail boleh diproses serentak. Hanya 5 pertama akan diproses."
  },
  "Accepted formats: CSV, XLSX": {
    "ar": "الصيغ المقبولة: CSV، XLSX",
    "fr": "Formats acceptés : CSV, XLSX",
    "ms": "Format diterima: CSV, XLSX"
  },
  "Accounts Payable": {
    "ar": "الحسابات الدائنة",
    "fr": "Comptes fournisseurs",
    "ms": "Akaun Belum Bayar"
  },
  "Accounts payable folder": {
    "ar": "مجلد الحسابات الدائنة",
    "fr": "Dossier comptes fournisseurs",
    "ms": "Folder akaun belum bayar"
  },
  "Accounts Receivable": {
    "ar": "الحسابات المدينة",
    "fr": "Comptes clients",
    "ms": "Akaun Belum Terima"
  },
  "Add a comment...": {
    "ar": "أضف تعليقاً...",
    "fr": "Ajouter un commentaire...",
    "ms": "Tambah komen..."
  },
  "Add a note for the approver...": {
    "ar": "أضف ملاحظة للموافق...",
    "fr": "Ajouter une note pour l'approbateur...",
    "ms": "Tambah nota untuk pelulus..."
  },
  "Add condition": {
    "ar": "إضافة شرط",
    "fr": "Ajouter une condition",
    "ms": "Tambah syarat"
  },
  "Add field": {
    "ar": "إضافة حقل",
    "fr": "Ajouter un champ",
    "ms": "Tambah medan"
  },
  "Add Rule": {
    "ar": "إضافة قاعدة",
    "fr": "Ajouter une règle",
    "ms": "Tambah Peraturan"
  },
  "AI Extract": {
    "ar": "استخراج بالذكاء الاصطناعي",
    "fr": "Extraction IA",
    "ms": "Ekstrak AI"
  },
  "AI EXTRACTION": {
    "ar": "الاستخراج بالذكاء الاصطناعي",
    "fr": "EXTRACTION IA",
    "ms": "PENGESANAN AI"
  },
  "AI fields": {
    "ar": "حقول الذكاء الاصطناعي",
    "fr": "Champs IA",
    "ms": "Medan AI"
  },
  "AI Folder Builder": {
    "ar": "منشئ المجلدات بالذكاء الاصطناعي",
    "fr": "Créateur de dossiers IA",
    "ms": "Pembina Folder AI"
  },
  "AI generated": {
    "ar": "مُولَّد بالذكاء الاصطناعي",
    "fr": "Généré par l'IA",
    "ms": "Dijana AI"
  },
  "AI is analysing the document...": {
    "ar": "الذكاء الاصطناعي يحلل المستند...",
    "fr": "L'IA analyse le document...",
    "ms": "AI sedang menganalisis dokumen..."
  },
  "AI Recommendations": {
    "ar": "توصيات الذكاء الاصطناعي",
    "fr": "Recommandations IA",
    "ms": "Cadangan AI"
  },
  "AI-powered extraction in seconds": {
    "ar": "استخراج مدعوم بالذكاء الاصطناعي في ثوانٍ",
    "fr": "Extraction alimentée par l'IA en quelques secondes",
    "ms": "Pengesanan dikuasakan AI dalam beberapa saat"
  },
  "Align data fields": {
    "ar": "محاذاة حقول البيانات",
    "fr": "Aligner les champs de données",
    "ms": "Jajarkan medan data"
  },
  "Align your file columns with Master Fields to ensure accurate data processing.": {
    "ar": "قم بمحاذاة أعمدة ملفك مع الحقول الرئيسية لضمان معالجة دقيقة للبيانات.",
    "fr": "Alignez les colonnes de votre fichier avec les champs principaux pour garantir un traitement précis des données.",
    "ms": "Jajarkan lajur fail anda dengan Medan Induk untuk memastikan pemprosesan data yang tepat."
  },
  "Aligning CSV/XLSX headers with database mapping schema.": {
    "ar": "محاذاة رؤوس CSV/XLSX مع مخطط ربط قاعدة البيانات.",
    "fr": "Alignement des en-têtes CSV/XLSX avec le schéma de mappage de la base de données.",
    "ms": "Menjajarkan pengepala CSV/XLSX dengan skema pemetaan pangkalan data."
  },
  "All search results for “{searchLabel}”": {
    "ar": "جميع نتائج البحث عن «{searchLabel}»",
    "fr": "Tous les résultats de recherche pour « {searchLabel} »",
    "ms": "Semua hasil carian untuk “{searchLabel}”"
  },
  "Allow Access": {
    "ar": "السماح بالوصول",
    "fr": "Autoriser l'accès",
    "ms": "Benarkan Akses"
  },
  "Analysis": {
    "ar": "التحليل",
    "fr": "Analyse",
    "ms": "Analisis"
  },
  "ANALYTICS": {
    "ar": "التحليلات",
    "fr": "ANALYTIQUE",
    "ms": "ANALITIK"
  },
  "Analyzing Columns...": {
    "ar": "جاري تحليل الأعمدة...",
    "fr": "Analyse des colonnes...",
    "ms": "Menganalisis Lajur..."
  },
  "Analyzing document...": {
    "ar": "جاري تحليل المستند...",
    "fr": "Analyse du document...",
    "ms": "Menganalisis dokumen..."
  },
  "Analyzing file and mapping fields...": {
    "ar": "جاري تحليل الملف وربط الحقول...",
    "fr": "Analyse du fichier et mappage des champs...",
    "ms": "Menganalisis fail dan memetakan medan..."
  },
  "Analyzing Invoice...": {
    "ar": "جاري تحليل الفاتورة...",
    "fr": "Analyse de la facture...",
    "ms": "Menganalisis Invois..."
  },
  "Analyzing Supplier...": {
    "ar": "جاري تحليل المورد...",
    "fr": "Analyse du fournisseur...",
    "ms": "Menganalisis Pembekal..."
  },
  "Any": {
    "ar": "أي",
    "fr": "Tout",
    "ms": "Mana-mana"
  },
  "Any Format": {
    "ar": "أي صيغة",
    "fr": "Tout format",
    "ms": "Sebarang Format"
  },
  "AP Agent": {
    "ar": "وكيل الحسابات الدائنة",
    "fr": "Agent AP",
    "ms": "Ejen AP"
  },
  "Assigned To ({0})": {
    "ar": "مُسند إلى ({0})",
    "fr": "Assigné à ({0})",
    "ms": "Ditugaskan Kepada ({0})"
  },
  "At least one rule is required": {
    "ar": "مطلوب قاعدة واحدة على الأقل",
    "fr": "Au moins une règle est requise",
    "ms": "Sekurang-kurangnya satu peraturan diperlukan"
  },
  "Auto Column Mapping": {
    "ar": "ربط الأعمدة تلقائياً",
    "fr": "Mappage automatique des colonnes",
    "ms": "Pemetaan Lajur Automatik"
  },
  "Automatically links file columns": {
    "ar": "يربط أعمدة الملف تلقائياً",
    "fr": "Lie automatiquement les colonnes du fichier",
    "ms": "Memautkan lajur fail secara automatik"
  },
  "Back to PO Setup": {
    "ar": "العودة إلى إعداد أمر الشراء",
    "fr": "Retour à la configuration PO",
    "ms": "Kembali ke Persediaan PO"
  },
  "Back to review": {
    "ar": "العودة إلى المراجعة",
    "fr": "Retour à la révision",
    "ms": "Kembali ke semakan"
  },
  "Backorder": {
    "ar": "طلب متأخر",
    "fr": "Commande en attente",
    "ms": "Pesanan Tertunda"
  },
  "Basic": {
    "ar": "أساسي",
    "fr": "Basique",
    "ms": "Asas"
  },
  "Between": {
    "ar": "بين",
    "fr": "Entre",
    "ms": "Antara"
  },
  "browse": {
    "ar": "تصفح",
    "fr": "parcourir",
    "ms": "layari"
  },
  "browse files": {
    "ar": "تصفح الملفات",
    "fr": "parcourir les fichiers",
    "ms": "layari fail"
  },
  "Build Rule": {
    "ar": "بناء قاعدة",
    "fr": "Créer une règle",
    "ms": "Bina Peraturan"
  },
  "By customer": {
    "ar": "حسب العميل",
    "fr": "Par client",
    "ms": "Mengikut pelanggan"
  },
  "By document type": {
    "ar": "حسب نوع المستند",
    "fr": "Par type de document",
    "ms": "Mengikut jenis dokumen"
  },
  "By employee": {
    "ar": "حسب الموظف",
    "fr": "Par employé",
    "ms": "Mengikut pekerja"
  },
  "By supplier / vendor": {
    "ar": "حسب المورد / البائع",
    "fr": "Par fournisseur / vendeur",
    "ms": "Mengikut pembekal / vendor"
  },
  "Can Edit": {
    "ar": "يمكنه التعديل",
    "fr": "Peut modifier",
    "ms": "Boleh Edit"
  },
  "Can View": {
    "ar": "يمكنه العرض",
    "fr": "Peut consulter",
    "ms": "Boleh Lihat"
  },
  "Cannot revoke this share": {
    "ar": "لا يمكن إلغاء هذه المشاركة",
    "fr": "Impossible de révoquer ce partage",
    "ms": "Tidak boleh membatalkan perkongsian ini"
  },
  "Capture": {
    "ar": "التقاط",
    "fr": "Capturer",
    "ms": "Tangkap"
  },
  "Change to folder field": {
    "ar": "تغيير إلى حقل مجلد",
    "fr": "Changer en champ de dossier",
    "ms": "Tukar ke medan folder"
  },
  "Change to normal field": {
    "ar": "تغيير إلى حقل عادي",
    "fr": "Changer en champ normal",
    "ms": "Tukar ke medan biasa"
  },
  "Check In": {
    "ar": "تسجيل الدخول",
    "fr": "Enregistrer",
    "ms": "Daftar Masuk"
  },
  "Check Out": {
    "ar": "تسجيل الخروج",
    "fr": "Extraire",
    "ms": "Daftar Keluar"
  },
  "Choose where documents in this folder will be stored and accessed.": {
    "ar": "اختر مكان تخزين المستندات في هذا المجلد والوصول إليها.",
    "fr": "Choisissez où les documents de ce dossier seront stockés et accessibles.",
    "ms": "Pilih tempat dokumen dalam folder ini akan disimpan dan diakses."
  },
  "Choose where to store your invoice documents. Data is securely encrypted and accessible 24/7.": {
    "ar": "اختر مكان تخزين مستندات الفواتير. البيانات مشفرة بأمان ومتاحة على مدار الساعة.",
    "fr": "Choisissez où stocker vos documents de facturation. Les données sont chiffrées en toute sécurité et accessibles 24h/24.",
    "ms": "Pilih tempat untuk menyimpan dokumen invois anda. Data disulitkan dengan selamat dan boleh diakses 24/7."
  },
  "Clear mapping": {
    "ar": "مسح الربط",
    "fr": "Effacer le mappage",
    "ms": "Kosongkan pemetaan"
  },
  "Click any preview to process": {
    "ar": "انقر على أي معاينة للمعالجة",
    "fr": "Cliquez sur un aperçu pour traiter",
    "ms": "Klik mana-mana pratonton untuk proses"
  },
  "Column & Row Extraction": {
    "ar": "استخراج الأعمدة والصفوف",
    "fr": "Extraction de colonnes et lignes",
    "ms": "Pengesanan Lajur & Baris"
  },
  "Column Mapping": {
    "ar": "ربط الأعمدة",
    "fr": "Mappage des colonnes",
    "ms": "Pemetaan Lajur"
  },
  "columns": {
    "ar": "أعمدة",
    "fr": "colonnes",
    "ms": "lajur"
  },
  "Columns Found": {
    "ar": "الأعمدة الموجودة",
    "fr": "Colonnes trouvées",
    "ms": "Lajur Ditemui"
  },
  "Columns Ingested:": {
    "ar": "الأعمدة المستوردة:",
    "fr": "Colonnes ingérées :",
    "ms": "Lajur Dimasukkan:"
  },
  "Comments": {
    "ar": "التعليقات",
    "fr": "Commentaires",
    "ms": "Komen"
  },
  "Complete": {
    "ar": "اكتمال",
    "fr": "Terminer",
    "ms": "Lengkap"
  },
  "Complete document match.": {
    "ar": "تطابق كامل للمستند.",
    "fr": "Correspondance complète du document.",
    "ms": "Padanan dokumen lengkap."
  },
  "Complete each stage, then continue": {
    "ar": "أكمل كل مرحلة، ثم تابع",
    "fr": "Terminez chaque étape, puis continuez",
    "ms": "Lengkapkan setiap peringkat, kemudian teruskan"
  },
  "Complete editing session": {
    "ar": "إنهاء جلسة التعديل",
    "fr": "Terminer la session d'édition",
    "ms": "Lengkapkan sesi suntingan"
  },
  "Completed": {
    "ar": "مكتمل",
    "fr": "Terminé",
    "ms": "Selesai"
  },
  "Completed in 0.4s": {
    "ar": "اكتمل في 0.4 ث",
    "fr": "Terminé en 0,4 s",
    "ms": "Selesai dalam 0.4s"
  },
  "Completed in 0.9s": {
    "ar": "اكتمل في 0.9 ث",
    "fr": "Terminé en 0,9 s",
    "ms": "Selesai dalam 0.9s"
  },
  "Compliance & Risk Assessment": {
    "ar": "تقييم الامتثال والمخاطر",
    "fr": "Évaluation de la conformité et des risques",
    "ms": "Penilaian Pematuhan & Risiko"
  },
  "Confidence": {
    "ar": "الثقة",
    "fr": "Confiance",
    "ms": "Keyakinan"
  },
  "Confidence Level": {
    "ar": "مستوى الثقة",
    "fr": "Niveau de confiance",
    "ms": "Tahap Keyakinan"
  },
  "Configuration for “{0}” is ready. Review each step and continue through the remaining options.": {
    "ar": "التكوين لـ «{0}» جاهز. راجع كل خطوة وتابع الخيارات المتبقية.",
    "fr": "La configuration pour « {0} » est prête. Passez en revue chaque étape et continuez avec les options restantes.",
    "ms": "Konfigurasi untuk “{0}” sedia. Semak setiap langkah dan teruskan melalui pilihan yang tinggal."
  },
  "Configuration Summary": {
    "ar": "ملخص التكوين",
    "fr": "Résumé de la configuration",
    "ms": "Ringkasan Konfigurasi"
  },
  "Configure Approvers": {
    "ar": "تكوين الموافقين",
    "fr": "Configurer les approbateurs",
    "ms": "Konfigurasi Pelulus"
  },
  "Confirm": {
    "ar": "تأكيد",
    "fr": "Confirmer",
    "ms": "Sahkan"
  },
  "Confirm & Ingest": {
    "ar": "تأكيد واستيراد",
    "fr": "Confirmer et ingérer",
    "ms": "Sahkan & Masukkan"
  },
  "Connect {0}": {
    "ar": "اتصال {0}",
    "fr": "Connecter {0}",
    "ms": "Sambung {0}"
  },
  "Connect {providerLabel}": {
    "ar": "اتصال {providerLabel}",
    "fr": "Connecter {providerLabel}",
    "ms": "Sambung {providerLabel}"
  },
  "Connect your accounting software": {
    "ar": "اربط برنامج المحاسبة الخاص بك",
    "fr": "Connectez votre logiciel comptable",
    "ms": "Sambungkan perisian perakaunan anda"
  },
  "Connect your provider to automate data matching.": {
    "ar": "اربط مزودك لأتمتة مطابقة البيانات.",
    "fr": "Connectez votre fournisseur pour automatiser la correspondance des données.",
    "ms": "Sambungkan pembekal anda untuk automasi padanan data."
  },
  "Connect your QuickBooks account to sync PO and invoice data automatically.": {
    "ar": "اربط حساب QuickBooks لمزامنة بيانات أوامر الشراء والفواتير تلقائياً.",
    "fr": "Connectez votre compte QuickBooks pour synchroniser automatiquement les données PO et factures.",
    "ms": "Sambungkan akaun QuickBooks anda untuk segerakkan data PO dan invois secara automatik."
  },
  "Contains": {
    "ar": "يحتوي على",
    "fr": "Contient",
    "ms": "Mengandungi"
  },
  "Continue": {
    "ar": "متابعة",
    "fr": "Continuer",
    "ms": "Teruskan"
  },
  "Controls are generated from repository field definitions only. Empty or missing values remain blank in edit mode and display as “-” in grid/list view.": {
    "ar": "يتم إنشاء عناصر التحكم من تعريفات حقول المستودع فقط. تبقى القيم الفارغة أو المفقودة فارغة في وضع التعديل وتظهر كـ «-» في عرض الشبكة/القائمة.",
    "fr": "Les contrôles sont générés uniquement à partir des définitions de champs du dépôt. Les valeurs vides ou manquantes restent vides en mode édition et s'affichent comme « - » en vue grille/liste.",
    "ms": "Kawalan dijana daripada definisi medan repositori sahaja. Nilai kosong atau hilang kekal kosong dalam mod edit dan dipaparkan sebagai “-” dalam paparan grid/senarai."
  },
  "Copy": {
    "ar": "نسخ",
    "fr": "Copier",
    "ms": "Salin"
  },
  "Copy JSON": {
    "ar": "نسخ JSON",
    "fr": "Copier JSON",
    "ms": "Salin JSON"
  },
  "Copy Link": {
    "ar": "نسخ الرابط",
    "fr": "Copier le lien",
    "ms": "Salin Pautan"
  },
  "Could not complete search.": {
    "ar": "تعذر إكمال البحث.",
    "fr": "Impossible de terminer la recherche.",
    "ms": "Tidak dapat melengkapkan carian."
  },
  "Could not copy link": {
    "ar": "تعذر نسخ الرابط",
    "fr": "Impossible de copier le lien",
    "ms": "Tidak dapat menyalin pautan"
  },
  "Could not generate description. You can retry with another folder name.": {
    "ar": "تعذر إنشاء الوصف. يمكنك إعادة المحاولة باسم مجلد آخر.",
    "fr": "Impossible de générer la description. Vous pouvez réessayer avec un autre nom de dossier.",
    "ms": "Tidak dapat menjana penerangan. Anda boleh cuba semula dengan nama folder lain."
  },
  "Could not generate fields. Try Recommend fields again.": {
    "ar": "تعذر إنشاء الحقول. جرّب «الحقول الموصى بها» مرة أخرى.",
    "fr": "Impossible de générer les champs. Réessayez Recommander des champs.",
    "ms": "Tidak dapat menjana medan. Cuba Syor medan sekali lagi."
  },
  "Could not generate folder configuration. Try again.": {
    "ar": "تعذر إنشاء تكوين المجلد. حاول مرة أخرى.",
    "fr": "Impossible de générer la configuration du dossier. Réessayez.",
    "ms": "Tidak dapat menjana konfigurasi folder. Cuba lagi."
  },
  "Country": {
    "ar": "البلد",
    "fr": "Pays",
    "ms": "Negara"
  },
  "Create signature request": {
    "ar": "إنشاء طلب توقيع",
    "fr": "Créer une demande de signature",
    "ms": "Cipta permintaan tandatangan"
  },
  "CSV File": {
    "ar": "ملف CSV",
    "fr": "Fichier CSV",
    "ms": "Fail CSV"
  },
  "Currently Shared With": {
    "ar": "مشارك حالياً مع",
    "fr": "Actuellement partagé avec",
    "ms": "Dikongsi Kini Dengan"
  },
  "Custom API": {
    "ar": "واجهة API مخصصة",
    "fr": "API personnalisée",
    "ms": "API Tersuai"
  },
  "Data Preview": {
    "ar": "معاينة البيانات",
    "fr": "Aperçu des données",
    "ms": "Pratonton Data"
  },
  "Data Rows": {
    "ar": "صفوف البيانات",
    "fr": "Lignes de données",
    "ms": "Baris Data"
  },
  "Decide how document revisions are tracked when files are updated.": {
    "ar": "حدد كيفية تتبع مراجعات المستندات عند تحديث الملفات.",
    "fr": "Décidez comment les révisions de documents sont suivies lors de la mise à jour des fichiers.",
    "ms": "Tentukan cara semakan dokumen dijejaki apabila fail dikemas kini."
  },
  "Default Storage": {
    "ar": "التخزين الافتراضي",
    "fr": "Stockage par défaut",
    "ms": "Storan Lalai"
  },
  "Define metadata fields used for search, filtering, and folder structure.": {
    "ar": "حدد حقول البيانات الوصفية المستخدمة للبحث والتصفية وهيكل المجلد.",
    "fr": "Définissez les champs de métadonnées utilisés pour la recherche, le filtrage et la structure des dossiers.",
    "ms": "Tentukan medan metadata yang digunakan untuk carian, penapisan, dan struktur folder."
  },
  "Delete files or folders": {
    "ar": "حذف الملفات أو المجلدات",
    "fr": "Supprimer des fichiers ou dossiers",
    "ms": "Padam fail atau folder"
  },
  "Delete Rule": {
    "ar": "حذف القاعدة",
    "fr": "Supprimer la règle",
    "ms": "Padam Peraturan"
  },
  "Demo data selected. This data will be used for invoice processing.": {
    "ar": "تم تحديد بيانات تجريبية. ستُستخدم هذه البيانات لمعالجة الفواتير.",
    "fr": "Données de démonstration sélectionnées. Ces données seront utilisées pour le traitement des factures.",
    "ms": "Data demo dipilih. Data ini akan digunakan untuk pemprosesan invois."
  },
  "Describe structure or fields…": {
    "ar": "صف الهيكل أو الحقول…",
    "fr": "Décrivez la structure ou les champs…",
    "ms": "Terangkan struktur atau medan…"
  },
  "Description pending": {
    "ar": "الوصف قيد الانتظار",
    "fr": "Description en attente",
    "ms": "Penerangan menunggu"
  },
  "Description ready: “{description}” Review it below, then continue to Storage.": {
    "ar": "الوصف جاهز: «{description}» راجعه أدناه، ثم تابع إلى التخزين.",
    "fr": "Description prête : « {description} » Passez-la en revue ci-dessous, puis continuez vers Stockage.",
    "ms": "Penerangan sedia: “{description}” Semak di bawah, kemudian teruskan ke Storan."
  },
  "Deselect All": {
    "ar": "إلغاء تحديد الكل",
    "fr": "Tout désélectionner",
    "ms": "Nyahpilih Semua"
  },
  "Detected {0} columns and {1} records": {
    "ar": "تم اكتشاف {0} أعمدة و{1} سجلات",
    "fr": "{0} colonnes et {1} enregistrements détectés",
    "ms": "Dikesan {0} lajur dan {1} rekod"
  },
  "Direct Integration": {
    "ar": "تكامل مباشر",
    "fr": "Intégration directe",
    "ms": "Integrasi Langsung"
  },
  "Direct Upload": {
    "ar": "رفع مباشر",
    "fr": "Téléversement direct",
    "ms": "Muat Naik Langsung"
  },
  "Dismiss": {
    "ar": "تجاهل",
    "fr": "Ignorer",
    "ms": "Abaikan"
  },
  "Document Preview": {
    "ar": "معاينة المستند",
    "fr": "Aperçu du document",
    "ms": "Pratonton Dokumen"
  },
  "Document Security": {
    "ar": "أمان المستند",
    "fr": "Sécurité des documents",
    "ms": "Keselamatan Dokumen"
  },
  "Document Security Rule": {
    "ar": "قاعدة أمان المستند",
    "fr": "Règle de sécurité des documents",
    "ms": "Peraturan Keselamatan Dokumen"
  },
  "Document security rule saved successfully": {
    "ar": "تم حفظ قاعدة أمان المستند بنجاح",
    "fr": "Règle de sécurité des documents enregistrée avec succès",
    "ms": "Peraturan keselamatan dokumen berjaya disimpan"
  },
  "Document Summary": {
    "ar": "ملخص المستند",
    "fr": "Résumé du document",
    "ms": "Ringkasan Dokumen"
  },
  "Don't have a PO file ready? Use our template to ensure your data matches our system.": {
    "ar": "ليس لديك ملف أمر شراء جاهز؟ استخدم قالبنا لضمان تطابق بياناتك مع نظامنا.",
    "fr": "Vous n'avez pas de fichier PO prêt ? Utilisez notre modèle pour garantir que vos données correspondent à notre système.",
    "ms": "Tiada fail PO sedia? Gunakan templat kami untuk memastikan data anda sepadan dengan sistem kami."
  },
  "Done": {
    "ar": "تم",
    "fr": "Terminé",
    "ms": "Selesai"
  },
  "Download": {
    "ar": "تنزيل",
    "fr": "Télécharger",
    "ms": "Muat Turun"
  },
  "Download documents": {
    "ar": "تنزيل المستندات",
    "fr": "Télécharger les documents",
    "ms": "Muat turun dokumen"
  },
  "Download PO Master Demo Data": {
    "ar": "تنزيل بيانات تجريبية رئيسية لأمر الشراء",
    "fr": "Télécharger les données de démonstration PO Master",
    "ms": "Muat Turun Data Demo Induk PO"
  },
  "Download PO Template": {
    "ar": "تنزيل قالب أمر الشراء",
    "fr": "Télécharger le modèle PO",
    "ms": "Muat Turun Templat PO"
  },
  "Download Template": {
    "ar": "تنزيل القالب",
    "fr": "Télécharger le modèle",
    "ms": "Muat Turun Templat"
  },
  "Download the predefined PO Master Data template file to view reference records. Use this file to understand the default schema structure and sample values used for matching.": {
    "ar": "قم بتنزيل ملف قالب بيانات PO Master المحدد مسبقاً لعرض السجلات المرجعية. استخدم هذا الملف لفهم هيكل المخطط الافتراضي وقيم العينات المستخدمة للمطابقة.",
    "fr": "Téléchargez le fichier modèle PO Master Data prédéfini pour consulter les enregistrements de référence. Utilisez ce fichier pour comprendre la structure du schéma par défaut et les valeurs d'exemple utilisées pour la correspondance.",
    "ms": "Muat turun fail templat Data Induk PO yang telah ditetapkan untuk melihat rekod rujukan. Gunakan fail ini untuk memahami struktur skema lalai dan nilai sampel yang digunakan untuk padanan."
  },
  "Downloading...": {
    "ar": "جاري التنزيل...",
    "fr": "Téléchargement...",
    "ms": "Memuat turun..."
  },
  "Drag and drop your spreadsheet here, or": {
    "ar": "اسحب وأفلت جدول البيانات هنا، أو",
    "fr": "Glissez-déposez votre feuille de calcul ici, ou",
    "ms": "Seret dan lepas hamparan anda di sini, atau"
  },
  "Drop your file here, or": {
    "ar": "أفلت ملفك هنا، أو",
    "fr": "Déposez votre fichier ici, ou",
    "ms": "Lepaskan fail anda di sini, atau"
  },
  "Drop your PO file here, or": {
    "ar": "أفلت ملف أمر الشراء هنا، أو",
    "fr": "Déposez votre fichier PO ici, ou",
    "ms": "Lepaskan fail PO anda di sini, atau"
  },
  "Drop your PO master file here, or": {
    "ar": "أفلت ملف PO الرئيسي هنا، أو",
    "fr": "Déposez votre fichier PO master ici, ou",
    "ms": "Lepaskan fail induk PO anda di sini, atau"
  },
  "Edit Document": {
    "ar": "تعديل المستند",
    "fr": "Modifier le document",
    "ms": "Edit Dokumen"
  },
  "Edit Field Mappings": {
    "ar": "تعديل ربط الحقول",
    "fr": "Modifier le mappage des champs",
    "ms": "Edit Pemetaan Medan"
  },
  "empty": {
    "ar": "فارغ",
    "fr": "vide",
    "ms": "kosong"
  },
  "Empty Rows Skipped": {
    "ar": "تم تخطي الصفوف الفارغة",
    "fr": "Lignes vides ignorées",
    "ms": "Baris Kosong Dilangkau"
  },
  "Ends With": {
    "ar": "ينتهي بـ",
    "fr": "Se termine par",
    "ms": "Berakhir Dengan"
  },
  "Enter {label}": {
    "ar": "أدخل {label}",
    "fr": "Saisir {label}",
    "ms": "Masukkan {label}"
  },
  "Enter a valid email address": {
    "ar": "أدخل عنوان بريد إلكتروني صالح",
    "fr": "Saisissez une adresse e-mail valide",
    "ms": "Masukkan alamat e-mel yang sah"
  },
  "Enter folder name…": {
    "ar": "أدخل اسم المجلد…",
    "fr": "Saisir le nom du dossier…",
    "ms": "Masukkan nama folder…"
  },
  "Equals": {
    "ar": "يساوي",
    "fr": "Égal à",
    "ms": "Sama dengan"
  },
  "ERP data will be used to validate incoming invoices to match with PO information and supplier data.": {
    "ar": "ستُستخدم بيانات ERP للتحقق من الفواتير الواردة ومطابقتها مع معلومات أمر الشراء وبيانات المورد.",
    "fr": "Les données ERP seront utilisées pour valider les factures entrantes et les faire correspondre aux informations PO et aux données fournisseur.",
    "ms": "Data ERP akan digunakan untuk mengesahkan invois masuk agar sepadan dengan maklumat PO dan data pembekal."
  },
  "Error starting workflow": {
    "ar": "خطأ في بدء سير العمل",
    "fr": "Erreur lors du démarrage du flux",
    "ms": "Ralat memulakan aliran kerja"
  },
  "Error uploading file": {
    "ar": "خطأ في رفع الملف",
    "fr": "Erreur lors du téléversement du fichier",
    "ms": "Ralat memuat naik fail"
  },
  "Error uploading file: {error}": {
    "ar": "خطأ في رفع الملف: {error}",
    "fr": "Erreur lors du téléversement du fichier : {error}",
    "ms": "Ralat memuat naik fail: {error}"
  },
  "Excel Spreadsheet": {
    "ar": "جدول Excel",
    "fr": "Feuille de calcul Excel",
    "ms": "Hamparan Excel"
  },
  "Exception uploading file: {detail}": {
    "ar": "استثناء أثناء رفع الملف: {detail}",
    "fr": "Exception lors du téléversement du fichier : {detail}",
    "ms": "Pengecualian memuat naik fail: {detail}"
  },
  "Export PDF": {
    "ar": "تصدير PDF",
    "fr": "Exporter en PDF",
    "ms": "Eksport PDF"
  },
  "Exporting...": {
    "ar": "جاري التصدير...",
    "fr": "Exportation...",
    "ms": "Mengeksport..."
  },
  "Extracted Data": {
    "ar": "البيانات المستخرجة",
    "fr": "Données extraites",
    "ms": "Data Diekstrak"
  },
  "Extracting fields from document...": {
    "ar": "جاري استخراج الحقول من المستند...",
    "fr": "Extraction des champs du document...",
    "ms": "Mengekstrak medan daripada dokumen..."
  },
  "Extracting fields...": {
    "ar": "جاري استخراج الحقول...",
    "fr": "Extraction des champs...",
    "ms": "Mengekstrak medan..."
  },
  "Extracting grid fields and filtering metadata records.": {
    "ar": "جاري استخراج حقول الشبكة وتصفية سجلات البيانات الوصفية.",
    "fr": "Extraction des champs de grille et filtrage des enregistrements de métadonnées.",
    "ms": "Mengekstrak medan grid dan menapis rekod metadata."
  },
  "Extracting metadata, checking duplicates, validating compliance": {
    "ar": "جاري استخراج البيانات الوصفية والتحقق من التكرارات والتحقق من الامتثال",
    "fr": "Extraction des métadonnées, vérification des doublons, validation de la conformité",
    "ms": "Mengekstrak metadata, menyemak pendua, mengesahkan pematuhan"
  },
  "Extracting...": {
    "ar": "جاري الاستخراج...",
    "fr": "Extraction...",
    "ms": "Mengekstrak..."
  },
  "EZOFIS Drive": {
    "ar": "EZOFIS Drive",
    "fr": "EZOFIS Drive",
    "ms": "EZOFIS Drive"
  },
  "Failed to download template": {
    "ar": "فشل تنزيل القالب",
    "fr": "Échec du téléchargement du modèle",
    "ms": "Gagal memuat turun templat"
  },
  "Failed to invite": {
    "ar": "فشلت الدعوة",
    "fr": "Échec de l'invitation",
    "ms": "Gagal menjemput"
  },
  "Failed to load sample document.": {
    "ar": "فشل تحميل مستند العينة.",
    "fr": "Échec du chargement du document d'exemple.",
    "ms": "Gagal memuatkan dokumen sampel."
  },
  "Failed to parse file": {
    "ar": "فشل تحليل الملف",
    "fr": "Échec de l'analyse du fichier",
    "ms": "Gagal menghuraikan fail"
  },
  "Failed to parse file. Please upload a valid CSV or Excel file.": {
    "ar": "فشل تحليل الملف. يرجى رفع ملف CSV أو Excel صالح.",
    "fr": "Échec de l'analyse du fichier. Veuillez téléverser un fichier CSV ou Excel valide.",
    "ms": "Gagal menghuraikan fail. Sila muat naik fail CSV atau Excel yang sah."
  },
  "Failed to process file": {
    "ar": "فشلت معالجة الملف",
    "fr": "Échec du traitement du fichier",
    "ms": "Gagal memproses fail"
  },
  "Failed to revoke": {
    "ar": "فشل الإلغاء",
    "fr": "Échec de la révocation",
    "ms": "Gagal membatalkan"
  },
  "Field name": {
    "ar": "اسم الحقل",
    "fr": "Nom du champ",
    "ms": "Nama medan"
  },
  "fields": {
    "ar": "حقول",
    "fr": "champs",
    "ms": "medan"
  },
  "Fields ({0})": {
    "ar": "الحقول ({0})",
    "fr": "Champs ({0})",
    "ms": "Medan ({0})"
  },
  "Fields Matched": {
    "ar": "الحقول المطابقة",
    "fr": "Champs correspondants",
    "ms": "Medan Sepadan"
  },
  "Fields Needing Review": {
    "ar": "حقول تحتاج مراجعة",
    "fr": "Champs à réviser",
    "ms": "Medan Perlu Semakan"
  },
  "Fields pending": {
    "ar": "حقول قيد الانتظار",
    "fr": "Champs en attente",
    "ms": "Medan menunggu"
  },
  "File Column": {
    "ar": "عمود الملف",
    "fr": "Colonne du fichier",
    "ms": "Lajur Fail"
  },
  "File exported successfully.": {
    "ar": "تم تصدير الملف بنجاح.",
    "fr": "Fichier exporté avec succès.",
    "ms": "Fail berjaya dieksport."
  },
  "File Ingestion & Parsing": {
    "ar": "استيراد الملف وتحليله",
    "fr": "Ingestion et analyse du fichier",
    "ms": "Pengambilan & Penghuraian Fail"
  },
  "File is too large. Max size is 4MB.": {
    "ar": "الملف كبير جداً. الحد الأقصى للحجم 4 ميجابايت.",
    "fr": "Le fichier est trop volumineux. Taille maximale : 4 Mo.",
    "ms": "Fail terlalu besar. Saiz maksimum ialah 4MB."
  },
  "File Selected": {
    "ar": "تم تحديد الملف",
    "fr": "Fichier sélectionné",
    "ms": "Fail Dipilih"
  },
  "File Size": {
    "ar": "حجم الملف",
    "fr": "Taille du fichier",
    "ms": "Saiz Fail"
  },
  "File Upload": {
    "ar": "رفع الملف",
    "fr": "Téléversement de fichier",
    "ms": "Muat Naik Fail"
  },
  "Finalizing record ingestion...": {
    "ar": "جاري إنهاء استيراد السجلات...",
    "fr": "Finalisation de l'ingestion des enregistrements...",
    "ms": "Memuktamadkan pengambilan rekod..."
  },
  "Folder “{folderName}” is ready. Continue to choose a storage provider.": {
    "ar": "المجلد «{folderName}» جاهز. تابع لاختيار مزود التخزين.",
    "fr": "Le dossier « {folderName} » est prêt. Continuez pour choisir un fournisseur de stockage.",
    "ms": "Folder “{folderName}” sedia. Teruskan untuk pilih pembekal storan."
  },
  "Folder details": {
    "ar": "تفاصيل المجلد",
    "fr": "Détails du dossier",
    "ms": "Butiran folder"
  },
  "Folder field — click for normal": {
    "ar": "حقل مجلد — انقر للعادي",
    "fr": "Champ de dossier — cliquez pour normal",
    "ms": "Medan folder — klik untuk biasa"
  },
  "Folder fields are mandatory": {
    "ar": "حقول المجلد إلزامية",
    "fr": "Les champs de dossier sont obligatoires",
    "ms": "Medan folder adalah wajib"
  },
  "Folder name recorded as “{folderName}”. Generating a business description now…": {
    "ar": "تم تسجيل اسم المجلد كـ «{folderName}». جاري إنشاء وصف تجاري الآن…",
    "fr": "Nom du dossier enregistré comme « {folderName} ». Génération d'une description métier…",
    "ms": "Nama folder direkodkan sebagai “{folderName}”. Menjana penerangan perniagaan sekarang…"
  },
  "Folder Security": {
    "ar": "أمان المجلد",
    "fr": "Sécurité du dossier",
    "ms": "Keselamatan Folder"
  },
  "Folder Security Policy": {
    "ar": "سياسة أمان المجلد",
    "fr": "Politique de sécurité du dossier",
    "ms": "Dasar Keselamatan Folder"
  },
  "Format": {
    "ar": "الصيغة",
    "fr": "Format",
    "ms": "Format"
  },
  "Fully Matched": {
    "ar": "مطابقة كاملة",
    "fr": "Entièrement correspondant",
    "ms": "Sepadan Sepenuhnya"
  },
  "Gemini unavailable — used local description fallback.": {
    "ar": "Gemini غير متاح — تم استخدام وصف محلي احتياطي.",
    "fr": "Gemini indisponible — description locale de secours utilisée.",
    "ms": "Gemini tidak tersedia — menggunakan sandaran penerangan tempatan."
  },
  "Gemini unavailable — used local fields fallback.": {
    "ar": "Gemini غير متاح — تم استخدام حقول محلية احتياطية.",
    "fr": "Gemini indisponible — champs locaux de secours utilisés.",
    "ms": "Gemini tidak tersedia — menggunakan sandaran medan tempatan."
  },
  "Gemini unavailable — used local folder setup fallback.": {
    "ar": "Gemini غير متاح — تم استخدام إعداد مجلد محلي احتياطي.",
    "fr": "Gemini indisponible — configuration locale de dossier de secours utilisée.",
    "ms": "Gemini tidak tersedia — menggunakan sandaran persediaan folder tempatan."
  },
  "Generated by AI": {
    "ar": "مُولَّد بالذكاء الاصطناعي",
    "fr": "Généré par l'IA",
    "ms": "Dijana oleh AI"
  },
  "Generating description…": {
    "ar": "جاري إنشاء الوصف…",
    "fr": "Génération de la description…",
    "ms": "Menjana penerangan…"
  },
  "Generating recommended fields for this folder…": {
    "ar": "جاري إنشاء الحقول الموصى بها لهذا المجلد…",
    "fr": "Génération des champs recommandés pour ce dossier…",
    "ms": "Menjana medan disyorkan untuk folder ini…"
  },
  "Generating recommended fields…": {
    "ar": "جاري إنشاء الحقول الموصى بها…",
    "fr": "Génération des champs recommandés…",
    "ms": "Menjana medan disyorkan…"
  },
  "Gmail selected. Click Connect Gmail to link your account.": {
    "ar": "تم تحديد Gmail. انقر على اتصال Gmail لربط حسابك.",
    "fr": "Gmail sélectionné. Cliquez sur Connecter Gmail pour lier votre compte.",
    "ms": "Gmail dipilih. Klik Sambung Gmail untuk pautkan akaun anda."
  },
  "Google Drive": {
    "ar": "Google Drive",
    "fr": "Google Drive",
    "ms": "Google Drive"
  },
  "Grant Access / Show Documents": {
    "ar": "منح الوصول / إظهار المستندات",
    "fr": "Accorder l'accès / Afficher les documents",
    "ms": "Berikan Akses / Tunjuk Dokumen"
  },
  "Grant users or groups permission to perform actions inside this folder.": {
    "ar": "امنح المستخدمين أو المجموعات إذناً لتنفيذ إجراءات داخل هذا المجلد.",
    "fr": "Accordez aux utilisateurs ou groupes l'autorisation d'effectuer des actions dans ce dossier.",
    "ms": "Berikan kebenaran kepada pengguna atau kumpulan untuk melakukan tindakan dalam folder ini."
  },
  "Granted Permissions ({0})": {
    "ar": "الأذونات الممنوحة ({0})",
    "fr": "Autorisations accordées ({0})",
    "ms": "Kebenaran Diberikan ({0})"
  },
  "Greater Than": {
    "ar": "أكبر من",
    "fr": "Supérieur à",
    "ms": "Lebih Besar Daripada"
  },
  "Handwritten": {
    "ar": "مكتوب بخط اليد",
    "fr": "Manuscrit",
    "ms": "Tulis Tangan"
  },
  "Handwritten Invoice": {
    "ar": "فاتورة مكتوبة بخط اليد",
    "fr": "Facture manuscrite",
    "ms": "Invois Tulis Tangan"
  },
  "Header Fields": {
    "ar": "حقول الرأس",
    "fr": "Champs d'en-tête",
    "ms": "Medan Pengepala"
  },
  "Header Mapping": {
    "ar": "ربط الرأس",
    "fr": "Mappage d'en-tête",
    "ms": "Pemetaan Pengepala"
  },
  "Header Records": {
    "ar": "سجلات الرأس",
    "fr": "Enregistrements d'en-tête",
    "ms": "Rekod Pengepala"
  },
  "Header Row": {
    "ar": "صف الرأس",
    "fr": "Ligne d'en-tête",
    "ms": "Baris Pengepala"
  },
  "Here's what you can expect:": {
    "ar": "إليك ما يمكنك توقعه:",
    "fr": "Voici ce à quoi vous pouvez vous attendre :",
    "ms": "Inilah yang boleh anda jangkakan:"
  },
  "Hide Documents": {
    "ar": "إخفاء المستندات",
    "fr": "Masquer les documents",
    "ms": "Sembunyikan Dokumen"
  },
  "Hide Matching Documents": {
    "ar": "إخفاء المستندات المطابقة",
    "fr": "Masquer les documents correspondants",
    "ms": "Sembunyikan Dokumen Sepadan"
  },
  "Hide matching documents from target users.": {
    "ar": "إخفاء المستندات المطابقة عن المستخدمين المستهدفين.",
    "fr": "Masquer les documents correspondants aux utilisateurs cibles.",
    "ms": "Sembunyikan dokumen sepadan daripada pengguna sasaran."
  },
  "How should documents be organized? Choose Recommend fields or another option.": {
    "ar": "كيف يجب تنظيم المستندات؟ اختر «الحقول الموصى بها» أو خياراً آخر.",
    "fr": "Comment organiser les documents ? Choisissez Recommander des champs ou une autre option.",
    "ms": "Bagaimana dokumen patut disusun? Pilih Syor medan atau pilihan lain."
  },
  "HR Documents": {
    "ar": "مستندات الموارد البشرية",
    "fr": "Documents RH",
    "ms": "Dokumen HR"
  },
  "HR payslips folder": {
    "ar": "مجلد كشوف رواتب الموارد البشرية",
    "fr": "Dossier bulletins de paie RH",
    "ms": "Folder slip gaji HR"
  },
  "If a document matches any configured rule group, it will be hidden from {targetUsersText}.": {
    "ar": "إذا طابق مستند أي مجموعة قواعد مُكوَّنة، فسيُخفى عن {targetUsersText}.",
    "fr": "Si un document correspond à un groupe de règles configuré, il sera masqué pour {targetUsersText}.",
    "ms": "Jika dokumen sepadan dengan mana-mana kumpulan peraturan yang dikonfigurasi, ia akan disembunyikan daripada {targetUsersText}."
  },
  "Immediate Invoice Processing": {
    "ar": "معالجة فورية للفواتير",
    "fr": "Traitement immédiat des factures",
    "ms": "Pemprosesan Invois Segera"
  },
  "Import PO master records to validate invoices against approved purchase orders": {
    "ar": "استورد سجلات PO الرئيسية للتحقق من الفواتير مقابل أوامر الشراء المعتمدة",
    "fr": "Importez les enregistrements PO master pour valider les factures par rapport aux bons de commande approuvés",
    "ms": "Import rekod induk PO untuk mengesahkan invois berbanding pesanan pembelian yang diluluskan"
  },
  "Import your records via CSV or Excel.": {
    "ar": "استورد سجلاتك عبر CSV أو Excel.",
    "fr": "Importez vos enregistrements via CSV ou Excel.",
    "ms": "Import rekod anda melalui CSV atau Excel."
  },
  "In progress": {
    "ar": "قيد التقدم",
    "fr": "En cours",
    "ms": "Sedang dijalankan"
  },
  "Incremental Version": {
    "ar": "إصدار تدريجي",
    "fr": "Version incrémentielle",
    "ms": "Versi Bertambah"
  },
  "Industry-leading extraction accuracy": {
    "ar": "دقة استخراج رائدة في الصناعة",
    "fr": "Précision d'extraction leader du secteur",
    "ms": "Ketepatan pengesanan terkemuka industri"
  },
  "Ingesting raw file payload and validating structure.": {
    "ar": "جاري استيراد حمولة الملف الخام والتحقق من الهيكل.",
    "fr": "Ingestion de la charge utile brute du fichier et validation de la structure.",
    "ms": "Mengambil muatan fail mentah dan mengesahkan struktur."
  },
  "INGESTION": {
    "ar": "الاستيراد",
    "fr": "INGESTION",
    "ms": "PENGAMBILAN"
  },
  "Ingestion & Confirmation": {
    "ar": "الاستيراد والتأكيد",
    "fr": "Ingestion et confirmation",
    "ms": "Pengambilan & Pengesahan"
  },
  "Ingestion Complete": {
    "ar": "اكتمل الاستيراد",
    "fr": "Ingestion terminée",
    "ms": "Pengambilan Selesai"
  },
  "Ingestion Error": {
    "ar": "خطأ في الاستيراد",
    "fr": "Erreur d'ingestion",
    "ms": "Ralat Pengambilan"
  },
  "Ingestion Failed": {
    "ar": "فشل الاستيراد",
    "fr": "Échec de l'ingestion",
    "ms": "Pengambilan Gagal"
  },
  "Ingestion fully completed.": {
    "ar": "اكتمل الاستيراد بالكامل.",
    "fr": "Ingestion entièrement terminée.",
    "ms": "Pengambilan selesai sepenuhnya."
  },
  "Ingestion Summary": {
    "ar": "ملخص الاستيراد",
    "fr": "Résumé de l'ingestion",
    "ms": "Ringkasan Pengambilan"
  },
  "Ingestion timeline": {
    "ar": "الجدول الزمني للاستيراد",
    "fr": "Chronologie d'ingestion",
    "ms": "Garis masa pengambilan"
  },
  "Initiating...": {
    "ar": "جاري البدء...",
    "fr": "Initialisation...",
    "ms": "Memulakan..."
  },
  "Insights into your liabilities.": {
    "ar": "رؤى حول التزاماتك.",
    "fr": "Aperçu de vos passifs.",
    "ms": "Wawasan tentang liabiliti anda."
  },
  "Instant Processing": {
    "ar": "معالجة فورية",
    "fr": "Traitement instantané",
    "ms": "Pemprosesan Segera"
  },
  "INTELLIGENCE": {
    "ar": "الذكاء",
    "fr": "INTELLIGENCE",
    "ms": "KECERDASAN"
  },
  "Intelligent": {
    "ar": "ذكي",
    "fr": "Intelligent",
    "ms": "Pintar"
  },
  "Invalid file type. Please upload a PDF or Image.": {
    "ar": "نوع ملف غير صالح. يرجى رفع PDF أو صورة.",
    "fr": "Type de fichier invalide. Veuillez téléverser un PDF ou une image.",
    "ms": "Jenis fail tidak sah. Sila muat naik PDF atau Imej."
  },
  "Invite": {
    "ar": "دعوة",
    "fr": "Inviter",
    "ms": "Jemput"
  },
  "Invite People": {
    "ar": "دعوة أشخاص",
    "fr": "Inviter des personnes",
    "ms": "Jemput Orang"
  },
  "Invite sent": {
    "ar": "تم إرسال الدعوة",
    "fr": "Invitation envoyée",
    "ms": "Jemputan dihantar"
  },
  "Invite someone first to generate a link": {
    "ar": "ادعُ شخصاً أولاً لإنشاء رابط",
    "fr": "Invitez d'abord quelqu'un pour générer un lien",
    "ms": "Jemput seseorang dahulu untuk jana pautan"
  },
  "Invite someone to generate a link": {
    "ar": "ادعُ شخصاً لإنشاء رابط",
    "fr": "Invitez quelqu'un pour générer un lien",
    "ms": "Jemput seseorang untuk jana pautan"
  },
  "INVOICE": {
    "ar": "فاتورة",
    "fr": "FACTURE",
    "ms": "INVOIS"
  },
  "Invoice Date": {
    "ar": "تاريخ الفاتورة",
    "fr": "Date de facture",
    "ms": "Tarikh Invois"
  },
  "Invoice emails will be read from this inbox and sent for processing automatically.": {
    "ar": "ستُقرأ رسائل الفواتير من هذا البريد الوارد وترسل للمعالجة تلقائياً.",
    "fr": "Les e-mails de facturation seront lus depuis cette boîte de réception et envoyés pour traitement automatiquement.",
    "ms": "E-mel invois akan dibaca dari peti masuk ini dan dihantar untuk diproses secara automatik."
  },
  "Invoice exceeds PO value.": {
    "ar": "تتجاوز الفاتورة قيمة أمر الشراء.",
    "fr": "La facture dépasse la valeur du PO.",
    "ms": "Invois melebihi nilai PO."
  },
  "Invoice Line Items": {
    "ar": "بنود الفاتورة",
    "fr": "Lignes de facture",
    "ms": "Item Baris Invois"
  },
  "Invoice value reduced.": {
    "ar": "تم تقليل قيمة الفاتورة.",
    "fr": "Valeur de la facture réduite.",
    "ms": "Nilai invois dikurangkan."
  },
  "Invoices are automatically matched with purchase orders and goods receipt notes for accuracy.": {
    "ar": "تُطابق الفواتير تلقائياً مع أوامر الشراء وإشعارات استلام البضائع لضمان الدقة.",
    "fr": "Les factures sont automatiquement rapprochées des bons de commande et des bons de réception pour garantir la précision.",
    "ms": "Invois dipadankan secara automatik dengan pesanan pembelian dan nota penerimaan barang untuk ketepatan."
  },
  "Is Empty": {
    "ar": "فارغ",
    "fr": "Est vide",
    "ms": "Kosong"
  },
  "Is Not Empty": {
    "ar": "غير فارغ",
    "fr": "N'est pas vide",
    "ms": "Tidak Kosong"
  },
  "JSON": {
    "ar": "JSON",
    "fr": "JSON",
    "ms": "JSON"
  },
  "Key Facts Extracted": {
    "ar": "حقائق رئيسية مستخرجة",
    "fr": "Faits clés extraits",
    "ms": "Fakta Utama Diekstrak"
  },
  "L1 Approver *": {
    "ar": "الموافق L1 *",
    "fr": "Approbateur L1 *",
    "ms": "Pelulus L1 *"
  },
  "L1: {0}": {
    "ar": "L1: {0}",
    "fr": "L1 : {0}",
    "ms": "L1: {0}"
  },
  "L2 Approver": {
    "ar": "الموافق L2",
    "fr": "Approbateur L2",
    "ms": "Pelulus L2"
  },
  "L2: {0}": {
    "ar": "L2: {0}",
    "fr": "L2 : {0}",
    "ms": "L2: {0}"
  },
  "latest": {
    "ar": "الأحدث",
    "fr": "dernier",
    "ms": "terkini"
  },
  "Launch Workflow": {
    "ar": "تشغيل سير العمل",
    "fr": "Lancer le flux",
    "ms": "Lancarkan Aliran Kerja"
  },
  "Legal Contracts": {
    "ar": "العقود القانونية",
    "fr": "Contrats juridiques",
    "ms": "Kontrak Undang-undang"
  },
  "Legal contracts folder": {
    "ar": "مجلد العقود القانونية",
    "fr": "Dossier contrats juridiques",
    "ms": "Folder kontrak undang-undang"
  },
  "Less": {
    "ar": "أقل",
    "fr": "Moins",
    "ms": "Kurang"
  },
  "Less Than": {
    "ar": "أقل من",
    "fr": "Inférieur à",
    "ms": "Kurang Daripada"
  },
  "Let's set up your AP workflow": {
    "ar": "لنقم بإعداد سير عمل الحسابات الدائنة",
    "fr": "Configurons votre flux AP",
    "ms": "Mari sediakan aliran kerja AP anda"
  },
  "Lightning Fast": {
    "ar": "سريع كالبرق",
    "fr": "Ultra rapide",
    "ms": "Pantas Seperti Kilat"
  },
  "Line item info: No line item data found in this file.": {
    "ar": "معلومات البند: لم يتم العثور على بيانات بنود في هذا الملف.",
    "fr": "Info ligne : aucune donnée de ligne trouvée dans ce fichier.",
    "ms": "Maklumat item baris: Tiada data item baris ditemui dalam fail ini."
  },
  "Line item info: PO Number column could not be matched.": {
    "ar": "معلومات البند: تعذر مطابقة عمود رقم أمر الشراء.",
    "fr": "Info ligne : la colonne numéro PO n'a pas pu être correspondue.",
    "ms": "Maklumat item baris: Lajur Nombor PO tidak dapat dipadankan."
  },
  "Line item info: PO Number mapping not matched. Please map the same PO Number column in both sections.": {
    "ar": "معلومات البند: لم يتم مطابقة ربط رقم أمر الشراء. يرجى ربط عمود رقم أمر الشراء نفسه في كلا القسمين.",
    "fr": "Info ligne : mappage du numéro PO non correspondant. Veuillez mapper la même colonne numéro PO dans les deux sections.",
    "ms": "Maklumat item baris: Pemetaan Nombor PO tidak sepadan. Sila petakan lajur Nombor PO yang sama dalam kedua-dua bahagian."
  },
  "Line Item Mapping": {
    "ar": "ربط بنود السطر",
    "fr": "Mappage des lignes",
    "ms": "Pemetaan Item Baris"
  },
  "Line Items": {
    "ar": "بنود السطر",
    "fr": "Lignes",
    "ms": "Item Baris"
  },
  "Line Variance": {
    "ar": "تباين السطر",
    "fr": "Écart de ligne",
    "ms": "Varians Baris"
  },
  "Link copied": {
    "ar": "تم نسخ الرابط",
    "fr": "Lien copié",
    "ms": "Pautan disalin"
  },
  "Link invoices to POs with precision.": {
    "ar": "اربط الفواتير بأوامر الشراء بدقة.",
    "fr": "Liez les factures aux PO avec précision.",
    "ms": "Pautkan invois ke PO dengan ketepatan."
  },
  "Loading comments...": {
    "ar": "جاري تحميل التعليقات...",
    "fr": "Chargement des commentaires...",
    "ms": "Memuatkan komen..."
  },
  "Loading document...": {
    "ar": "جاري تحميل المستند...",
    "fr": "Chargement du document...",
    "ms": "Memuatkan dokumen..."
  },
  "Loading share options...": {
    "ar": "جاري تحميل خيارات المشاركة...",
    "fr": "Chargement des options de partage...",
    "ms": "Memuatkan pilihan perkongsian..."
  },
  "Loading timeline...": {
    "ar": "جاري تحميل الجدول الزمني...",
    "fr": "Chargement de la chronologie...",
    "ms": "Memuatkan garis masa..."
  },
  "Loading users...": {
    "ar": "جاري تحميل المستخدمين...",
    "fr": "Chargement des utilisateurs...",
    "ms": "Memuatkan pengguna..."
  },
  "Loading workflow...": {
    "ar": "جاري تحميل سير العمل...",
    "fr": "Chargement du flux...",
    "ms": "Memuatkan aliran kerja..."
  },
  "Lock document for editing": {
    "ar": "قفل المستند للتعديل",
    "fr": "Verrouiller le document pour édition",
    "ms": "Kunci dokumen untuk suntingan"
  },
  "Mandatory": {
    "ar": "إلزامي",
    "fr": "Obligatoire",
    "ms": "Wajib"
  },
  "Mandatory — click to make optional": {
    "ar": "إلزامي — انقر لجعله اختيارياً",
    "fr": "Obligatoire — cliquez pour rendre optionnel",
    "ms": "Wajib — klik untuk jadikan pilihan"
  },
  "Manual PO Import": {
    "ar": "استيراد PO يدوي",
    "fr": "Import PO manuel",
    "ms": "Import PO Manual"
  },
  "Map Columns": {
    "ar": "ربط الأعمدة",
    "fr": "Mapper les colonnes",
    "ms": "Petakan Lajur"
  },
  "Map columns to preview data": {
    "ar": "اربط الأعمدة لمعاينة البيانات",
    "fr": "Mappez les colonnes pour prévisualiser les données",
    "ms": "Petakan lajur untuk pratonton data"
  },
  "Map the columns from your uploaded file to the platform schema.": {
    "ar": "اربط الأعمدة من ملفك المرفوع بمخطط المنصة.",
    "fr": "Mappez les colonnes de votre fichier téléversé au schéma de la plateforme.",
    "ms": "Petakan lajur daripada fail yang dimuat naik ke skema platform."
  },
  "Mapped Source": {
    "ar": "المصدر المرتبط",
    "fr": "Source mappée",
    "ms": "Sumber Dipetakan"
  },
  "MAPPING": {
    "ar": "الربط",
    "fr": "MAPPAGE",
    "ms": "PEMETAAN"
  },
  "Mapping Fields": {
    "ar": "ربط الحقول",
    "fr": "Mappage des champs",
    "ms": "Pemetaan Medan"
  },
  "Mapping Status": {
    "ar": "حالة الربط",
    "fr": "Statut du mappage",
    "ms": "Status Pemetaan"
  },
  "Mapping Summary": {
    "ar": "ملخص الربط",
    "fr": "Résumé du mappage",
    "ms": "Ringkasan Pemetaan"
  },
  "Mark as mandatory": {
    "ar": "تعليم كإلزامي",
    "fr": "Marquer comme obligatoire",
    "ms": "Tandakan sebagai wajib"
  },
  "Mark as optional": {
    "ar": "تعليم كاختياري",
    "fr": "Marquer comme optionnel",
    "ms": "Tandakan sebagai pilihan"
  },
  "Master Field": {
    "ar": "الحقل الرئيسي",
    "fr": "Champ principal",
    "ms": "Medan Induk"
  },
  "Master fields mapped and saved successfully.": {
    "ar": "تم ربط الحقول الرئيسية وحفظها بنجاح.",
    "fr": "Champs principaux mappés et enregistrés avec succès.",
    "ms": "Medan induk dipetakan dan disimpan dengan jayanya."
  },
  "Match": {
    "ar": "مطابقة",
    "fr": "Correspondance",
    "ms": "Padanan"
  },
  "Match ALL conditions (AND logic) - document must satisfy every condition": {
    "ar": "مطابقة جميع الشروط (منطق AND) - يجب أن يستوفي المستند كل شرط",
    "fr": "Correspondre à TOUTES les conditions (logique ET) — le document doit satisfaire chaque condition",
    "ms": "Padan SEMUA syarat (logik DAN) - dokumen mesti memenuhi setiap syarat"
  },
  "Match ANY condition (OR logic) - document satisfies at least one condition": {
    "ar": "مطابقة أي شرط (منطق OR) - يستوفي المستند شرطاً واحداً على الأقل",
    "fr": "Correspondre à N'IMPORTE QUELLE condition (logique OU) — le document satisfait au moins une condition",
    "ms": "Padan MANA-MANA syarat (logik ATAU) - dokumen memenuhi sekurang-kurangnya satu syarat"
  },
  "Metadata copied.": {
    "ar": "تم نسخ البيانات الوصفية.",
    "fr": "Métadonnées copiées.",
    "ms": "Metadata disalin."
  },
  "Metadata Workspace:": {
    "ar": "مساحة عمل البيانات الوصفية:",
    "fr": "Espace de travail métadonnées :",
    "ms": "Ruang Kerja Metadata:"
  },
  "Microsoft Dynamics": {
    "ar": "Microsoft Dynamics",
    "fr": "Microsoft Dynamics",
    "ms": "Microsoft Dynamics"
  },
  "Missing file context for share": {
    "ar": "سياق الملف مفقود للمشاركة",
    "fr": "Contexte de fichier manquant pour le partage",
    "ms": "Konteks fail hilang untuk perkongsian"
  },
  "Modify document content": {
    "ar": "تعديل محتوى المستند",
    "fr": "Modifier le contenu du document",
    "ms": "Ubah kandungan dokumen"
  },
  "Modify metadata fields": {
    "ar": "تعديل حقول البيانات الوصفية",
    "fr": "Modifier les champs de métadonnées",
    "ms": "Ubah medan metadata"
  },
  "More (+{hiddenCount})": {
    "ar": "المزيد (+{hiddenCount})",
    "fr": "Plus (+{hiddenCount})",
    "ms": "Lagi (+{hiddenCount})"
  },
  "Multiple conditions set on field ({0}). Verify they do not conflict.": {
    "ar": "شروط متعددة مُعيَّنة على الحقل ({0}). تحقق من عدم تعارضها.",
    "fr": "Plusieurs conditions définies sur le champ ({0}). Vérifiez qu'elles ne sont pas en conflit.",
    "ms": "Pelbagai syarat ditetapkan pada medan ({0}). Sahkan ia tidak bercanggah."
  },
  "Multiple pricing differences.": {
    "ar": "فروقات متعددة في الأسعار.",
    "fr": "Plusieurs différences de prix.",
    "ms": "Pelbagai perbezaan harga."
  },
  "N/A": {
    "ar": "غ/م",
    "fr": "N/D",
    "ms": "T/B"
  },
  "No activity timeline is available for this document.": {
    "ar": "لا يوجد جدول زمني للنشاط لهذا المستند.",
    "fr": "Aucune chronologie d'activité disponible pour ce document.",
    "ms": "Tiada garis masa aktiviti tersedia untuk dokumen ini."
  },
  "No column mapped": {
    "ar": "لا يوجد عمود مرتبط",
    "fr": "Aucune colonne mappée",
    "ms": "Tiada lajur dipetakan"
  },
  "No columns detected": {
    "ar": "لم يتم اكتشاف أعمدة",
    "fr": "Aucune colonne détectée",
    "ms": "Tiada lajur dikesan"
  },
  "No columns found": {
    "ar": "لم يتم العثور على أعمدة",
    "fr": "Aucune colonne trouvée",
    "ms": "Tiada lajur ditemui"
  },
  "No columns match search": {
    "ar": "لا توجد أعمدة تطابق البحث",
    "fr": "Aucune colonne ne correspond à la recherche",
    "ms": "Tiada lajur sepadan carian"
  },
  "No comments are available for this document. Add the first comment to start collaboration.": {
    "ar": "لا توجد تعليقات لهذا المستند. أضف أول تعليق لبدء التعاون.",
    "fr": "Aucun commentaire disponible pour ce document. Ajoutez le premier commentaire pour commencer la collaboration.",
    "ms": "Tiada komen tersedia untuk dokumen ini. Tambah komen pertama untuk mulakan kolaborasi."
  },
  "No comments found": {
    "ar": "لم يتم العثور على تعليقات",
    "fr": "Aucun commentaire trouvé",
    "ms": "Tiada komen ditemui"
  },
  "No integrations": {
    "ar": "لا توجد تكاملات",
    "fr": "Aucune intégration",
    "ms": "Tiada integrasi"
  },
  "No matching permissions found": {
    "ar": "لم يتم العثور على أذونات مطابقة",
    "fr": "Aucune autorisation correspondante trouvée",
    "ms": "Tiada kebenaran sepadan ditemui"
  },
  "No metadata fields available": {
    "ar": "لا توجد حقول بيانات وصفية متاحة",
    "fr": "Aucun champ de métadonnées disponible",
    "ms": "Tiada medan metadata tersedia"
  },
  "No one has been invited yet.": {
    "ar": "لم تتم دعوة أحد بعد.",
    "fr": "Personne n'a encore été invité.",
    "ms": "Tiada sesiapa dijemput lagi."
  },
  "No preview rows available in this file.": {
    "ar": "لا توجد صفوف معاينة في هذا الملف.",
    "fr": "Aucune ligne d'aperçu disponible dans ce fichier.",
    "ms": "Tiada baris pratonton tersedia dalam fail ini."
  },
  "No related documents are linked with this file yet.": {
    "ar": "لا توجد مستندات مرتبطة بهذا الملف بعد.",
    "fr": "Aucun document associé n'est encore lié à ce fichier.",
    "ms": "Tiada dokumen berkaitan dipautkan dengan fail ini lagi."
  },
  "No repository fields configured.": {
    "ar": "لم يتم تكوين حقول المستودع.",
    "fr": "Aucun champ de dépôt configuré.",
    "ms": "Tiada medan repositori dikonfigurasi."
  },
  "No results for “{debouncedQuery}”.": {
    "ar": "لا توجد نتائج لـ «{debouncedQuery}».",
    "fr": "Aucun résultat pour « {debouncedQuery} ».",
    "ms": "Tiada hasil untuk “{debouncedQuery}”."
  },
  "No timeline found": {
    "ar": "لم يتم العثور على جدول زمني",
    "fr": "Aucune chronologie trouvée",
    "ms": "Tiada garis masa ditemui"
  },
  "No users selected": {
    "ar": "لم يتم تحديد مستخدمين",
    "fr": "Aucun utilisateur sélectionné",
    "ms": "Tiada pengguna dipilih"
  },
  "No valid files selected.": {
    "ar": "لم يتم تحديد ملفات صالحة.",
    "fr": "Aucun fichier valide sélectionné.",
    "ms": "Tiada fail sah dipilih."
  },
  "Normal field — click for folder": {
    "ar": "حقل عادي — انقر للمجلد",
    "fr": "Champ normal — cliquez pour dossier",
    "ms": "Medan biasa — klik untuk folder"
  },
  "Not configured": {
    "ar": "غير مُكوَّن",
    "fr": "Non configuré",
    "ms": "Tidak dikonfigurasi"
  },
  "Not Equals": {
    "ar": "لا يساوي",
    "fr": "Différent de",
    "ms": "Tidak Sama dengan"
  },
  "Not mapped": {
    "ar": "غير مرتبط",
    "fr": "Non mappé",
    "ms": "Tidak dipetakan"
  },
  "Not now": {
    "ar": "ليس الآن",
    "fr": "Pas maintenant",
    "ms": "Bukan sekarang"
  },
  "Not selected": {
    "ar": "غير محدد",
    "fr": "Non sélectionné",
    "ms": "Tidak dipilih"
  },
  "Note to Approver": {
    "ar": "ملاحظة للموافق",
    "fr": "Note à l'approbateur",
    "ms": "Nota kepada Pelulus"
  },
  "OCR extraction failed: {detail}": {
    "ar": "فشل استخراج OCR: {detail}",
    "fr": "Échec de l'extraction OCR : {detail}",
    "ms": "Pengesanan OCR gagal: {detail}"
  },
  "OCR extraction failed: {error}": {
    "ar": "فشل استخراج OCR: {error}",
    "fr": "Échec de l'extraction OCR : {error}",
    "ms": "Pengesanan OCR gagal: {error}"
  },
  "OneDrive": {
    "ar": "OneDrive",
    "fr": "OneDrive",
    "ms": "OneDrive"
  },
  "Open folder and files": {
    "ar": "فتح المجلد والملفات",
    "fr": "Ouvrir le dossier et les fichiers",
    "ms": "Buka folder dan fail"
  },
  "Optional — click to make mandatory": {
    "ar": "اختياري — انقر لجعله إلزامياً",
    "fr": "Optionnel — cliquez pour rendre obligatoire",
    "ms": "Pilihan — klik untuk jadikan wajib"
  },
  "Optional Field": {
    "ar": "حقل اختياري",
    "fr": "Champ optionnel",
    "ms": "Medan Pilihan"
  },
  "Optionally connect ERP or other systems so data can sync with this folder.": {
    "ar": "اربط ERP أو أنظمة أخرى اختيارياً لمزامنة البيانات مع هذا المجلد.",
    "fr": "Connectez éventuellement l'ERP ou d'autres systèmes pour synchroniser les données avec ce dossier.",
    "ms": "Pilihan sambung ERP atau sistem lain supaya data boleh disegerakkan dengan folder ini."
  },
  "Or type a storage provider…": {
    "ar": "أو اكتب مزود تخزين…",
    "fr": "Ou saisissez un fournisseur de stockage…",
    "ms": "Atau taip pembekal storan…"
  },
  "Or type a versioning strategy…": {
    "ar": "أو اكتب استراتيجية إصدارات…",
    "fr": "Ou saisissez une stratégie de versionnement…",
    "ms": "Atau taip strategi versi…"
  },
  "Or type an integration…": {
    "ar": "أو اكتب تكاملاً…",
    "fr": "Ou saisissez une intégration…",
    "ms": "Atau taip integrasi…"
  },
  "Oracle ERP": {
    "ar": "Oracle ERP",
    "fr": "Oracle ERP",
    "ms": "Oracle ERP"
  },
  "Outlook selected. Click Connect Outlook to link your account.": {
    "ar": "تم تحديد Outlook. انقر على اتصال Outlook لربط حسابك.",
    "fr": "Outlook sélectionné. Cliquez sur Connecter Outlook pour lier votre compte.",
    "ms": "Outlook dipilih. Klik Sambung Outlook untuk pautkan akaun anda."
  },
  "Overcharged": {
    "ar": "مبالغ فيه",
    "fr": "Surfacturé",
    "ms": "Dicaj Lebih"
  },
  "Override folder permissions for specific documents that match metadata conditions.": {
    "ar": "تجاوز أذونات المجلد لمستندات محددة تطابق شروط البيانات الوصفية.",
    "fr": "Remplacer les autorisations du dossier pour des documents spécifiques correspondant aux conditions de métadonnées.",
    "ms": "Ganti kebenaran folder untuk dokumen tertentu yang sepadan dengan syarat metadata."
  },
  "Payables Overview": {
    "ar": "نظرة عامة على الدائنين",
    "fr": "Aperçu des comptes fournisseurs",
    "ms": "Gambaran Keseluruhan Belum Bayar"
  },
  "Pending delivery items.": {
    "ar": "بنود التسليم المعلقة.",
    "fr": "Articles en attente de livraison.",
    "ms": "Item penghantaran menunggu."
  },
  "Perfect PO validation.": {
    "ar": "تحقق مثالي من أمر الشراء.",
    "fr": "Validation PO parfaite.",
    "ms": "Pengesahan PO sempurna."
  },
  "Permission": {
    "ar": "الإذن",
    "fr": "Autorisation",
    "ms": "Kebenaran"
  },
  "Pick how you'll import invoices to get started. You can change this later in settings.": {
    "ar": "اختر كيفية استيراد الفواتير للبدء. يمكنك تغيير ذلك لاحقاً في الإعدادات.",
    "fr": "Choisissez comment importer les factures pour commencer. Vous pourrez modifier cela plus tard dans les paramètres.",
    "ms": "Pilih cara anda akan import invois untuk bermula. Anda boleh ubah ini kemudian dalam tetapan."
  },
  "Please review this file": {
    "ar": "يرجى مراجعة هذا الملف",
    "fr": "Veuillez réviser ce fichier",
    "ms": "Sila semak fail ini"
  },
  "Please review this file: {fileName}": {
    "ar": "يرجى مراجعة هذا الملف: {fileName}",
    "fr": "Veuillez réviser ce fichier : {fileName}",
    "ms": "Sila semak fail ini: {fileName}"
  },
  "Please select a file first.": {
    "ar": "يرجى تحديد ملف أولاً.",
    "fr": "Veuillez d'abord sélectionner un fichier.",
    "ms": "Sila pilih fail dahulu."
  },
  "Please upload only CSV or XLSX files": {
    "ar": "يرجى رفع ملفات CSV أو XLSX فقط",
    "fr": "Veuillez téléverser uniquement des fichiers CSV ou XLSX",
    "ms": "Sila muat naik fail CSV atau XLSX sahaja"
  },
  "Please upload your PO data file (CSV or XLSX) to begin the configuration.": {
    "ar": "يرجى رفع ملف بيانات PO (CSV أو XLSX) لبدء التكوين.",
    "fr": "Veuillez téléverser votre fichier de données PO (CSV ou XLSX) pour commencer la configuration.",
    "ms": "Sila muat naik fail data PO anda (CSV atau XLSX) untuk memulakan konfigurasi."
  },
  "Please wait a moment": {
    "ar": "يرجى الانتظار لحظة",
    "fr": "Veuillez patienter un instant",
    "ms": "Sila tunggu sebentar"
  },
  "Please wait while we process your document": {
    "ar": "يرجى الانتظار أثناء معالجة مستندك",
    "fr": "Veuillez patienter pendant le traitement de votre document",
    "ms": "Sila tunggu sementara kami memproses dokumen anda"
  },
  "PO Import": {
    "ar": "استيراد PO",
    "fr": "Import PO",
    "ms": "Import PO"
  },
  "PO Ingestion Successful!": {
    "ar": "نجح استيراد PO!",
    "fr": "Ingestion PO réussie !",
    "ms": "Pengambilan PO Berjaya!"
  },
  "PO Master Data": {
    "ar": "بيانات PO الرئيسية",
    "fr": "Données PO Master",
    "ms": "Data Induk PO"
  },
  "PO Master File": {
    "ar": "ملف PO الرئيسي",
    "fr": "Fichier PO Master",
    "ms": "Fail Induk PO"
  },
  "PO Master file received": {
    "ar": "تم استلام ملف PO الرئيسي",
    "fr": "Fichier PO Master reçu",
    "ms": "Fail Induk PO diterima"
  },
  "PO Master Update": {
    "ar": "تحديث PO الرئيسي",
    "fr": "Mise à jour PO Master",
    "ms": "Kemas Kini Induk PO"
  },
  "PO Setup": {
    "ar": "إعداد PO",
    "fr": "Configuration PO",
    "ms": "Persediaan PO"
  },
  "PO Verified": {
    "ar": "تم التحقق من PO",
    "fr": "PO vérifié",
    "ms": "PO Disahkan"
  },
  "Post": {
    "ar": "نشر",
    "fr": "Publier",
    "ms": "Hantar"
  },
  "Posting...": {
    "ar": "جاري النشر...",
    "fr": "Publication...",
    "ms": "Menghantar..."
  },
  "Predefined Master Data": {
    "ar": "بيانات رئيسية محددة مسبقاً",
    "fr": "Données master prédéfinies",
    "ms": "Data Induk Pratetap"
  },
  "Prepare your file": {
    "ar": "جهّز ملفك",
    "fr": "Préparez votre fichier",
    "ms": "Sediakan fail anda"
  },
  "Preparing...": {
    "ar": "جاري التحضير...",
    "fr": "Préparation...",
    "ms": "Menyediakan..."
  },
  "Press": {
    "ar": "اضغط",
    "fr": "Appuyez",
    "ms": "Tekan"
  },
  "Press Enter to add this email": {
    "ar": "اضغط Enter لإضافة هذا البريد",
    "fr": "Appuyez sur Entrée pour ajouter cet e-mail",
    "ms": "Tekan Enter untuk tambah e-mel ini"
  },
  "Preview & Confirm": {
    "ar": "معاينة وتأكيد",
    "fr": "Aperçu et confirmation",
    "ms": "Pratonton & Sahkan"
  },
  "Preview:": {
    "ar": "معاينة:",
    "fr": "Aperçu :",
    "ms": "Pratonton:"
  },
  "Price Variance": {
    "ar": "تباين السعر",
    "fr": "Écart de prix",
    "ms": "Varians Harga"
  },
  "Print": {
    "ar": "طباعة",
    "fr": "Imprimer",
    "ms": "Cetak"
  },
  "Print documents": {
    "ar": "طباعة المستندات",
    "fr": "Imprimer les documents",
    "ms": "Cetak dokumen"
  },
  "Priority": {
    "ar": "الأولوية",
    "fr": "Priorité",
    "ms": "Keutamaan"
  },
  "Process documents faster with our agentic pipeline": {
    "ar": "عالج المستندات أسرع مع خط أنابيب الوكلاء لدينا",
    "fr": "Traitez les documents plus rapidement avec notre pipeline agentique",
    "ms": "Proses dokumen lebih pantas dengan saluran ejen kami"
  },
  "Processing \"{0}\"": {
    "ar": "جاري معالجة «{0}»",
    "fr": "Traitement de « {0} »",
    "ms": "Memproses \"{0}\""
  },
  "Processing...": {
    "ar": "جاري المعالجة...",
    "fr": "Traitement...",
    "ms": "Memproses..."
  },
  "Quantity line discrepancy.": {
    "ar": "تناقض في سطر الكمية.",
    "fr": "Écart sur la ligne de quantité.",
    "ms": "Percanggahan baris kuantiti."
  },
  "Quick Drop selected. You'll be able to upload your first invoices once your setup is complete.": {
    "ar": "تم تحديد Quick Drop. ستتمكن من رفع فواتيرك الأولى عند اكتمال الإعداد.",
    "fr": "Quick Drop sélectionné. Vous pourrez téléverser vos premières factures une fois la configuration terminée.",
    "ms": "Quick Drop dipilih. Anda boleh muat naik invois pertama selepas persediaan selesai."
  },
  "Quick Try": {
    "ar": "تجربة سريعة",
    "fr": "Essai rapide",
    "ms": "Cuba Pantas"
  },
  "Ready to confirm": {
    "ar": "جاهز للتأكيد",
    "fr": "Prêt à confirmer",
    "ms": "Sedia untuk disahkan"
  },
  "Real-Time Dashboard": {
    "ar": "لوحة معلومات فورية",
    "fr": "Tableau de bord en temps réel",
    "ms": "Papan Pemuka Masa Nyata"
  },
  "Received": {
    "ar": "مستلم",
    "fr": "Reçu",
    "ms": "Diterima"
  },
  "Recommend fields": {
    "ar": "الحقول الموصى بها",
    "fr": "Recommander des champs",
    "ms": "Syor medan"
  },
  "Recommended": {
    "ar": "موصى به",
    "fr": "Recommandé",
    "ms": "Disyorkan"
  },
  "Recommended {0} fields for “{1}”. Adjust them below, then continue.": {
    "ar": "تم التوصية بـ {0} حقول لـ «{1}». عدّلها أدناه، ثم تابع.",
    "fr": "{0} champs recommandés pour « {1} ». Ajustez-les ci-dessous, puis continuez.",
    "ms": "Disyorkan {0} medan untuk “{1}”. Laraskan di bawah, kemudian teruskan."
  },
  "records": {
    "ar": "سجلات",
    "fr": "enregistrements",
    "ms": "rekod"
  },
  "Regenerate": {
    "ar": "إعادة إنشاء",
    "fr": "Régénérer",
    "ms": "Jana semula"
  },
  "Related Docs": {
    "ar": "مستندات ذات صلة",
    "fr": "Docs associés",
    "ms": "Dok Berkaitan"
  },
  "Related documents not found": {
    "ar": "لم يتم العثور على مستندات ذات صلة",
    "fr": "Documents associés introuvables",
    "ms": "Dokumen berkaitan tidak ditemui"
  },
  "Remove {0}": {
    "ar": "إزالة {0}",
    "fr": "Supprimer {0}",
    "ms": "Buang {0}"
  },
  "Remove file": {
    "ar": "إزالة الملف",
    "fr": "Supprimer le fichier",
    "ms": "Buang fail"
  },
  "Replace Existing": {
    "ar": "استبدال الموجود",
    "fr": "Remplacer l'existant",
    "ms": "Ganti Sedia Ada"
  },
  "Replace File": {
    "ar": "استبدال الملف",
    "fr": "Remplacer le fichier",
    "ms": "Ganti Fail"
  },
  "Repository Fields": {
    "ar": "حقول المستودع",
    "fr": "Champs du dépôt",
    "ms": "Medan Repositori"
  },
  "Repository ID is missing. Cannot run OCR.": {
    "ar": "معرف المستودع مفقود. لا يمكن تشغيل OCR.",
    "fr": "ID du dépôt manquant. Impossible d'exécuter l'OCR.",
    "ms": "ID Repositori hilang. Tidak boleh jalankan OCR."
  },
  "Repository ID is missing. Cannot upload.": {
    "ar": "معرف المستودع مفقود. لا يمكن الرفع.",
    "fr": "ID du dépôt manquant. Impossible de téléverser.",
    "ms": "ID Repositori hilang. Tidak boleh muat naik."
  },
  "Required Field": {
    "ar": "حقل مطلوب",
    "fr": "Champ obligatoire",
    "ms": "Medan Wajib"
  },
  "Required field must be mapped.": {
    "ar": "يجب ربط الحقل المطلوب.",
    "fr": "Le champ obligatoire doit être mappé.",
    "ms": "Medan wajib mesti dipetakan."
  },
  "Reset": {
    "ar": "إعادة تعيين",
    "fr": "Réinitialiser",
    "ms": "Tetapkan Semula"
  },
  "Reset to initial auto-mapped suggestions.": {
    "ar": "إعادة التعيين إلى اقتراحات الربط التلقائي الأولية.",
    "fr": "Réinitialiser aux suggestions de mappage automatique initiales.",
    "ms": "Tetapkan semula kepada cadangan pemetaan automatik awal."
  },
  "Reset to Suggested": {
    "ar": "إعادة التعيين إلى المقترح",
    "fr": "Réinitialiser aux suggestions",
    "ms": "Tetapkan Semula kepada Cadangan"
  },
  "Result": {
    "ar": "النتيجة",
    "fr": "Résultat",
    "ms": "Keputusan"
  },
  "Retry Ingestion": {
    "ar": "إعادة محاولة الاستيراد",
    "fr": "Réessayer l'ingestion",
    "ms": "Cuba Semula Pengambilan"
  },
  "Review & Confirm": {
    "ar": "مراجعة وتأكيد",
    "fr": "Réviser et confirmer",
    "ms": "Semak & Sahkan"
  },
  "Review Column Mapping": {
    "ar": "مراجعة ربط الأعمدة",
    "fr": "Réviser le mappage des colonnes",
    "ms": "Semak Pemetaan Lajur"
  },
  "Review fields before export...": {
    "ar": "راجع الحقول قبل التصدير...",
    "fr": "Révisez les champs avant l'export...",
    "ms": "Semak medan sebelum eksport..."
  },
  "Review your column mapping summary before finalizing the PO configuration.": {
    "ar": "راجع ملخص ربط الأعمدة قبل إنهاء تكوين PO.",
    "fr": "Passez en revue le résumé du mappage des colonnes avant de finaliser la configuration PO.",
    "ms": "Semak ringkasan pemetaan lajur sebelum memuktamadkan konfigurasi PO."
  },
  "Review your connections and confirm your setup before activation.": {
    "ar": "راجع اتصالاتك وأكد إعدادك قبل التفعيل.",
    "fr": "Passez en revue vos connexions et confirmez votre configuration avant l'activation.",
    "ms": "Semak sambungan anda dan sahkan persediaan sebelum pengaktifan."
  },
  "Review your full folder setup, then apply it to create the repository.": {
    "ar": "راجع إعداد المجلد الكامل، ثم طبّقه لإنشاء المستودع.",
    "fr": "Passez en revue la configuration complète du dossier, puis appliquez-la pour créer le dépôt.",
    "ms": "Semak persediaan folder penuh, kemudian gunakan untuk cipta repositori."
  },
  "Revoke": {
    "ar": "إلغاء",
    "fr": "Révoquer",
    "ms": "Batalkan"
  },
  "Row 1": {
    "ar": "الصف 1",
    "fr": "Ligne 1",
    "ms": "Baris 1"
  },
  "rows": {
    "ar": "صفوف",
    "fr": "lignes",
    "ms": "baris"
  },
  "Rows Detected": {
    "ar": "الصفوف المكتشفة",
    "fr": "Lignes détectées",
    "ms": "Baris Dikesan"
  },
  "Rule {0}": {
    "ar": "القاعدة {0}",
    "fr": "Règle {0}",
    "ms": "Peraturan {0}"
  },
  "Save Mappings": {
    "ar": "حفظ الربط",
    "fr": "Enregistrer les mappages",
    "ms": "Simpan Pemetaan"
  },
  "Scanned handwritten bill.": {
    "ar": "فاتورة ممسوحة مكتوبة بخط اليد.",
    "fr": "Facture manuscrite numérisée.",
    "ms": "Bil imbasan tulisan tangan."
  },
  "Schema Auto-Mapping": {
    "ar": "ربط المخطط تلقائياً",
    "fr": "Mappage automatique du schéma",
    "ms": "Pemetaan Auto Skema"
  },
  "Schema Validation": {
    "ar": "التحقق من المخطط",
    "fr": "Validation du schéma",
    "ms": "Pengesahan Skema"
  },
  "Search AI": {
    "ar": "بحث AI",
    "fr": "Recherche IA",
    "ms": "Cari AI"
  },
  "Search columns...": {
    "ar": "بحث في الأعمدة...",
    "fr": "Rechercher des colonnes...",
    "ms": "Cari lajur..."
  },
  "Search documents, folders, requests, and more across your workspace.": {
    "ar": "ابحث في المستندات والمجلدات والطلبات والمزيد عبر مساحة عملك.",
    "fr": "Recherchez des documents, dossiers, requêtes et plus dans votre espace de travail.",
    "ms": "Cari dokumen, folder, permintaan, dan banyak lagi merentasi ruang kerja anda."
  },
  "Search permissions...": {
    "ar": "بحث في الأذونات...",
    "fr": "Rechercher des autorisations...",
    "ms": "Cari kebenaran..."
  },
  "Search users or type email…": {
    "ar": "ابحث عن مستخدمين أو اكتب بريداً…",
    "fr": "Rechercher des utilisateurs ou saisir un e-mail…",
    "ms": "Cari pengguna atau taip e-mel…"
  },
  "Searching AI": {
    "ar": "جاري البحث بالذكاء الاصطناعي",
    "fr": "Recherche IA",
    "ms": "Mencari AI"
  },
  "Searching…": {
    "ar": "جاري البحث…",
    "fr": "Recherche…",
    "ms": "Mencari…"
  },
  "Security Action": {
    "ar": "إجراء الأمان",
    "fr": "Action de sécurité",
    "ms": "Tindakan Keselamatan"
  },
  "Security policy saved successfully": {
    "ar": "تم حفظ سياسة الأمان بنجاح",
    "fr": "Politique de sécurité enregistrée avec succès",
    "ms": "Dasar keselamatan berjaya disimpan"
  },
  "Security Summary": {
    "ar": "ملخص الأمان",
    "fr": "Résumé de sécurité",
    "ms": "Ringkasan Keselamatan"
  },
  "Select a column…": {
    "ar": "حدد عموداً…",
    "fr": "Sélectionner une colonne…",
    "ms": "Pilih lajur…"
  },
  "Select All": {
    "ar": "تحديد الكل",
    "fr": "Tout sélectionner",
    "ms": "Pilih Semua"
  },
  "Select an integration": {
    "ar": "حدد تكاملاً",
    "fr": "Sélectionner une intégration",
    "ms": "Pilih integrasi"
  },
  "Select field...": {
    "ar": "حدد حقلاً...",
    "fr": "Sélectionner un champ...",
    "ms": "Pilih medan..."
  },
  "Select File Column": {
    "ar": "حدد عمود الملف",
    "fr": "Sélectionner la colonne du fichier",
    "ms": "Pilih Lajur Fail"
  },
  "Select matching column...": {
    "ar": "حدد العمود المطابق...",
    "fr": "Sélectionner la colonne correspondante...",
    "ms": "Pilih lajur sepadan..."
  },
  "Select or add at least one valid email": {
    "ar": "حدد أو أضف بريداً إلكترونياً صالحاً واحداً على الأقل",
    "fr": "Sélectionnez ou ajoutez au moins un e-mail valide",
    "ms": "Pilih atau tambah sekurang-kurangnya satu e-mel sah"
  },
  "Select or type email…": {
    "ar": "حدد أو اكتب بريداً…",
    "fr": "Sélectionner ou saisir un e-mail…",
    "ms": "Pilih atau taip e-mel…"
  },
  "Select Rule Action": {
    "ar": "حدد إجراء القاعدة",
    "fr": "Sélectionner l'action de règle",
    "ms": "Pilih Tindakan Peraturan"
  },
  "Select Storage": {
    "ar": "حدد التخزين",
    "fr": "Sélectionner le stockage",
    "ms": "Pilih Storan"
  },
  "Select the storage provider where documents for this folder should be stored.": {
    "ar": "حدد مزود التخزين حيث يجب تخزين مستندات هذا المجلد.",
    "fr": "Sélectionnez le fournisseur de stockage où les documents de ce dossier doivent être stockés.",
    "ms": "Pilih pembekal storan di mana dokumen untuk folder ini patut disimpan."
  },
  "Select users or groups who will be subject to this document security rule (Grant Access).": {
    "ar": "حدد المستخدمين أو المجموعات الخاضعة لقاعدة أمان المستند هذه (منح الوصول).",
    "fr": "Sélectionnez les utilisateurs ou groupes soumis à cette règle de sécurité (Accorder l'accès).",
    "ms": "Pilih pengguna atau kumpulan yang tertakluk pada peraturan keselamatan dokumen ini (Berikan Akses)."
  },
  "Select users or groups who will be subject to this document security rule (Hide Documents).": {
    "ar": "حدد المستخدمين أو المجموعات الخاضعة لقاعدة أمان المستند هذه (إخفاء المستندات).",
    "fr": "Sélectionnez les utilisateurs ou groupes soumis à cette règle de sécurité (Masquer les documents).",
    "ms": "Pilih pengguna atau kumpulan yang tertakluk pada peraturan keselamatan dokumen ini (Sembunyikan Dokumen)."
  },
  "Select Workflow Template": {
    "ar": "حدد قالب سير العمل",
    "fr": "Sélectionner le modèle de flux",
    "ms": "Pilih Templat Aliran Kerja"
  },
  "Selected Document": {
    "ar": "المستند المحدد",
    "fr": "Document sélectionné",
    "ms": "Dokumen Dipilih"
  },
  "selected users": {
    "ar": "مستخدمون محددون",
    "fr": "utilisateurs sélectionnés",
    "ms": "pengguna dipilih"
  },
  "Send": {
    "ar": "إرسال",
    "fr": "Envoyer",
    "ms": "Hantar"
  },
  "Send for Signature": {
    "ar": "إرسال للتوقيع",
    "fr": "Envoyer pour signature",
    "ms": "Hantar untuk Tandatangan"
  },
  "Set the folder name and let AI draft a clear business description for this repository.": {
    "ar": "حدد اسم المجلد ودع الذكاء الاصطناعي يصوغ وصفاً تجارياً واضحاً لهذا المستودع.",
    "fr": "Définissez le nom du dossier et laissez l'IA rédiger une description métier claire pour ce dépôt.",
    "ms": "Tetapkan nama folder dan biarkan AI draf penerangan perniagaan yang jelas untuk repositori ini."
  },
  "Share revoked": {
    "ar": "تم إلغاء المشاركة",
    "fr": "Partage révoqué",
    "ms": "Perkongsian dibatalkan"
  },
  "Shareable Link": {
    "ar": "رابط قابل للمشاركة",
    "fr": "Lien partageable",
    "ms": "Pautan Boleh Dikongsi"
  },
  "Sheets Used": {
    "ar": "الأوراق المستخدمة",
    "fr": "Feuilles utilisées",
    "ms": "Helaian Digunakan"
  },
  "Show matching documents to target users.": {
    "ar": "إظهار المستندات المطابقة للمستخدمين المستهدفين.",
    "fr": "Afficher les documents correspondants aux utilisateurs cibles.",
    "ms": "Tunjukkan dokumen sepadan kepada pengguna sasaran."
  },
  "Skip to Import": {
    "ar": "تخطي إلى الاستيراد",
    "fr": "Passer à l'import",
    "ms": "Langkau ke Import"
  },
  "skipped": {
    "ar": "تم تخطيه",
    "fr": "ignoré",
    "ms": "dilangkau"
  },
  "Skipped (Will not be imported)": {
    "ar": "تم التخطي (لن يتم استيراده)",
    "fr": "Ignoré (ne sera pas importé)",
    "ms": "Dilangkau (Tidak akan diimport)"
  },
  "Smart PO Matching": {
    "ar": "مطابقة PO ذكية",
    "fr": "Correspondance PO intelligente",
    "ms": "Padanan PO Pintar"
  },
  "Source Field": {
    "ar": "حقل المصدر",
    "fr": "Champ source",
    "ms": "Medan Sumber"
  },
  "Source File": {
    "ar": "ملف المصدر",
    "fr": "Fichier source",
    "ms": "Fail Sumber"
  },
  "Source File:": {
    "ar": "ملف المصدر:",
    "fr": "Fichier source :",
    "ms": "Fail Sumber:"
  },
  "Start": {
    "ar": "بدء",
    "fr": "Démarrer",
    "ms": "Mula"
  },
  "Start typing to search": {
    "ar": "ابدأ الكتابة للبحث",
    "fr": "Commencez à taper pour rechercher",
    "ms": "Mula taip untuk cari"
  },
  "Starts With": {
    "ar": "يبدأ بـ",
    "fr": "Commence par",
    "ms": "Bermula Dengan"
  },
  "Storage selected. Documents will be saved here once you begin processing.": {
    "ar": "تم تحديد التخزين. ستُحفظ المستندات هنا عند بدء المعالجة.",
    "fr": "Stockage sélectionné. Les documents seront enregistrés ici une fois le traitement commencé.",
    "ms": "Storan dipilih. Dokumen akan disimpan di sini apabila anda mula memproses."
  },
  "Streamline your Accounts Payable. Automatically process invoices, match Purchase Orders, and gain complete visibility.": {
    "ar": "بسّط الحسابات الدائنة. عالج الفواتير تلقائياً وطابق أوامر الشراء واحصل على رؤية كاملة.",
    "fr": "Rationalisez vos comptes fournisseurs. Traitez automatiquement les factures, rapprochez les bons de commande et obtenez une visibilité complète.",
    "ms": "Permudahkan Akaun Belum Bayar anda. Proses invois secara automatik, padankan Pesanan Pembelian, dan dapatkan keterlihatan penuh."
  },
  "Streamline your Purchase Orders. Automatically match columns, extract records, and configure ingestion logic.": {
    "ar": "بسّط أوامر الشراء. طابق الأعمدة تلقائياً واستخرج السجلات وكوّن منطق الاستيراد.",
    "fr": "Rationalisez vos bons de commande. Faites correspondre automatiquement les colonnes, extrayez les enregistrements et configurez la logique d'ingestion.",
    "ms": "Permudahkan Pesanan Pembelian anda. Padankan lajur secara automatik, ekstrak rekod, dan konfigurasi logik pengambilan."
  },
  "Supplier Conflict": {
    "ar": "تعارض المورد",
    "fr": "Conflit fournisseur",
    "ms": "Konflik Pembekal"
  },
  "Supplier details differ.": {
    "ar": "تفاصيل المورد مختلفة.",
    "fr": "Les détails du fournisseur diffèrent.",
    "ms": "Butiran pembekal berbeza."
  },
  "Supplier Trend Insight": {
    "ar": "رؤية اتجاه المورد",
    "fr": "Aperçu des tendances fournisseur",
    "ms": "Wawasan Trend Pembekal"
  },
  "Support for PDF, images, and scanned documents": {
    "ar": "دعم PDF والصور والمستندات الممسوحة",
    "fr": "Prise en charge des PDF, images et documents numérisés",
    "ms": "Sokongan untuk PDF, imej, dan dokumen imbasan"
  },
  "Supports Excel (.xlsx, .xls) and CSV formats": {
    "ar": "يدعم صيغ Excel (.xlsx, .xls) وCSV",
    "fr": "Prend en charge les formats Excel (.xlsx, .xls) et CSV",
    "ms": "Menyokong format Excel (.xlsx, .xls) dan CSV"
  },
  "Supports PDF and Images · Max 4 MB": {
    "ar": "يدعم PDF والصور · الحد الأقصى 4 ميجابايت",
    "fr": "Prend en charge PDF et images · Max 4 Mo",
    "ms": "Menyokong PDF dan Imej · Maks 4 MB"
  },
  "System Default": {
    "ar": "الافتراضي للنظام",
    "fr": "Par défaut du système",
    "ms": "Lalai Sistem"
  },
  "System Field": {
    "ar": "حقل النظام",
    "fr": "Champ système",
    "ms": "Medan Sistem"
  },
  "Target Users & Groups": {
    "ar": "المستخدمون والمجموعات المستهدفة",
    "fr": "Utilisateurs et groupes cibles",
    "ms": "Pengguna & Kumpulan Sasaran"
  },
  "Template": {
    "ar": "قالب",
    "fr": "Modèle",
    "ms": "Templat"
  },
  "Template & Upload": {
    "ar": "قالب ورفع",
    "fr": "Modèle et téléversement",
    "ms": "Templat & Muat Naik"
  },
  "The selected repository did not return editable metadata fields. Please confirm the repository field configuration from the backend response.": {
    "ar": "لم يُرجع المستودع المحدد حقول بيانات وصفية قابلة للتعديل. يرجى التحقق من تكوين حقول المستودع من استجابة الخادم.",
    "fr": "Le dépôt sélectionné n'a pas renvoyé de champs de métadonnées modifiables. Veuillez confirmer la configuration des champs du dépôt depuis la réponse backend.",
    "ms": "Repositori yang dipilih tidak mengembalikan medan metadata boleh edit. Sila sahkan konfigurasi medan repositori daripada respons backend."
  },
  "The server encountered an error while importing the purchase orders. Please try again.": {
    "ar": "واجه الخادم خطأ أثناء استيراد أوامر الشراء. يرجى المحاولة مرة أخرى.",
    "fr": "Le serveur a rencontré une erreur lors de l'import des bons de commande. Veuillez réessayer.",
    "ms": "Pelayan menghadapi ralat semasa mengimport pesanan pembelian. Sila cuba lagi."
  },
  "This workbook contains only one worksheet. PO Import requires both Header and Line Item data. Please upload an Excel file containing at least two worksheets.": {
    "ar": "يحتوي هذا المصنف على ورقة عمل واحدة فقط. يتطلب استيراد PO بيانات الرأس وبنود السطر. يرجى رفع ملف Excel يحتوي على ورقتي عمل على الأقل.",
    "fr": "Ce classeur ne contient qu'une feuille de calcul. L'import PO nécessite les données d'en-tête et de lignes. Veuillez téléverser un fichier Excel contenant au moins deux feuilles.",
    "ms": "Buku kerja ini hanya mengandungi satu helaian kerja. Import PO memerlukan data Pengepala dan Item Baris. Sila muat naik fail Excel dengan sekurang-kurangnya dua helaian kerja."
  },
  "Three-Way Matching": {
    "ar": "المطابقة الثلاثية",
    "fr": "Rapprochement à trois voies",
    "ms": "Padanan Tiga Hala"
  },
  "Timeline": {
    "ar": "الجدول الزمني",
    "fr": "Chronologie",
    "ms": "Garis Masa"
  },
  "Timestamp Version": {
    "ar": "إصدار الطابع الزمني",
    "fr": "Version horodatée",
    "ms": "Versi Cap Masa"
  },
  "To begin: what should this folder be named? Use a clear business name, choose an example below, or describe a full folder idea to generate a complete setup.": {
    "ar": "للبدء: ما اسم هذا الممجلد؟ استخدم اسماً تجارياً واضحاً، أو اختر مثالاً أدناه، أو صف فكرة مجلد كاملة لإنشاء إعداد متكامل.",
    "fr": "Pour commencer : quel nom pour ce dossier ? Utilisez un nom métier clair, choisissez un exemple ci-dessous, ou décrivez une idée complète de dossier pour générer une configuration complète.",
    "ms": "Untuk bermula: apakah nama folder ini? Gunakan nama perniagaan yang jelas, pilih contoh di bawah, atau terangkan idea folder penuh untuk jana persediaan lengkap."
  },
  "Total Records:": {
    "ar": "إجمالي السجلات:",
    "fr": "Total des enregistrements :",
    "ms": "Jumlah Rekod:"
  },
  "Track processing status, approvals, and analytics from a unified dashboard.": {
    "ar": "تتبع حالة المعالجة والموافقات والتحليلات من لوحة معلومات موحدة.",
    "fr": "Suivez le statut de traitement, les approbations et les analyses depuis un tableau de bord unifié.",
    "ms": "Jejaki status pemprosesan, kelulusan, dan analitik dari papan pemuka bersatu."
  },
  "Try the platform with sample invoices and records.": {
    "ar": "جرّب المنصة بفواتير وسجلات نموذجية.",
    "fr": "Essayez la plateforme avec des factures et enregistrements d'exemple.",
    "ms": "Cuba platform dengan invois dan rekod sampel."
  },
  "Type your answer…": {
    "ar": "اكتب إجابتك…",
    "fr": "Saisissez votre réponse…",
    "ms": "Taip jawapan anda…"
  },
  "Unable to download file": {
    "ar": "تعذر تنزيل الملف",
    "fr": "Impossible de télécharger le fichier",
    "ms": "Tidak dapat muat turun fail"
  },
  "Unable to load document details": {
    "ar": "تعذر تحميل تفاصيل المستند",
    "fr": "Impossible de charger les détails du document",
    "ms": "Tidak dapat memuatkan butiran dokumen"
  },
  "Undercharged": {
    "ar": "ناقص",
    "fr": "Sous-facturé",
    "ms": "Dicaj Kurang"
  },
  "Unsupported file type. Please upload a CSV or XLSX file.": {
    "ar": "نوع ملف غير مدعوم. يرجى رفع ملف CSV أو XLSX.",
    "fr": "Type de fichier non pris en charge. Veuillez téléverser un fichier CSV ou XLSX.",
    "ms": "Jenis fail tidak disokong. Sila muat naik fail CSV atau XLSX."
  },
  "Untitled folder": {
    "ar": "مجلد بدون عنوان",
    "fr": "Dossier sans titre",
    "ms": "Folder tanpa tajuk"
  },
  "Update the integration preference for this folder.": {
    "ar": "حدّث تفضيل التكامل لهذا المجلد.",
    "fr": "Mettez à jour la préférence d'intégration pour ce dossier.",
    "ms": "Kemas kini pilihan integrasi untuk folder ini."
  },
  "Update the storage provider for this folder.": {
    "ar": "حدّث مزود التخزين لهذا المجلد.",
    "fr": "Mettez à jour le fournisseur de stockage pour ce dossier.",
    "ms": "Kemas kini pembekal storan untuk folder ini."
  },
  "Update the versioning strategy for this folder.": {
    "ar": "حدّث استراتيجية الإصدارات لهذا المجلد.",
    "fr": "Mettez à jour la stratégie de versionnement pour ce dossier.",
    "ms": "Kemas kini strategi versi untuk folder ini."
  },
  "Updates records in master database": {
    "ar": "يحدّث السجلات في قاعدة البيانات الرئيسية",
    "fr": "Met à jour les enregistrements dans la base de données master",
    "ms": "Mengemas kini rekod dalam pangkalan data induk"
  },
  "Upload a PO file; we'll extract headers for mapping.": {
    "ar": "ارفع ملف PO؛ سنستخرج الرؤوس للربط.",
    "fr": "Téléversez un fichier PO ; nous extrairons les en-têtes pour le mappage.",
    "ms": "Muat naik fail PO; kami akan ekstrak pengepala untuk pemetaan."
  },
  "Upload documents securely, assign metadata, and organize files within your repository for efficient search and management.": {
    "ar": "ارفع المستندات بأمان، وعيّن البيانات الوصفية، ونظّم الملفات داخل مستودعك للبحث والإدارة بكفاءة.",
    "fr": "Téléversez des documents en toute sécurité, assignez des métadonnées et organisez les fichiers dans votre dépôt pour une recherche et une gestion efficaces.",
    "ms": "Muat naik dokumen dengan selamat, tetapkan metadata, dan susun fail dalam repositori anda untuk carian dan pengurusan yang cekap."
  },
  "Upload Files": {
    "ar": "رفع الملفات",
    "fr": "Téléverser des fichiers",
    "ms": "Muat Naik Fail"
  },
  "Upload invoice": {
    "ar": "رفع فاتورة",
    "fr": "Téléverser une facture",
    "ms": "Muat naik invois"
  },
  "Upload new files": {
    "ar": "رفع ملفات جديدة",
    "fr": "Téléverser de nouveaux fichiers",
    "ms": "Muat naik fail baharu"
  },
  "Upload PO master file": {
    "ar": "رفع ملف PO الرئيسي",
    "fr": "Téléverser le fichier PO master",
    "ms": "Muat naik fail induk PO"
  },
  "Upload PO Master File": {
    "ar": "رفع ملف PO الرئيسي",
    "fr": "Téléverser le fichier PO Master",
    "ms": "Muat Naik Fail Induk PO"
  },
  "Upload PO master file selected. A PO master file is required to proceed with the setup.": {
    "ar": "تم تحديد رفع ملف PO الرئيسي. يلزم ملف PO رئيسي للمتابعة في الإعداد.",
    "fr": "Téléversement du fichier PO master sélectionné. Un fichier PO master est requis pour poursuivre la configuration.",
    "ms": "Muat naik fail induk PO dipilih. Fail induk PO diperlukan untuk teruskan persediaan."
  },
  "Upload Purchase Order": {
    "ar": "رفع أمر الشراء",
    "fr": "Téléverser un bon de commande",
    "ms": "Muat Naik Pesanan Pembelian"
  },
  "Uploading & Processing ({0}/{1})...": {
    "ar": "جاري الرفع والمعالجة ({0}/{1})...",
    "fr": "Téléversement et traitement ({0}/{1})...",
    "ms": "Memuat naik & Memproses ({0}/{1})..."
  },
  "Uploading & Processing...": {
    "ar": "جاري الرفع والمعالجة...",
    "fr": "Téléversement et traitement...",
    "ms": "Memuat naik & Memproses..."
  },
  "Use demo data": {
    "ar": "استخدام بيانات تجريبية",
    "fr": "Utiliser des données de démo",
    "ms": "Guna data demo"
  },
  "Use this setup": {
    "ar": "استخدام هذا الإعداد",
    "fr": "Utiliser cette configuration",
    "ms": "Guna persediaan ini"
  },
  "Users & Groups": {
    "ar": "المستخدمون والمجموعات",
    "fr": "Utilisateurs et groupes",
    "ms": "Pengguna & Kumpulan"
  },
  "Users in {targetUsersText} can view and access documents matching any configured rule group.": {
    "ar": "يمكن للمستخدمين في {targetUsersText} عرض والوصول إلى المستندات المطابقة لأي مجموعة قواعد مُكوَّنة.",
    "fr": "Les utilisateurs de {targetUsersText} peuvent consulter et accéder aux documents correspondant à tout groupe de règles configuré.",
    "ms": "Pengguna dalam {targetUsersText} boleh lihat dan akses dokumen yang sepadan dengan mana-mana kumpulan peraturan yang dikonfigurasi."
  },
  "Validate & submit": {
    "ar": "التحقق وإرسال",
    "fr": "Valider et soumettre",
    "ms": "Sahkan & hantar"
  },
  "Validate mappings and confirm to finalize import payload.": {
    "ar": "تحقق من الربط وأكد لإنهاء حمولة الاستيراد.",
    "fr": "Validez les mappages et confirmez pour finaliser la charge d'import.",
    "ms": "Sahkan pemetaan dan sahkan untuk muktamadkan muatan import."
  },
  "Validates required system fields": {
    "ar": "يتحقق من حقول النظام المطلوبة",
    "fr": "Valide les champs système obligatoires",
    "ms": "Mengesahkan medan sistem wajib"
  },
  "VALIDATION": {
    "ar": "التحقق",
    "fr": "VALIDATION",
    "ms": "PENGESAHAN"
  },
  "Value...": {
    "ar": "القيمة...",
    "fr": "Valeur...",
    "ms": "Nilai..."
  },
  "Vendor Check": {
    "ar": "فحص البائع",
    "fr": "Vérification fournisseur",
    "ms": "Semakan Vendor"
  },
  "Vendor identity mismatch.": {
    "ar": "عدم تطابق هوية البائع.",
    "fr": "Incohérence d'identité du fournisseur.",
    "ms": "Identiti vendor tidak sepadan."
  },
  "Versioning strategy saved. Do you require an ERP or system integration, or should integrations be configured later?": {
    "ar": "تم حفظ استراتيجية الإصدارات. هل تحتاج تكامل ERP أو نظام، أم يُكوَّن التكامل لاحقاً؟",
    "fr": "Stratégie de versionnement enregistrée. Avez-vous besoin d'une intégration ERP ou système, ou les intégrations doivent-elles être configurées plus tard ?",
    "ms": "Strategi versi disimpan. Adakah anda memerlukan integrasi ERP atau sistem, atau integrasi patut dikonfigurasi kemudian?"
  },
  "View": {
    "ar": "عرض",
    "fr": "Afficher",
    "ms": "Lihat"
  },
  "Waiting for field verification": {
    "ar": "في انتظار التحقق من الحقل",
    "fr": "En attente de vérification du champ",
    "ms": "Menunggu pengesahan medan"
  },
  "Warning: Column \"{column}\" is already mapped to \"{colLabel}\".": {
    "ar": "تحذير: العمود «{column}» مرتبط بالفعل بـ «{colLabel}».",
    "fr": "Avertissement : la colonne « {column} » est déjà mappée à « {colLabel} ».",
    "ms": "Amaran: Lajur \"{column}\" sudah dipetakan ke \"{colLabel}\"."
  },
  "What Happens Next?": {
    "ar": "ماذا يحدث بعد ذلك؟",
    "fr": "Que se passe-t-il ensuite ?",
    "ms": "Apa Seterusnya?"
  },
  "Which versioning strategy should apply when the same file is uploaded again?": {
    "ar": "ما استراتيجية الإصدارات التي يجب تطبيقها عند رفع نفس الملف مرة أخرى؟",
    "fr": "Quelle stratégie de versionnement appliquer lorsque le même fichier est téléversé à nouveau ?",
    "ms": "Strategi versi manakah patut digunakan apabila fail yang sama dimuat naik semula?"
  },
  "Workflow": {
    "ar": "سير العمل",
    "fr": "Flux de travail",
    "ms": "Aliran Kerja"
  },
  "Workflow ID is missing. Cannot start workflow.": {
    "ar": "معرف سير العمل مفقود. لا يمكن بدء سير العمل.",
    "fr": "ID du flux manquant. Impossible de démarrer le flux.",
    "ms": "ID Aliran Kerja hilang. Tidak boleh mulakan aliran kerja."
  },
  "Workflow started but did not return a valid instanceId or apAgentJobId.": {
    "ar": "بدأ سير العمل لكنه لم يُرجع instanceId أو apAgentJobId صالحاً.",
    "fr": "Le flux a démarré mais n'a pas renvoyé un instanceId ou apAgentJobId valide.",
    "ms": "Aliran kerja dimulakan tetapi tidak mengembalikan instanceId atau apAgentJobId yang sah."
  },
  "Workflow started but did not return any data.": {
    "ar": "بدأ سير العمل لكنه لم يُرجع أي بيانات.",
    "fr": "Le flux a démarré mais n'a renvoyé aucune donnée.",
    "ms": "Aliran kerja dimulakan tetapi tidak mengembalikan sebarang data."
  },
  "Working…": {
    "ar": "جاري العمل…",
    "fr": "En cours…",
    "ms": "Sedang berjalan…"
  },
  "You": {
    "ar": "أنت",
    "fr": "Vous",
    "ms": "Anda"
  },
  "Your {0} account is connected. Invoice documents will be saved here during processing.": {
    "ar": "حساب {0} متصل. ستُحفظ مستندات الفواتير هنا أثناء المعالجة.",
    "fr": "Votre compte {0} est connecté. Les documents de facturation seront enregistrés ici pendant le traitement.",
    "ms": "Akaun {0} anda disambungkan. Dokumen invois akan disimpan di sini semasa pemprosesan."
  },
  "Your AI agent will start monitoring your email and processing incoming invoices automatically.": {
    "ar": "سيبدأ وكيل الذكاء الاصطناعي بمراقبة بريدك ومعالجة الفواتير الواردة تلقائياً.",
    "fr": "Votre agent IA commencera à surveiller votre e-mail et à traiter automatiquement les factures entrantes.",
    "ms": "Ejen AI anda akan mula memantau e-mel anda dan memproses invois masuk secara automatik."
  },
  "Your PO file headers were successfully mapped, translated, and all purchase orders saved to the master ingestion pipeline.": {
    "ar": "تم ربط رؤوس ملف PO وترجمتها بنجاح، وحُفظت جميع أوامر الشراء في خط الاستيراد الرئيسي.",
    "fr": "Les en-têtes de votre fichier PO ont été mappés, traduits avec succès, et tous les bons de commande enregistrés dans le pipeline d'ingestion master.",
    "ms": "Pengepala fail PO anda berjaya dipetakan, diterjemah, dan semua pesanan pembelian disimpan ke saluran pengambilan induk."
  },
  "Your PO Master Data source has been parsed. Below, manually align the columns from your uploaded CSV/XLSX file to the required system fields for accurate processing.": {
    "ar": "تم تحليل مصدر بيانات PO Master. فيما يلي، قم بمحاذاة أعمدة ملف CSV/XLSX المرفوع يدوياً مع حقول النظام المطلوبة للمعالجة الدقيقة.",
    "fr": "Votre source PO Master Data a été analysée. Ci-dessous, alignez manuellement les colonnes de votre fichier CSV/XLSX téléversé aux champs système requis pour un traitement précis.",
    "ms": "Sumber Data Induk PO anda telah dihuraikan. Di bawah, jajarkan secara manual lajur daripada fail CSV/XLSX yang dimuat naik ke medan sistem yang diperlukan untuk pemprosesan tepat."
  },
  "Your PO master file uploaded successfully. You can proceed to the next step.": {
    "ar": "تم رفع ملف PO الرئيسي بنجاح. يمكنك المتابعة إلى الخطوة التالية.",
    "fr": "Votre fichier PO master a été téléversé avec succès. Vous pouvez passer à l'étape suivante.",
    "ms": "Fail induk PO anda berjaya dimuat naik. Anda boleh teruskan ke langkah seterusnya."
  },
  "Your QuickBooks account is connected. PO and supplier data will be used to match and validate invoices.": {
    "ar": "حساب QuickBooks متصل. ستُستخدم بيانات PO والمورد لمطابقة والتحقق من الفواتير.",
    "fr": "Votre compte QuickBooks est connecté. Les données PO et fournisseur seront utilisées pour rapprocher et valider les factures.",
    "ms": "Akaun QuickBooks anda disambungkan. Data PO dan pembekal akan digunakan untuk padankan dan sahkan invois."
  }
}

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
