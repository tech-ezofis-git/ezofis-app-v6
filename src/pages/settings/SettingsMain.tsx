import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserRoundCheck,
  PanelsTopLeft,
  FolderOpen,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import ManageUser from './components/ManageUser';
import RolesPermissions from './components/RolesPermissions';
import GroupManagement from './components/GroupManagement';
import Menu from './components/Menus';
import DmsSettings from './components/Folders/DmsSettings'
import AuditMonitoring from './components/AuditMonitoring';

type SettingsItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  key: string;
};

const settingsItems: SettingsItem[] = [
  {
    key: 'user-management',
    title: 'User Management',
    description:
      'Add, edit, and manage platform users. Configure authentication and assign roles.',
    icon: Users,
  },
  {
    key: 'roles-permissions',
    title: 'Roles & Permissions',
    description:
      'Define roles and configure granular permissions across all modules.',
    icon: Shield,
  },
  {
    key: 'group-management',
    title: 'Group Management',
    description:
      'Create logical groups to organize users by team, department, or function.',
    icon: UserRoundCheck,
  },
  {
    key: 'menu-profiles',
    title: 'Menu & Profiles',
    description:
      'Control navigation visibility, ordering, and default landing pages per role.',
    icon: PanelsTopLeft,
  },
  {
    key: 'dms-folders',
    title: 'DMS & Folders',
    description:
      'Create document repositories with custom fields, security, and versioning.',
    icon: FolderOpen,
  },
  // {
  //   key: 'ai-agent-config',
  //   title: 'AI Agent Config',
  //   description:
  //     'Configure OCR engine, approval thresholds, matching rules, and more.',
  //   icon: Bot,
  // },
  {
    key: 'audit-monitoring',
    title: 'Audit & Monitoring',
    description:
      'View activity logs, security events, and configuration change history.',
    icon: ClipboardList,
  },
];

export default function SettingsMain() {
  const [activePage, setActivePage] = useState<string>('settings');

  if (activePage === 'user-management') {
    return (
      
        <ManageUser onBack={() => setActivePage('settings')} />

    );
  }
  if(activePage==='roles-permissions'){
    return(
<RolesPermissions onBack={() => setActivePage('settings')} />
    )
  }
  if(activePage==='group-management'){
    return(
<GroupManagement onBack={() => setActivePage('settings')}/>
    )
  }

  if(activePage==='menu-profiles'){
    return(
        <Menu onBack={() => setActivePage('settings')}/>
    )

    
  }
if(activePage==='dms-folders'){
 return( 
      <DmsSettings onBack={() => setActivePage('settings')}/>
 )
 
    }

    if(activePage==='audit-monitoring'){
  return(
    <AuditMonitoring onBack={() => setActivePage('settings')}/>
  )
 }

  return (
    <main className=" bg-[var(--surface-secondary)] overflow-y-auto" >
      <section className='mb-4 bg-surface flex items-center justify-between border-b border-gray-3 px-6 py-4 md:px-8' >
        <div className="flex flex-col gap-1">
        <h1 className="text-18/6 font-semibold tracking-tight text-gray-13">
          Settings &amp; Administration
        </h1>
        <p className="text-13/5 text-gray-11">
          Configure your AP Agent and DMS platform
        </p>
        </div>
      </section>

     <section
  className="mt-8 grid max-h-[calc(100vh-150px)] max-w-[93vw] grid-cols-1 gap-4  px-6 py-4 md:px-8  lg:grid-cols-2"
  aria-label="Settings administration modules"
>
        {settingsItems.map((item) => {
          const Icon = item.icon;

          return (
           <button
  key={item.key}
  type="button"
  onClick={() => setActivePage(item.key)}
  className="group grid min-h-[88px] w-full grid-cols-[40px_1fr_24px] items-start rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-primary)] px-6 py-5 text-left shadow-[var(--shadow-sm)] transition hover:border-[var(--primary-7)] hover:shadow-[var(--shadow-md)]"
>
  <span className="flex h-8 w-8 items-center justify-center pt-1 text-[var(--primary-10)]">
    <Icon size={20} strokeWidth={1.9} />
  </span>

  <span className="min-w-0">
    <span className="block text-sm font-semibold leading-5 text-[var(--text-primary)]">
      {item.title}
    </span>

    <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
      {item.description}
    </span>
  </span>

  <ChevronRight
    className="mt-1 text-[var(--gray-8)] transition group-hover:translate-x-1 group-hover:text-[var(--primary-10)]"
    size={20}
    strokeWidth={1.8}
  />
</button>
          );
        })}
      </section>
    </main>
  );
}