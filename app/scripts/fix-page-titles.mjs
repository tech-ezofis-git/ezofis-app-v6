import fs from 'node:fs'

const translations = {
  ms: {
    Requests: 'Permintaan',
    Dashboard: 'Papan Pemuka',
    Folders: 'Folder',
    Workflows: 'Aliran Kerja',
    Forms: 'Borang',
    Settings: 'Tetapan',
    'Form Entries': 'Entri Borang',
    Reports: 'Laporan',
    Tasks: 'Tugas',
    Trash: 'Tong sampah',
    'Help Center': 'Pusat Bantuan',
    'Form Builder': 'Pembina Borang',
    'Workflow Builder': 'Pembina Aliran Kerja',
    'My Account': 'Akaun Saya',
    'Sign In': 'Log Masuk',
    'Sign Up': 'Daftar',
    'Forgot Password': 'Lupa Kata Laluan',
    'Reset Password': 'Tetapkan Semula Kata Laluan',
    'On Boarding': 'Orientasi',
    Untitled: 'Tanpa tajuk',
    Items: 'Item',
    All: 'Semua',
    'Due Date': 'Tarikh Akhir',
    Breadcrumb: 'Breadcrumb',
    Portals: 'Portal',
    Playground: 'Playground',
    'Mobile Preview': 'Pratonton Mudah Alih',
    'User Management': 'Pengurusan Pengguna',
    'Roles & Permissions': 'Peranan & Kebenaran',
    'Group Management': 'Pengurusan Kumpulan',
    'Folder Configuration': 'Konfigurasi Folder',
    'Audit & Monitoring': 'Audit & Pemantauan',
    'Credit Usage': 'Penggunaan Kredit',
    'Playground API': 'API Playground',
    'Showing {from} - {to} of {totalItems} {label}':
      'Menunjukkan {from} - {to} daripada {totalItems} {label}',
    '{label} per page:': '{label} setiap halaman:',
  },
  fr: {
    Requests: 'Requêtes',
    Dashboard: 'Tableau de bord',
    Folders: 'Dossiers',
    Workflows: 'Flux de travail',
    Forms: 'Formulaires',
    Settings: 'Paramètres',
    'Form Entries': 'Entrées de formulaire',
    Reports: 'Rapports',
    Tasks: 'Tâches',
    Trash: 'Corbeille',
    'Help Center': "Centre d'aide",
    'Form Builder': 'Générateur de formulaires',
    'Workflow Builder': 'Générateur de flux',
    'My Account': 'Mon compte',
    'Sign In': 'Connexion',
    'Sign Up': "S'inscrire",
    'Forgot Password': 'Mot de passe oublié',
    'Reset Password': 'Réinitialiser le mot de passe',
    'On Boarding': 'Intégration',
    Untitled: 'Sans titre',
    Items: 'Éléments',
    All: 'Tous',
    'Due Date': "Date d'échéance",
    Breadcrumb: 'Fil d’Ariane',
    Portals: 'Portails',
    Playground: 'Playground',
    'Mobile Preview': 'Aperçu mobile',
    'User Management': 'Gestion des utilisateurs',
    'Roles & Permissions': 'Rôles et permissions',
    'Group Management': 'Gestion des groupes',
    'Folder Configuration': 'Configuration des dossiers',
    'Audit & Monitoring': 'Audit et surveillance',
    'Credit Usage': 'Utilisation des crédits',
    'Playground API': 'API Playground',
    'Showing {from} - {to} of {totalItems} {label}':
      'Affichage de {from} - {to} sur {totalItems} {label}',
    '{label} per page:': '{label} par page :',
  },
  ar: {
    Requests: 'الطلبات',
    Dashboard: 'لوحة المعلومات',
    Folders: 'المجلدات',
    Workflows: 'سير العمل',
    Forms: 'النماذج',
    Settings: 'الإعدادات',
    'Form Entries': 'إدخالات النموذج',
    Reports: 'التقارير',
    Tasks: 'المهام',
    Trash: 'سلة المهملات',
    'Help Center': 'مركز المساعدة',
    'Form Builder': 'منشئ النماذج',
    'Workflow Builder': 'منشئ سير العمل',
    'My Account': 'حسابي',
    'Sign In': 'تسجيل الدخول',
    'Sign Up': 'إنشاء حساب',
    'Forgot Password': 'نسيت كلمة المرور',
    'Reset Password': 'إعادة تعيين كلمة المرور',
    'On Boarding': 'الإعداد الأولي',
    Untitled: 'بدون عنوان',
    Items: 'العناصر',
    All: 'الكل',
    'Due Date': 'تاريخ الاستحقاق',
    Breadcrumb: 'مسار التنقل',
    Portals: 'البوابات',
    Playground: 'ساحة التجربة',
    'Mobile Preview': 'معاينة الجوال',
    'User Management': 'إدارة المستخدمين',
    'Roles & Permissions': 'الأدوار والصلاحيات',
    'Group Management': 'إدارة المجموعات',
    'Folder Configuration': 'تكوين المجلدات',
    'Audit & Monitoring': 'التدقيق والمراقبة',
    'Credit Usage': 'استخدام الأرصدة',
    'Playground API': 'واجهة برمجة تطبيقات بيئة الاختبار',
    'Showing {from} - {to} of {totalItems} {label}':
      'عرض {from} - {to} من {totalItems} {label}',
    '{label} per page:': '{label} لكل صفحة:',
  },
}

function unescapePo(value) {
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function escapePo(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

for (const locale of ['ms', 'fr', 'ar']) {
  const file = `src/locales/${locale}/messages.po`
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const map = translations[locale]
  const out = []
  let updated = 0

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const match = line.match(/^msgid "(.*)"$/)
    if (match && match[1] !== '') {
      const msgid = unescapePo(match[1])
      out.push(line)
      i += 1
      if (i < lines.length && lines[i].startsWith('msgstr "')) {
        const tr = map[msgid]
        if (tr !== undefined) {
          out.push(`msgstr "${escapePo(tr)}"`)
          updated += 1
        } else {
          out.push(lines[i])
        }
      } else if (i < lines.length) {
        out.push(lines[i])
      }
      continue
    }
    out.push(line)
  }

  fs.writeFileSync(file, out.join('\n'))
  console.log(`${locale}: updated ${updated}`)
}
