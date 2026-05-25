import type {
  AiSummaryData,
  DocumentDetail,
  FileItem,
  FolderItem,
  MetadataSection,
  ShareData,
  TreeNode,
  WorkflowData,
} from '../types/folderTypes'
import type { BreadcrumbItem } from '../components/Breadcrumbs'

const wait = () => new Promise((resolve) => setTimeout(resolve, 100))

const files = (): FileItem[] => [
  {
    id: 'INV-2024-0891',
    name: 'INV-2024-0891.pdf',
    type: 'Invoice',
    supplier: 'Acme Corp',
    invoiceNo: 'INV-2024-0891',
    poNo: 'PO-4589',
    date: '2024-11-15',
    amount: '₹245K',
    status: 'Pending',
    ocr: 98,
    risk: 'low',
    source: 'Email',
    fileUrl: 'https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf',
  },
  {
    id: 'INV-2024-0892',
    name: 'INV-2024-0892.pdf',
    type: 'Invoice',
    supplier: 'TechPro Ltd',
    invoiceNo: 'INV-2024-0892',
    poNo: 'PO-4590',
    date: '2024-11-14',
    amount: '₹189K',
    status: 'Approved',
    ocr: 96,
    risk: 'low',
    source: 'Upload',
  },
  {
    id: 'INV-2024-0893',
    name: 'INV-2024-0893.pdf',
    type: 'Invoice',
    supplier: 'Acme Corp',
    invoiceNo: 'INV-2024-0893',
    poNo: '-',
    date: '2024-11-13',
    amount: '₹420K',
    status: 'Flagged',
    ocr: 72,
    risk: 'high',
    source: 'Email',
  },
  {
    id: 'PO-4591',
    name: 'PO-4591.pdf',
    type: 'Purchase Order',
    supplier: 'GlobalSup Inc',
    invoiceNo: '-',
    poNo: 'PO-4591',
    date: '2024-11-12',
    amount: '₹156K',
    status: 'Active',
    ocr: 99,
    risk: 'low',
    source: 'ERP',
  },
  {
    id: 'INV-2024-0894',
    name: 'INV-2024-0894.pdf',
    type: 'Invoice',
    supplier: 'FastShip Co',
    invoiceNo: 'INV-2024-0894',
    poNo: 'PO-4588',
    date: '2024-11-11',
    amount: '₹87K',
    status: 'Pending',
    ocr: 91,
    risk: 'medium',
    source: 'Email',
  },
  {
    id: 'CNT-2024-045',
    name: 'CNT-2024-045.pdf',
    type: 'Contract',
    supplier: 'MetalWorks',
    invoiceNo: '-',
    poNo: '-',
    date: '2024-11-10',
    amount: '₹1200K',
    status: 'Active',
    ocr: 97,
    risk: 'low',
    source: 'Upload',
  },
  {
    id: 'INV-2024-0895',
    name: 'INV-2024-0895.pdf',
    type: 'Invoice',
    supplier: 'PrimeParts',
    invoiceNo: 'INV-2024-0895',
    poNo: 'PO-4585',
    date: '2024-11-09',
    amount: '₹63.5K',
    status: 'Rejected',
    ocr: 65,
    risk: 'high',
    source: 'Scanner',
  },
  {
    id: 'STM-2024-Q3',
    name: 'STM-2024-Q3.pdf',
    type: 'Statement',
    supplier: 'Acme Corp',
    invoiceNo: '-',
    poNo: '-',
    date: '2024-10-31',
    amount: '-',
    status: 'Processed',
    ocr: 95,
    risk: 'low',
    source: 'Email',
  },
]

