const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Invoice (PDF)
const PDF_ACCEPT = 'application/pdf'

// PO Import (CSV/XLSX)
const PO_ACCEPT =
  '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv'

const makeId = (): string =>
  `file-${Date.now()}-${Math.floor(Math.random() * 100000)}`

// const formatFileSize = (bytes: number): string => {
//     if (!bytes) return "0 Bytes";
//     const k = 1024;
//     const sizes = ["Bytes", "KB", "MB", "GB"] as const;
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
// };

const isPdf = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const isCsv = (file: File) =>
  file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')

const isXlsx = (file: File) =>
  file.type ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.name.toLowerCase().endsWith('.xlsx')

const API_URL = import.meta.env?.VITE_BASE_URL

function downloadTemplate(tenantId: string) {
  const downloadURL = `${API_URL}/form/downloadExcel/${tenantId}/3`
  return downloadURL
}

export {
  makeId,
  isPdf,
  isCsv,
  isXlsx,
  MAX_SIZE,
  PDF_ACCEPT,
  PO_ACCEPT,
  downloadTemplate,
}
