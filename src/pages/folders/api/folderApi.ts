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
const wait = () => new Promise((r) => setTimeout(r, 100))
const files = (): FileItem[] => [
  {
    amount: '₹245K',
    date: '2024-11-15',
    fileUrl: 'https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf',
    id: 'INV-2024-0891',
    invoiceNo: 'INV-2024-0891',
    name: 'INV-2024-0891.pdf',
    ocr: 98,
    poNo: 'PO-4589',
    risk: 'low',
    source: 'Email',
    status: 'Pending Approval',
    supplier: 'Acme Corp',
    type: 'Invoice',
  },
  {
    amount: '₹189K',
    date: '2024-11-14',
    id: 'INV-2024-0892',
    invoiceNo: 'INV-2024-0892',
    name: 'INV-2024-0892.pdf',
    ocr: 96,
    poNo: 'PO-4590',
    risk: 'low',
    source: 'Upload',
    status: 'Approved',
    supplier: 'TechPro Ltd',
    type: 'Invoice',
  },
  {
    amount: '₹420K',
    date: '2024-11-13',
    id: 'INV-2024-0893',
    invoiceNo: 'INV-2024-0893',
    name: 'INV-2024-0893.pdf',
    ocr: 72,
    poNo: '-',
    risk: 'high',
    source: 'Email',
    status: 'Flagged',
    supplier: 'Acme Corp',
    type: 'Invoice',
  },
  {
    amount: '₹156K',
    date: '2024-11-12',
    id: 'PO-4591',
    invoiceNo: '-',
    name: 'PO-4591.pdf',
    ocr: 99,
    poNo: 'PO-4591',
    risk: 'low',
    source: 'ERP',
    status: 'Active',
    supplier: 'GlobalSup Inc',
    type: 'Purchase Order',
  },
  {
    amount: '₹87K',
    date: '2024-11-11',
    id: 'INV-2024-0894',
    invoiceNo: 'INV-2024-0894',
    name: 'INV-2024-0894.pdf',
    ocr: 91,
    poNo: 'PO-4588',
    risk: 'medium',
    source: 'Email',
    status: 'Pending Approval',
    supplier: 'FastShip Co',
    type: 'Invoice',
  },
  {
    amount: '₹1200K',
    date: '2024-11-10',
    id: 'CNT-2024-045',
    invoiceNo: '-',
    name: 'CNT-2024-045.pdf',
    ocr: 97,
    poNo: '-',
    risk: 'low',
    source: 'Upload',
    status: 'Active',
    supplier: 'MetalWorks',
    type: 'Contract',
  },
  {
    amount: '₹63.5K',
    date: '2024-11-09',
    id: 'INV-2024-0895',
    invoiceNo: 'INV-2024-0895',
    name: 'INV-2024-0895.pdf',
    ocr: 65,
    poNo: 'PO-4585',
    risk: 'high',
    source: 'Scanner',
    status: 'Rejected',
    supplier: 'PrimeParts',
    type: 'Invoice',
  },
  {
    amount: '-',
    date: '2024-10-31',
    id: 'STM-2024-Q3',
    invoiceNo: '-',
    name: 'STM-2024-Q3.pdf',
    ocr: 95,
    poNo: '-',
    risk: 'low',
    source: 'Email',
    status: 'Processed',
    supplier: 'Acme Corp',
    type: 'Statement',
  },
]
export const folderApi = {
  async getAiSummary(): Promise<AiSummaryData> {
    await wait()
    return {
      checks: [
        { iconKey: 'check', label: 'GST Compliance', status: 'PASS' },
        { iconKey: 'check', label: 'Duplicate Check', status: 'PASS' },
        { iconKey: 'check', label: 'PO Matching', status: 'PASS' },
        { iconKey: 'shield', label: 'Fraud Detection', status: 'PASS' },
      ],
      confidence: 98,
      documentId: 'INV-2024-0891',
      engineSubtitle:
        'Analysed 4 related documents · Checked 486 supplier records · Validated against 5,240 invoices',
      engineTitle: 'EZOFIS AI Engine',
      facts: [
        {
          label: 'Invoice Total',
          value: '₹2,45,000 + ₹44,100 GST = ₹2,89,100',
        },
        {
          label: 'Payment Due',
          value: 'December 15, 2024 (28 days remaining)',
        },
        { label: 'PO Match', value: 'PO-4589 — Full match, ₹0 variance' },
        {
          label: 'Supplier Risk',
          value: 'Trusted — 4 years, 145 prior invoices',
        },
        { label: 'GST Compliance', value: 'Valid GSTIN, B2B 18% applicable' },
        {
          label: 'Duplicate Status',
          value: 'No duplicate found — unique invoice number',
        },
      ],
      insight:
        'Acme Corp invoice volume has increased 28% this quarter. Consider negotiating volume discount.',
      recommendations: [
        'Schedule payment before Dec 10 to avoid late fees.',
        'This supplier offers 2% discount for payment within 10 days.',
        'Cross-check ERP license count against IT asset register.',
      ],
      summary:
        'Software license invoice from Acme Corp for Q4 2024 ERP subscription — ₹2.45L pending L2 approval.',
    }
  },
  async getDocumentDetail(id: string): Promise<DocumentDetail> {
    await wait()
    return {
      alert: {
        badge: 'L2',
        subtitle: 'Awaiting approval since Nov 15, 2024 (2 days)',
        title: 'Pending L2 Approval — Assigned to Priya M.',
      },
      documentId: id,
      fileName: 'INV-2024-0891.pdf',
      fileType: 'PDF',
      fileUrl: 'https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf',
      infoCards: [
        {
          iconKey: 'fileText',
          id: 'doc',
          rows: [
            { label: 'Invoice Number', value: 'INV-2024-0891' },
            { label: 'Document Type', value: 'Invoice' },
            { label: 'Invoice Date', value: '2024-11-15' },
            { label: 'Due Date', value: '2024-12-15' },
            { label: 'Amount', value: '₹245,000' },
            { label: 'Status', value: 'Pending Approval' },
            { label: 'Approval Stage', value: 'L2' },
          ],
          title: 'Document Info',
        },
        {
          iconKey: 'building',
          id: 'supplier',
          rows: [
            { label: 'Supplier Name', value: 'Acme Corp' },
            { label: 'GSTIN', value: '22AAAAA0000A1Z5' },
            { label: 'PAN', value: 'AAAAA0000A' },
            { label: 'PO Reference', value: 'PO-4589' },
            { label: 'Payment Terms', value: 'Net 30' },
            { label: 'IFSC Code', value: 'HDFC0001234' },
          ],
          title: 'Supplier Details',
        },
        {
          iconKey: 'bot',
          id: 'ai',
          rows: [
            { label: 'OCR Confidence', value: '98%' },
            { label: 'AI Validation', value: 'Passed' },
            { label: 'Duplicate Check', value: 'Clean' },
            { label: 'Risk Level', value: 'Low Risk' },
          ],
          title: 'AI Analysis',
        },
        {
          iconKey: 'shield',
          id: 'system',
          rows: [
            { label: 'Uploaded By', value: 'System (Email)' },
            { label: 'Upload Date', value: '2024-11-15' },
            { label: 'Department', value: 'Finance' },
            { label: 'Source Channel', value: 'Email' },
            { label: 'Document ID', value: 'DOC-000001' },
          ],
          title: 'System Info',
        },
      ],
      lineItems: [
        {
          'Description': 'ERP Software License Q4',
          'GST': '₹44,100',
          'Qty': '1',
          'Total': '₹245,000',
          'Unit Price': '₹245,000',
        },
        {
          'Description': 'Grand Total',
          'GST': '',
          'Qty': '',
          'Total': '₹289,100',
          'Unit Price': '',
        },
      ],
      tabs: {
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
          { name: 'PO-4589.pdf', status: 'Active', type: 'Purchase Order' },
          { name: 'GRN-2024-0721.pdf', status: 'Approved', type: 'GRN' },
          { name: 'CNT-2024-012.pdf', status: 'Active', type: 'Contract' },
        ],
        timeline: [
          {
            iconKey: 'fileText',
            subtitle: 'System (Email) · 2024-11-15 09:14',
            title: 'Document ingested via email',
          },
          {
            iconKey: 'bot',
            subtitle: 'AI Engine · 2024-11-15 09:15',
            title: 'OCR extraction complete — 98% confidence',
          },
          {
            iconKey: 'check',
            subtitle: 'AI Engine · 2024-11-15 09:16',
            title: 'Metadata validated, no duplicates found',
          },
          {
            iconKey: 'check',
            subtitle: 'Rahul K. · 2024-11-15 09:20',
            title: 'L1 Approval granted',
          },
          {
            iconKey: 'clock',
            subtitle: 'System · 2024-11-15 11:42',
            title: 'Escalated to L2 Approval — Priya M.',
          },
        ],
      },
    }
  },
  async getFolderContent(folderId: string): Promise<{
    breadcrumbs: string[]
    files: FileItem[]
    folders: FolderItem[]
  }> {
    await wait()
    if (folderId === 'acme') {
      return {
        breadcrumbs: ['EZOFIS', 'Accounts Payable', 'By Supplier', 'Acme Corp'],
        files: [],
        folders: [
          {
            iconKey: 'folder',
            id: 'invoices',
            itemsText: '8 files',
            modifiedText: 'Nov 15, 2024',
            sizeText: '245 MB',
            title: 'Invoices',
          },
          {
            iconKey: 'folder',
            id: 'purchase-orders',
            itemsText: '4 files',
            modifiedText: 'Nov 10, 2024',
            sizeText: '84 MB',
            title: 'Purchase Orders',
          },
          {
            iconKey: 'folder',
            id: 'contracts',
            itemsText: '2 files',
            modifiedText: 'Oct 01, 2024',
            sizeText: '42 MB',
            title: 'Contracts',
          },
        ],
      }
    }
    if (folderId === 'by-supplier') {
      return {
        breadcrumbs: ['EZOFIS', 'Accounts Payable', 'By Supplier'],
        files: files(),
        folders: [
          {
            iconKey: 'building',
            id: 'acme',
            itemsText: '1,420 items',
            modifiedText: 'Nov 15, 2024',
            sizeText: '1.1 GB',
            title: 'Acme Corp',
          },
          {
            iconKey: 'building',
            id: 'techpro',
            itemsText: '1,180 items',
            modifiedText: 'Nov 14, 2024',
            sizeText: '980 MB',
            title: 'TechPro Ltd',
          },
          {
            iconKey: 'building',
            id: 'globalsup',
            itemsText: '980 items',
            modifiedText: 'Nov 13, 2024',
            sizeText: '820 MB',
            title: 'GlobalSup Inc',
          },
          {
            iconKey: 'building',
            id: 'indialogistics',
            itemsText: '860 items',
            modifiedText: 'Nov 10, 2024',
            sizeText: '720 MB',
            title: 'IndiaLogistics',
          },
          {
            iconKey: 'building',
            id: 'fastship',
            itemsText: '640 items',
            modifiedText: 'Nov 8, 2024',
            sizeText: '510 MB',
            title: 'FastShip Co',
          },
          {
            iconKey: 'building',
            id: 'metalworks',
            itemsText: '340 items',
            modifiedText: 'Nov 5, 2024',
            sizeText: '290 MB',
            title: 'MetalWorks',
          },
          {
            iconKey: 'building',
            id: 'primeparts',
            itemsText: '280 items',
            modifiedText: 'Oct 30, 2024',
            sizeText: '240 MB',
            title: 'PrimeParts',
          },
        ],
      }
    }
    return {
      breadcrumbs: [
        'EZOFIS',
        'Accounts Payable',
        'By Supplier',
        'Acme Corp',
        'Invoices',
      ],
      files: files(),
      folders: [],
    }
  },
  async getMetadataSections(): Promise<MetadataSection[]> {
    await wait()
    return [
      {
        fields: [
          {
            key: 'invoiceNo',
            label: 'Invoice Number',
            required: true,
            type: 'text',
            value: 'INV-2024-0891',
          },
          {
            key: 'docType',
            label: 'Document Type',
            options: ['Invoice', 'Purchase Order', 'Contract'],
            required: true,
            type: 'select',
            value: 'Invoice',
          },
          {
            key: 'invoiceDate',
            label: 'Invoice Date',
            required: true,
            type: 'date',
            value: '15-11-2024',
          },
          {
            key: 'dueDate',
            label: 'Due Date',
            type: 'date',
            value: '15-12-2024',
          },
          {
            key: 'amount',
            label: 'Amount',
            required: true,
            type: 'text',
            value: '245000',
          },
          {
            key: 'currency',
            label: 'Currency',
            options: ['INR', 'USD', 'AED'],
            type: 'select',
            value: 'INR',
          },
          { key: 'poNo', label: 'PO Number', type: 'text', value: 'PO-4589' },
          {
            key: 'terms',
            label: 'Payment Terms',
            options: ['Net 15', 'Net 30', 'Net 45'],
            type: 'select',
            value: 'Net 30',
          },
          {
            key: 'dept',
            label: 'Department',
            options: ['Finance', 'Operations', 'IT'],
            type: 'select',
            value: 'Finance',
          },
        ],
        id: 'invoice',
        title: 'Invoice Information',
      },
      {
        fields: [
          {
            key: 'supplier',
            label: 'Supplier Name',
            required: true,
            type: 'text',
            value: 'Acme Corp',
          },
          {
            key: 'gstin',
            label: 'GSTIN',
            type: 'text',
            value: '22AAAAA0000A1Z5',
          },
          { key: 'pan', label: 'PAN', type: 'text', value: 'AAAAA0000A' },
          {
            key: 'bank',
            label: 'Bank Account',
            type: 'text',
            value: 'XXXX-XXXX-4521',
          },
          {
            key: 'ifsc',
            label: 'IFSC Code',
            type: 'text',
            value: 'HDFC0001234',
          },
        ],
        id: 'supplier',
        title: 'Supplier / Vendor Information',
      },
      {
        fields: [
          {
            key: 'tags',
            label: 'Add tag...',
            type: 'text',
            value: 'urgent, high-value',
          },
        ],
        id: 'tags',
        title: 'Tags & Labels',
      },
    ]
  },
  async getShareData(): Promise<ShareData> {
    await wait()
    return {
      documentId: 'INV-2024-0891',
      invitePermissions: ['Can View', 'Can Edit'],
      link: 'https://ezofis.app/doc/INV-2024-0891?token=tk_abc123xyz',
      permissions: [
        { iconKey: 'eye', label: 'View', text: 'Read-only access' },
        { iconKey: 'edit', label: 'Edit', text: 'Can edit metadata' },
        { iconKey: 'shield', label: 'Approve', text: 'Full approval rights' },
      ],
      sharedWith: [
        {
          date: '2024-11-15',
          email: 'priya.m@company.com',
          initials: 'PM',
          name: 'Priya Mehta',
          permission: 'Can View',
        },
        {
          date: '2024-11-15',
          email: 'amit.s@company.com',
          initials: 'AS',
          name: 'Amit Shah',
          permission: 'Can Edit',
        },
      ],
    }
  },
  async getTree(): Promise<TreeNode[]> {
    await wait()
    return [
      {
        children: [
          {
            children: [
              {
                children: [
                  { iconKey: 'folder', id: 'invoices', title: 'Invoices' },
                  {
                    iconKey: 'folder',
                    id: 'purchase-orders',
                    title: 'Purchase Orders',
                  },
                  { iconKey: 'folder', id: 'contracts', title: 'Contracts' },
                  { iconKey: 'folder', id: 'kyc', title: 'KYC Documents' },
                  { iconKey: 'folder', id: 'statements', title: 'Statements' },
                ],
                iconKey: 'building',
                id: 'acme',
                title: 'Acme Corp',
              },
              { iconKey: 'building', id: 'techpro', title: 'TechPro Ltd' },
              { iconKey: 'building', id: 'globalsup', title: 'GlobalSup Inc' },
              {
                iconKey: 'building',
                id: 'indialogistics',
                title: 'IndiaLogistics',
              },
              { iconKey: 'building', id: 'fastship', title: 'FastShip Co' },
              { iconKey: 'building', id: 'metalworks', title: 'MetalWorks' },
              { iconKey: 'building', id: 'primeparts', title: 'PrimeParts' },
            ],
            iconKey: 'folder',
            id: 'by-supplier',
            title: 'By Supplier',
          },
          {
            children: [
              { iconKey: 'fileText', id: 'type-invoice', title: 'Invoices' },
              { iconKey: 'fileText', id: 'type-po', title: 'Purchase Orders' },
              { iconKey: 'fileText', id: 'type-contract', title: 'Contracts' },
            ],
            iconKey: 'fileStack',
            id: 'by-type',
            title: 'By Document Type',
          },
          {
            children: [
              { iconKey: 'folder', id: 'email-today', title: 'Today' },
              { iconKey: 'folder', id: 'email-last7', title: 'Last 7 Days' },
            ],
            iconKey: 'mail',
            id: 'email-attachments',
            title: 'Email Attachments',
          },
        ],
        iconKey: 'folder',
        id: 'ap',
        title: 'Accounts Payable',
      },
      { iconKey: 'clock', id: 'recent', title: 'Recent' },
      { iconKey: 'sparkles', id: 'favorites', title: 'Favorites' },
      { iconKey: 'archive', id: 'archived', title: 'Archived' },
    ]
  },
  async getWorkflowData(): Promise<WorkflowData> {
    await wait()
    return {
      approvers: [
        { id: 'rahul', name: 'Rahul Kumar — Finance Manager' },
        { id: 'priya', name: 'Priya Mehta — Finance Head' },
      ],
      document: {
        amount: '₹2,45,000',
        date: 'Nov 15, 2024',
        name: 'INV-2024-0891.pdf',
        status: 'Pending Approval',
        supplier: 'Acme Corp',
      },
      documentId: 'INV-2024-0891',
      priorities: ['Low', 'Medium', 'High'],
      templates: [
        {
          description:
            'Standard invoice approval: L1 Manager → L2 Finance Head',
          eta: '~4h',
          id: 'ap2',
          levels: '2 levels',
          recommended: true,
          title: '2-Level AP Approval',
        },
        {
          description: 'Single approver for invoices below ₹50K',
          eta: '~1h',
          id: 'fast',
          levels: '1 levels',
          title: 'Fast Track Approval',
        },
        {
          description: 'Compliance check for new suppliers',
          eta: '~24h',
          id: 'kyc',
          levels: '3 levels',
          title: 'Vendor KYC Review',
        },
        {
          description: 'Escalation workflow for flagged/disputed invoices',
          eta: '~48h',
          id: 'dispute',
          levels: '4 levels',
          title: 'Dispute Resolution',
        },
      ],
    }
  },
}