const allSupplierFolders: FolderItem[] = [
  {
    id: 'acme',
    title: 'Acme Corp',
    iconKey: 'building',
    itemsText: '1,420 items',
    modifiedText: 'Nov 15, 2024',
    sizeText: '1.1 GB',
  },
  {
    id: 'techpro',
    title: 'TechPro Ltd',
    iconKey: 'building',
    itemsText: '1,180 items',
    modifiedText: 'Nov 14, 2024',
    sizeText: '980 MB',
  },
  {
    id: 'globalsup',
    title: 'GlobalSup Inc',
    iconKey: 'building',
    itemsText: '980 items',
    modifiedText: 'Nov 13, 2024',
    sizeText: '820 MB',
  },
  {
    id: 'indialogistics',
    title: 'IndiaLogistics',
    iconKey: 'building',
    itemsText: '860 items',
    modifiedText: 'Nov 10, 2024',
    sizeText: '720 MB',
  },
  {
    id: 'fastship',
    title: 'FastShip Co',
    iconKey: 'building',
    itemsText: '640 items',
    modifiedText: 'Nov 8, 2024',
    sizeText: '510 MB',
  },
  {
    id: 'metalworks',
    title: 'MetalWorks',
    iconKey: 'building',
    itemsText: '340 items',
    modifiedText: 'Nov 5, 2024',
    sizeText: '290 MB',
  },
  {
    id: 'primeparts',
    title: 'PrimeParts',
    iconKey: 'building',
    itemsText: '280 items',
    modifiedText: 'Oct 30, 2024',
    sizeText: '240 MB',
  },
]

const acmeFolders: FolderItem[] = [
  {
    id: 'invoices',
    title: 'Invoices',
    iconKey: 'folder',
    itemsText: '8 files',
    modifiedText: 'Nov 15, 2024',
    sizeText: '245 MB',
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    iconKey: 'folder',
    itemsText: '4 files',
    modifiedText: 'Nov 10, 2024',
    sizeText: '84 MB',
  },
  {
    id: 'contracts',
    title: 'Contracts',
    iconKey: 'folder',
    itemsText: '2 files',
    modifiedText: 'Oct 01, 2024',
    sizeText: '42 MB',
  },
  {
    id: 'kyc',
    title: 'KYC Documents',
    iconKey: 'folder',
    itemsText: '3 files',
    modifiedText: 'Oct 18, 2024',
    sizeText: '35 MB',
  },
  {
    id: 'statements',
    title: 'Statements',
    iconKey: 'folder',
    itemsText: '6 files',
    modifiedText: 'Oct 31, 2024',
    sizeText: '64 MB',
  },
]

const folderResponse = (
  breadcrumbs: BreadcrumbItem[],
  folders: FolderItem[] = [],
  folderFiles: FileItem[] = []
) => ({
  breadcrumbs,
  folders,
  files: folderFiles,
})

