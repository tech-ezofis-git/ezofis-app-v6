import { getCoreRowModel } from '@tanstack/react-table'

export const settingsTableDefaultColumn = {
  minSize: 40,
}

export const settingsTableCoreOptions = {
  defaultColumn: settingsTableDefaultColumn,
  getCoreRowModel: getCoreRowModel(),
}

export const settingsHeaderMeta = {
  center: { headerAlign: 'center' as const },
  end: { headerAlign: 'right' as const },
  start: { headerAlign: 'left' as const },
}
