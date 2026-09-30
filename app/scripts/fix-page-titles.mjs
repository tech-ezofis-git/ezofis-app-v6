import fs from 'node:fs'

const translations = {
  ar: {
    All: 'الكل',
    'Audit & Monitoring': 'التدقيق والمراقبة',
    Breadcrumb: 'مسار التنقل',
    'Credit Usage': 'استخدام الأرصدة',
    Dashboard: 'لوحة المعلومات',
    'Due Date': 'تاريخ الاستحقاق',
    'Folder Configuration': 'تكوين المجلدات',
    Folders: 'المجلدات',
    'Forgot Password': 'نسيت كلمة المرور',
    'Form Builder': 'منشئ النماذج',
    'Form Entries': 'إدخالات النموذج',
    Forms: 'النماذج',
    'Group Management': 'إدارة المجموعات',
    'Help Center': 'مركز المساعدة',
    Items: 'العناصر',
    'Mobile Preview': 'معاينة الجوال',
    'My Account': 'حسابي',
    'On Boarding': 'الإعداد الأولي',
    Playground: 'ساحة التجربة',
    'Playground API': 'واجهة برمجة تطبيقات بيئة الاختبار',
    Portals: 'البوابات',
    Reports: 'التقارير',
    Requests: 'الطلبات',
    'Reset Password': 'إعادة تعيين كلمة المرور',
    'Roles & Permissions': 'الأدوار والصلاحيات',
    Settings: 'الإعدادات',
    'Showing {from} - {to} of {totalItems} {label}':
      'عرض {from} - {to} من {totalItems} {label}',
    'Sign In': 'تسجيل الدخول',
    'Sign Up': 'إنشاء حساب',
    Tasks: 'المهام',
    Trash: 'سلة المهملات',
    Untitled: 'بدون عنوان',
    'User Management': 'إدارة المستخدمين',
    'Workflow Builder': 'منشئ سير العمل',
    Workflows: 'سير العمل',
    '{label} per page:': '{label} لكل صفحة:',
  },
  fr: {
    All: 'Tous',
    'Audit & Monitoring': 'Audit et surveillance',
    Breadcrumb: 'Fil d’Ariane',
    'Credit Usage': 'Utilisation des crédits',
    Dashboard: 'Tableau de bord',
    'Due Date': "Date d'échéance",
    'Folder Configuration': 'Configuration des dossiers',
    Folders: 'Dossiers',
    'Forgot Password': 'Mot de passe oublié',
    'Form Builder': 'Générateur de formulaires',
    'Form Entries': 'Entrées de formulaire',
    Forms: 'Formulaires',
    'Group Management': 'Gestion des groupes',
    'Help Center': "Centre d'aide",
    Items: 'Éléments',
    'Mobile Preview': 'Aperçu mobile',
    'My Account': 'Mon compte',
    'On Boarding': 'Intégration',
    Playground: 'Playground',
    'Playground API': 'API Playground',
    Portals: 'Portails',
    Reports: 'Rapports',
    Requests: 'Requêtes',
    'Reset Password': 'Réinitialiser le mot de passe',
    'Roles & Permissions': 'Rôles et permissions',
    Settings: 'Paramètres',
    'Showing {from} - {to} of {totalItems} {label}':
      'Affichage de {from} - {to} sur {totalItems} {label}',
    'Sign In': 'Connexion',
    'Sign Up': "S'inscrire",
    Tasks: 'Tâches',
    Trash: 'Corbeille',
    Untitled: 'Sans titre',
    'User Management': 'Gestion des utilisateurs',
    'Workflow Builder': 'Générateur de flux',
    Workflows: 'Flux de travail',
    '{label} per page:': '{label} par page :',
  },
  ms: {
    All: 'Semua',
    'Audit & Monitoring': 'Audit & Pemantauan',
    Breadcrumb: 'Breadcrumb',
    'Credit Usage': 'Penggunaan Kredit',
    Dashboard: 'Papan Pemuka',
    'Due Date': 'Tarikh Akhir',
    'Folder Configuration': 'Konfigurasi Folder',
    Folders: 'Folder',
    'Forgot Password': 'Lupa Kata Laluan',
    'Form Builder': 'Pembina Borang',
    'Form Entries': 'Entri Borang',
    Forms: 'Borang',
    'Group Management': 'Pengurusan Kumpulan',
    'Help Center': 'Pusat Bantuan',
    Items: 'Item',
    'Mobile Preview': 'Pratonton Mudah Alih',
    'My Account': 'Akaun Saya',
    'On Boarding': 'Orientasi',
    Playground: 'Playground',
    'Playground API': 'API Playground',
    Portals: 'Portal',
    Reports: 'Laporan',
    Requests: 'Permintaan',
    'Reset Password': 'Tetapkan Semula Kata Laluan',
    'Roles & Permissions': 'Peranan & Kebenaran',
    Settings: 'Tetapan',
    'Showing {from} - {to} of {totalItems} {label}':
      'Menunjukkan {from} - {to} daripada {totalItems} {label}',
    'Sign In': 'Log Masuk',
    'Sign Up': 'Daftar',
    Tasks: 'Tugas',
    Trash: 'Tong sampah',
    Untitled: 'Tanpa tajuk',
    'User Management': 'Pengurusan Pengguna',
    'Workflow Builder': 'Pembina Aliran Kerja',
    Workflows: 'Aliran Kerja',
    '{label} per page:': '{label} setiap halaman:',
  },
}

function escapePo(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function unescapePo(value) {
  return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
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