export const folderApi = {
  async getTree(): Promise<TreeNode[]> {
    await wait()

    return [
      {
        id: 'ap',
        title: 'Accounts Payable',
        iconKey: 'folder',
        children: [
          {
            id: 'by-supplier',
            title: 'By Supplier',
            iconKey: 'folder',
            children: [
              {
                id: 'acme',
                title: 'Acme Corp',
                iconKey: 'building',
                children: [
                  { id: 'invoices', title: 'Invoices', iconKey: 'folder' },
                  {
                    id: 'purchase-orders',
                    title: 'Purchase Orders',
                    iconKey: 'folder',
                  },
                  { id: 'contracts', title: 'Contracts', iconKey: 'folder' },
                  { id: 'kyc', title: 'KYC Documents', iconKey: 'folder' },
                  { id: 'statements', title: 'Statements', iconKey: 'folder' },
                ],
              },
              { id: 'techpro', title: 'TechPro Ltd', iconKey: 'building' },
              { id: 'globalsup', title: 'GlobalSup Inc', iconKey: 'building' },
              { id: 'indialogistics', title: 'IndiaLogistics', iconKey: 'building' },
              { id: 'fastship', title: 'FastShip Co', iconKey: 'building' },
              { id: 'metalworks', title: 'MetalWorks', iconKey: 'building' },
              { id: 'primeparts', title: 'PrimeParts', iconKey: 'building' },
            ],
          },
          {
            id: 'by-type',
            title: 'By Document Type',
            iconKey: 'fileStack',
            children: [
              { id: 'type-invoice', title: 'Invoices', iconKey: 'fileText' },
              { id: 'type-po', title: 'Purchase Orders', iconKey: 'fileText' },
              { id: 'type-contract', title: 'Contracts', iconKey: 'fileText' },
            ],
          },
          {
            id: 'email-attachments',
            title: 'Email Attachments',
            iconKey: 'mail',
            children: [
              { id: 'email-today', title: 'Today', iconKey: 'folder' },
              { id: 'email-last7', title: 'Last 7 Days', iconKey: 'folder' },
            ],
          },
        ],
      },
      {
        id: 'ar',
        title: 'Accounts Receivable',
        iconKey: 'folder',
        children: [{ id: 'by-customer', title: 'By Customer', iconKey: 'users' }],
      },
      { id: 'recent', title: 'Recent', iconKey: 'clock' },
      { id: 'favorites', title: 'Favorites', iconKey: 'sparkles' },
    //   { id: 'archived', title: 'Archived', iconKey: 'archive' },
    ]
  },

  async getFolderContent(folderId: string): Promise<{
    breadcrumbs: BreadcrumbItem[]
    folders: FolderItem[]
    files: FileItem[]
  }> {
    await wait()

    switch (folderId) {
      case 'ap':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
          ],
          [
            {
              id: 'by-supplier',
              title: 'By Supplier',
              iconKey: 'folder',
              itemsText: '7 suppliers',
              modifiedText: 'Nov 15, 2024',
              sizeText: '4.6 GB',
            },
            {
              id: 'by-type',
              title: 'By Document Type',
              iconKey: 'fileStack',
              itemsText: '3 document groups',
              modifiedText: 'Nov 15, 2024',
              sizeText: '2.4 GB',
            },
            {
              id: 'email-attachments',
              title: 'Email Attachments',
              iconKey: 'mail',
              itemsText: '2 folders',
              modifiedText: 'Today',
              sizeText: '680 MB',
            },
          ],
          files()
        )

      case 'by-supplier':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
          ],
          allSupplierFolders,
          files()
        )

      case 'acme':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
          ],
          acmeFolders,
          files().filter((file) => file.supplier === 'Acme Corp')
        )

      case 'invoices':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
            { id: 'invoices', label: 'Invoices' },
          ],
          [],
          files().filter((file) => file.type === 'Invoice')
        )

      case 'purchase-orders':
      case 'type-po':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
            { id: 'purchase-orders', label: 'Purchase Orders' },
          ],
          [],
          files().filter((file) => file.type === 'Purchase Order')
        )

      case 'contracts':
      case 'type-contract':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
            { id: 'contracts', label: 'Contracts' },
          ],
          [],
          files().filter((file) => file.type === 'Contract')
        )

      case 'statements':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
            { id: 'statements', label: 'Statements' },
          ],
          [],
          files().filter((file) => file.type === 'Statement')
        )

      case 'kyc':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-supplier', label: 'By Supplier' },
            { id: 'acme', label: 'Acme Corp' },
            { id: 'kyc', label: 'KYC Documents' },
          ],
          [],
          []
        )

      case 'by-type':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-type', label: 'By Document Type' },
          ],
          [
            {
              id: 'type-invoice',
              title: 'Invoices',
              iconKey: 'fileText',
              itemsText: '5 files',
              modifiedText: 'Nov 15, 2024',
              sizeText: '420 MB',
            },
            {
              id: 'type-po',
              title: 'Purchase Orders',
              iconKey: 'fileText',
              itemsText: '1 file',
              modifiedText: 'Nov 12, 2024',
              sizeText: '56 MB',
            },
            {
              id: 'type-contract',
              title: 'Contracts',
              iconKey: 'fileText',
              itemsText: '1 file',
              modifiedText: 'Nov 10, 2024',
              sizeText: '120 MB',
            },
          ],
          files()
        )

      case 'type-invoice':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'by-type', label: 'By Document Type' },
            { id: 'type-invoice', label: 'Invoices' },
          ],
          [],
          files().filter((file) => file.type === 'Invoice')
        )

      case 'email-attachments':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'email-attachments', label: 'Email Attachments' },
          ],
          [
            {
              id: 'email-today',
              title: 'Today',
              iconKey: 'folder',
              itemsText: '4 files',
              modifiedText: 'Today',
              sizeText: '180 MB',
            },
            {
              id: 'email-last7',
              title: 'Last 7 Days',
              iconKey: 'folder',
              itemsText: '14 files',
              modifiedText: 'This week',
              sizeText: '500 MB',
            },
          ],
          files().filter((file) => file.source === 'Email')
        )

      case 'email-today':
      case 'email-last7':
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: 'ap', label: 'Accounts Payable' },
            { id: 'email-attachments', label: 'Email Attachments' },
            { id: folderId, label: folderId === 'email-today' ? 'Today' : 'Last 7 Days' },
          ],
          [],
          files().filter((file) => file.source === 'Email')
        )

      case 'ar':
        return folderResponse(
          [
            { id: 'ar', label: 'EZOFIS' },
            { id: 'ar', label: 'Accounts Receivable' },
          ],
          [
            {
              id: 'by-customer',
              title: 'By Customer',
              iconKey: 'users',
              itemsText: '12 customers',
              modifiedText: 'Nov 15, 2024',
              sizeText: '760 MB',
            },
          ],
          []
        )

      case 'recent':
        return folderResponse(
          [{ id: 'recent', label: 'Recent' }],
          [],
          files()
        )

      case 'favorites':
        return folderResponse(
          [{ id: 'favorites', label: 'Favorites' }],
          [],
          files().slice(0, 3)
        )

      case 'archived':
        return folderResponse(
          [{ id: 'archived', label: 'Archived' }],
          [],
          []
        )

      default:
        return folderResponse(
          [
            { id: 'ap', label: 'EZOFIS' },
            { id: folderId, label: folderId },
          ],
          [],
          files()
        )
    }
  },

  async getDocumentDetail(id: string): Promise<DocumentDetail> {
    await wait()

    return {
      documentId: id,
      fileName: 'INV-2024-0891.pdf',
      fileType: 'PDF',
      fileUrl: 'https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf',
      alert: {
        title: 'Pending L2 Approval — Assigned to Priya M.',
        subtitle: 'Awaiting approval since Nov 15, 2024 (2 days)',
        badge: 'L2',
      },
      infoCards: [
        {
          id: 'doc',
          title: 'Document Info',
          iconKey: 'fileText',
          rows: [
            { label: 'Invoice Number', value: 'INV-2024-0891' },
            { label: 'Document Type', value: 'Invoice' },
            { label: 'Invoice Date', value: '2024-11-15' },
            { label: 'Due Date', value: '2024-12-15' },
            { label: 'Amount', value: '₹245,000' },
            { label: 'Status', value: 'Pending' },
            { label: 'Approval Stage', value: 'L2' },
          ],
        },
        {
          id: 'supplier',
          title: 'Supplier Details',
          iconKey: 'building',
          rows: [
            { label: 'Supplier Name', value: 'Acme Corp' },
            { label: 'GSTIN', value: '22AAAAA0000A1Z5' },
            { label: 'PAN', value: 'AAAAA0000A' },
            { label: 'PO Reference', value: 'PO-4589' },
            { label: 'Payment Terms', value: 'Net 30' },
            { label: 'IFSC Code', value: 'HDFC0001234' },
          ],
        },
        {
          id: 'ai',
          title: 'AI Analysis',
          iconKey: 'bot',
          rows: [
            { label: 'OCR Confidence', value: '98%' },
            { label: 'AI Validation', value: 'Passed' },
            { label: 'Duplicate Check', value: 'Clean' },
            { label: 'Risk Level', value: 'Low Risk' },
          ],
        },
        {
          id: 'system',
          title: 'System Info',
          iconKey: 'shield',
          rows: [
            { label: 'Uploaded By', value: 'System (Email)' },
            { label: 'Upload Date', value: '2024-11-15' },
            { label: 'Department', value: 'Finance' },
            { label: 'Source Channel', value: 'Email' },
            { label: 'Document ID', value: 'DOC-000001' },
          ],
        },
      ],
      lineItems: [
        {
          Description: 'ERP Software License Q4',
          Qty: '1',
          'Unit Price': '₹245,000',
          GST: '₹44,100',
          Total: '₹245,000',
        },
        {
          Description: 'Grand Total',
          Qty: '',
          'Unit Price': '',
          GST: '',
          Total: '₹289,100',
        },
      ],
      tabs: {
        timeline: [
          {
            title: 'Document ingested via email',
            subtitle: 'System (Email) · 2024-11-15 09:14',
            iconKey: 'fileText',
          },
          {
            title: 'OCR extraction complete — 98% confidence',
            subtitle: 'AI Engine · 2024-11-15 09:15',
            iconKey: 'bot',
          },
          {
            title: 'Metadata validated, no duplicates found',
            subtitle: 'AI Engine · 2024-11-15 09:16',
            iconKey: 'check',
          },
          {
            title: 'L1 Approval granted',
            subtitle: 'Rahul K. · 2024-11-15 09:20',
            iconKey: 'check',
          },
          {
            title: 'Escalated to L2 Approval — Priya M.',
            subtitle: 'System · 2024-11-15 11:42',
            iconKey: 'clock',
          },
        ],
        comments: [
          {
            author: 'Rahul K.',
            date: '2024-11-15 09:20',
            message:
              'Invoice verified against PO-4589. All line items match. Approved L1.',
          },
          {
            author: 'Priya M.',
            date: '2024-11-15 10:05',
            message:
              'Checking with vendor on GST breakup. Will approve once confirmed.',
          },
        ],
        relatedDocs: [
          { name: 'PO-4589.pdf', type: 'Purchase Order', status: 'Active' },
          { name: 'GRN-2024-0721.pdf', type: 'GRN', status: 'Approved' },
          { name: 'CNT-2024-012.pdf', type: 'Contract', status: 'Active' },
        ],
      },
    }
  },

  async getMetadataSections(): Promise<MetadataSection[]> {
    await wait()

    return [
      {
        id: 'invoice',
        title: 'Invoice Information',
        fields: [
          {
            key: 'invoiceNo',
            label: 'Invoice Number',
            type: 'text',
            value: 'INV-2024-0891',
            required: true,
          },
          {
            key: 'docType',
            label: 'Document Type',
            type: 'select',
            value: 'Invoice',
            required: true,
            options: ['Invoice', 'Purchase Order', 'Contract'],
          },
          {
            key: 'invoiceDate',
            label: 'Invoice Date',
            type: 'date',
            value: '15-11-2024',
            required: true,
          },
          { key: 'dueDate', label: 'Due Date', type: 'date', value: '15-12-2024' },
          {
            key: 'amount',
            label: 'Amount',
            type: 'text',
            value: '245000',
            required: true,
          },
          {
            key: 'currency',
            label: 'Currency',
            type: 'select',
            value: 'INR',
            options: ['INR', 'USD', 'AED'],
          },
          { key: 'poNo', label: 'PO Number', type: 'text', value: 'PO-4589' },
          {
            key: 'terms',
            label: 'Payment Terms',
            type: 'select',
            value: 'Net 30',
            options: ['Net 15', 'Net 30', 'Net 45'],
          },
          {
            key: 'dept',
            label: 'Department',
            type: 'select',
            value: 'Finance',
            options: ['Finance', 'Operations', 'IT'],
          },
        ],
      },
      {
        id: 'supplier',
        title: 'Supplier / Vendor Information',
        fields: [
          {
            key: 'supplier',
            label: 'Supplier Name',
            type: 'text',
            value: 'Acme Corp',
            required: true,
          },
          { key: 'gstin', label: 'GSTIN', type: 'text', value: '22AAAAA0000A1Z5' },
          { key: 'pan', label: 'PAN', type: 'text', value: 'AAAAA0000A' },
          {
            key: 'bank',
            label: 'Bank Account',
            type: 'text',
            value: 'XXXX-XXXX-4521',
          },
          { key: 'ifsc', label: 'IFSC Code', type: 'text', value: 'HDFC0001234' },
        ],
      },
      {
        id: 'tags',
        title: 'Tags & Labels',
        fields: [
          {
            key: 'tags',
            label: 'Add tag...',
            type: 'text',
            value: 'urgent, high-value',
          },
        ],
      },
    ]
  },

  async getAiSummary(): Promise<AiSummaryData> {
    await wait()

    return {
      documentId: 'INV-2024-0891',
      engineTitle: 'EZOFIS AI Engine',
      engineSubtitle:
        'Analysed 4 related documents · Checked 486 supplier records · Validated against 5,240 invoices',
      confidence: 98,
      summary:
        'Software license invoice from Acme Corp for Q4 2024 ERP subscription — ₹2.45L pending L2 approval.',
      facts: [
        { label: 'Invoice Total', value: '₹2,45,000 + ₹44,100 GST = ₹2,89,100' },
        { label: 'Payment Due', value: 'December 15, 2024 (28 days remaining)' },
        { label: 'PO Match', value: 'PO-4589 — Full match, ₹0 variance' },
        { label: 'Supplier Risk', value: 'Trusted — 4 years, 145 prior invoices' },
        { label: 'GST Compliance', value: 'Valid GSTIN, B2B 18% applicable' },
        { label: 'Duplicate Status', value: 'No duplicate found — unique invoice number' },
      ],
      checks: [
        { label: 'GST Compliance', status: 'PASS', iconKey: 'check' },
        { label: 'Duplicate Check', status: 'PASS', iconKey: 'check' },
        { label: 'PO Matching', status: 'PASS', iconKey: 'check' },
        { label: 'Fraud Detection', status: 'PASS', iconKey: 'shield' },
      ],
      recommendations: [
        'Schedule payment before Dec 10 to avoid late fees.',
        'This supplier offers 2% discount for payment within 10 days.',
        'Cross-check ERP license count against IT asset register.',
      ],
      insight:
        'Acme Corp invoice volume has increased 28% this quarter. Consider negotiating volume discount.',
    }
  },

  async getShareData(): Promise<ShareData> {
    await wait()

    return {
      documentId: 'INV-2024-0891',
      invitePermissions: ['Can View', 'Can Edit'],
      sharedWith: [
        {
          initials: 'PM',
          name: 'Priya Mehta',
          email: 'priya.m@company.com',
          permission: 'Can View',
          date: '2024-11-15',
        },
        {
          initials: 'AS',
          name: 'Amit Shah',
          email: 'amit.s@company.com',
          permission: 'Can Edit',
          date: '2024-11-15',
        },
      ],
      link: 'https://ezofis.app/doc/INV-2024-0891?token=tk_abc123xyz',
      permissions: [
        { label: 'View', text: 'Read-only access', iconKey: 'eye' },
        { label: 'Edit', text: 'Can edit metadata', iconKey: 'edit' },
        // { label: 'Approve', text: 'Full approval rights', iconKey: 'shield' },
      ],
    }
  },

  async getWorkflowData(): Promise<WorkflowData> {
    await wait()

    return {
      documentId: 'INV-2024-0891',
      document: {
        name: 'INV-2024-0891.pdf',
        supplier: 'Acme Corp',
        amount: '₹2,45,000',
        date: 'Nov 15, 2024',
        status: 'Pending',
      },
      templates: [
        {
          id: 'ap2',
          title: '2-Level AP Approval',
          description: 'Standard invoice approval: L1 Manager → L2 Finance Head',
          levels: '2 levels',
          eta: '~4h',
          recommended: true,
        },
        {
          id: 'fast',
          title: 'Fast Track Approval',
          description: 'Single approver for invoices below ₹50K',
          levels: '1 levels',
          eta: '~1h',
        },
        {
          id: 'kyc',
          title: 'Vendor KYC Review',
          description: 'Compliance check for new suppliers',
          levels: '3 levels',
          eta: '~24h',
        },
        {
          id: 'dispute',
          title: 'Dispute Resolution',
          description: 'Escalation workflow for flagged/disputed invoices',
          levels: '4 levels',
          eta: '~48h',
        },
      ],
      approvers: [
        { id: 'rahul', name: 'Rahul Kumar — Finance Manager' },
        { id: 'priya', name: 'Priya Mehta — Finance Head' },
      ],
      priorities: ['Low', 'Medium', 'High'],
    }
  },
}
