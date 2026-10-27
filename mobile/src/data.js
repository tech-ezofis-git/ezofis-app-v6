// Sample data for the clickable prototype. In production every list below comes from the EZOFIS V6 API.

export const WORKFLOWS = [
  'Accounts Payable',
  'Document Approval',
  'Expense Reimbursement',
  'Operation and Planning',
  'Quote Request Process',
];

export const USER = { name: 'Arun E.', short: 'ARUN E.', initial: 'A', email: 'a****n@ezofis.com', role: 'Approver' };

// `actions` mimics what the workflow API returns for the current stage; count and labels vary per workflow.
export const REQUESTS = [
  {
    id: 'INV-2026-3101', workflow: 'Accounts Payable', stage: 'Approval', title: 'Nexus Industrial Solutions Ltd · PO-31001',
    amount: 'CAD 1,582.00', due: 'Due today', status: 'Matched', tone: 'ok', color: 'p',
    steps: ['Invoice Capture', 'Approval', 'Payment'], current: 1, waiting: '1h',
    actions: ['Reject', 'Approve'],
    fields: [
      ['Supplier', 'Nexus Industrial Solutions Ltd'], ['Invoice no.', 'INV-2026-3101'], ['PO number', 'PO-31001'],
      ['Invoice amount', 'CAD 1,582.00'], ['PO value', 'CAD 1,582.00'], ['AI match confidence', '100%'], ['Due date', 'Immediate'],
    ],
    files: [{ name: 'INV-2026-3101.pdf', meta: 'Invoice Capture · 214 KB · 1h ago', ext: 'PDF' }],
    comments: [{ who: 'AI Agent', initials: 'AI', when: '1h ago', text: 'PO vendor totals and line amounts match. Ready to approve for posting.' }],
    history: [
      { title: 'Moved to Approval', meta: 'Workflow · 1h ago', dot: '#8300E6' },
      { title: 'PO matched at 100%', meta: 'AI Agent · 1h ago', dot: '#0A7C89' },
      { title: 'Invoice captured', meta: 'Email intake · 1h ago', dot: '#0E8A5F' },
    ],
  },
  {
    id: 'EXP-REQ-75', workflow: 'Expense Reimbursement', stage: 'Claim Approval', title: 'Client site visit · local travel',
    amount: '$ 42.50', due: 'Due tomorrow', status: 'Pending', tone: 'neu', color: 'p',
    steps: ['Receipt Upload', 'Approver', 'Completed'], current: 1, waiting: '2h',
    actions: ['Force Close', 'Reject', 'Approve'],
    fields: [['Budget', '$ 0.00'], ['Employee', 'Arun E.'], ['Claim type', 'Local travel'], ['Expense date', '24-Oct-2026'], ['Amount', '$ 42.50'], ['Purpose', 'Client site visit']],
    files: [{ name: 'Receipt_taxi_oct.jpg', meta: 'Receipt Upload · 412 KB · 2h ago', ext: 'JPG' }],
    comments: [{ who: 'Requester', initials: 'PR', when: '2h ago', text: 'Taxi to the client site, receipt attached.' }],
    history: [
      { title: 'Moved to Approver', meta: 'Workflow · 2h ago', dot: '#8300E6' },
      { title: 'Receipt Upload completed', meta: 'Requester · 2h ago', dot: '#0E8A5F' },
      { title: 'Request EXP-REQ-75 raised', meta: 'Requester · 2h ago', dot: '#0A7C89' },
    ],
  },
  {
    id: 'DOC-0218', workflow: 'Document Approval', stage: 'Legal Review', title: 'Vendor contract renewal for review',
    amount: '', due: '2 days late', status: 'Overdue', tone: 'bad', color: 't',
    steps: ['Draft', 'Legal Review', 'Sign-off', 'Archive'], current: 1, waiting: '2d',
    actions: ['Request Info', 'Send Back', 'Reject', 'Approve'],
    fields: [['Document', 'Vendor contract renewal'], ['Vendor', 'Nexus Industrial Solutions Ltd'], ['Contract value', 'CAD 48,000.00'], ['Term', '12 months'], ['Owner', 'Procurement']],
    files: [{ name: 'Contract_renewal_v3.pdf', meta: 'Draft · 1.2 MB · 3d ago', ext: 'PDF' }, { name: 'Redlines.docx', meta: 'Draft · 86 KB · 3d ago', ext: 'DOC' }],
    comments: [],
    history: [{ title: 'Moved to Legal Review', meta: 'Workflow · 3d ago', dot: '#8300E6' }, { title: 'Draft uploaded', meta: 'Procurement · 3d ago', dot: '#0E8A5F' }],
  },
  {
    id: 'QRQ-0077', workflow: 'Quote Request Process', stage: 'Vendor Quote', title: 'Quote for safety equipment',
    amount: '$ 2,310.00', due: 'In 3 days', status: 'Info needed', tone: 'warn', color: 't',
    steps: ['Request', 'Vendor Quote', 'Review'], current: 1, waiting: '5h',
    actions: ['Submit Quote'],
    fields: [['Item', 'Safety gloves & helmets'], ['Quantity', '120 sets'], ['Budget', '$ 2,500.00'], ['Quoted', '$ 2,310.00'], ['Needed by', '30-Oct-2026']],
    files: [], comments: [],
    history: [{ title: 'Quote requested', meta: 'Operations · 5h ago', dot: '#0A7C89' }],
  },
];

export const ACTIONED = [
  { id: 'INV-2026-3088', workflow: 'Accounts Payable', title: 'You approved · 25-Oct, 4:12 PM', amount: '$4,120.00', meta: 'Moved to Payment', status: 'Approved', tone: 'ok', color: 'p' },
  { id: 'EXP-1037', workflow: 'Expense Reimbursement', title: 'You rejected · 24-Oct, 11:02 AM', amount: '$85.50', meta: 'Missing receipt', status: 'Rejected', tone: 'bad', color: 'p' },
  { id: 'DOC-0211', workflow: 'Document Approval', title: 'You sent back · 22-Oct, 9:40 AM', amount: '', meta: 'With requester', status: 'Returned', tone: 'warn', color: 't' },
];

export const FILES = [
  { id: 'f1', name: 'INV-2026-3101.pdf', ext: 'PDF', type: 'Invoice', supplier: 'Nexus Industrial Solutions Ltd', po: 'PO-31001', amount: 'CAD 1,582.00', status: 'Indexed', when: '1h ago', isNew: false,
    fields: [['Supplier', 'Nexus Industrial Solutions Ltd', 99], ['Invoice number', 'INV-2026-3101', 100], ['PO number', 'PO-31001', 100], ['Amount', '1,582.00 | CAD', 100], ['Buyer', 'Procurement', 96]] },
];

// Files that the simulated scanner / picker produces, in order.
export const UPLOAD_POOL = [
  { name: 'Nexus_Invoice_Oct.pdf', ext: 'PDF', type: 'Invoice', conf: 98, supplier: 'Nexus Industrial Solutions Ltd', po: 'PO-31001', amount: 'CAD 1,582.00', missingBuyer: true },
  { name: 'Scan_26-Oct_1142.jpg', ext: 'JPG', type: 'Invoice', conf: 94, supplier: 'Delta Office Supplies', po: 'PO-31007', amount: 'CAD 318.40', missingBuyer: false },
  { name: 'Delivery_note_4471.pdf', ext: 'PDF', type: 'Delivery note', conf: 61, supplier: 'Nexus Industrial Solutions Ltd', po: 'PO-31001', amount: '', missingBuyer: true, low: true },
  { name: 'Receipt_hotel_oct.jpg', ext: 'JPG', type: 'Receipt', conf: 91, supplier: 'Harbour Hotel', po: '', amount: 'CAD 212.00', missingBuyer: false },
];

export const NOTIFS = [
  { id: 'n1', type: 'wf', title: 'New request assigned', body: 'INV-2026-3101 · Accounts Payable · Matched to PO-31001', time: '1 h', tone: 'p', unread: true, to: '/app/inbox/INV-2026-3101' },
  { id: 'n2', type: 'wf', title: 'Comment on EXP-REQ-75', body: 'Requester: Taxi to the client site, receipt attached.', time: '2 h', tone: 'p', unread: true, to: '/app/inbox/EXP-REQ-75' },
  { id: 'n3', type: 'wf', title: 'DOC-0218 is overdue', body: 'Document Approval · due 2 days ago', time: 'Yesterday', tone: 'r', unread: false, to: '/app/inbox/DOC-0218' },
];

// Folder definitions: each folder has its own metadata filters and "browse by" groups.
// Files for Accounts Payable come from the live store (uploads land there); the others are samples.
const mk = (id, name, ext, type, attrs, amount, when) => ({ id, name, ext, type, attrs, amount, when, status: 'Indexed', isNew: false,
  fields: [['Document type', type, 99], ...Object.entries(attrs).map(([k, v]) => [k.replace(/^./, (c) => c.toUpperCase()).replace(/([A-Z])/g, ' $1').trim(), v, 98]), ...(amount ? [['Amount', amount, 100]] : [])] });

export const FOLDER_DEFS = [
  { name: 'Accounts Payable', tone: 'p', live: true,
    filters: [{ key: 'type', label: 'Document type' }, { key: 'supplier', label: 'Supplier' }, { key: 'po', label: 'PO number' }],
    groups: [{ key: 'supplier', label: 'By Supplier', icon: 'building' }, { key: 'type', label: 'By Document Type', icon: 'file' }, { key: 'po', label: 'By PO Number', icon: 'hash' }] },
  { name: 'Expense Reimbursement', tone: 't',
    filters: [{ key: 'claimType', label: 'Claim type' }, { key: 'employee', label: 'Employee' }, { key: 'month', label: 'Expense month' }],
    groups: [{ key: 'employee', label: 'By Employee', icon: 'user' }, { key: 'claimType', label: 'By Claim type', icon: 'doc' }, { key: 'month', label: 'By Month', icon: 'clock' }],
    files: [
      mk('e1', 'Receipt_taxi_oct.jpg', 'JPG', 'Receipt', { claimType: 'Travel', employee: 'Arun E.', month: 'Oct 2026' }, '$ 42.50', '2h ago'),
      mk('e2', 'Flight_BLR_YYZ.pdf', 'PDF', 'Ticket', { claimType: 'Travel', employee: 'Priya R.', month: 'Oct 2026' }, '$ 1,240.00', 'yesterday'),
      mk('e3', 'Receipt_hotel_oct.jpg', 'JPG', 'Receipt', { claimType: 'Lodging', employee: 'Arun E.', month: 'Oct 2026' }, '$ 212.00', '3d ago'),
      mk('e4', 'Team_lunch_sep.jpg', 'JPG', 'Receipt', { claimType: 'Meals', employee: 'Karthik S.', month: 'Sep 2026' }, '$ 86.40', '4w ago'),
    ] },
  { name: 'Document Approval', tone: 'p',
    filters: [{ key: 'docType', label: 'Document type' }, { key: 'vendor', label: 'Vendor' }, { key: 'owner', label: 'Owner' }],
    groups: [{ key: 'vendor', label: 'By Vendor', icon: 'building' }, { key: 'owner', label: 'By Owner', icon: 'user' }, { key: 'docType', label: 'By Document type', icon: 'file' }],
    files: [
      mk('d1', 'Contract_renewal_v3.pdf', 'PDF', 'Contract', { docType: 'Contract', vendor: 'Nexus Industrial Solutions Ltd', owner: 'Procurement' }, '', '3d ago'),
      mk('d2', 'Redlines.docx', 'DOC', 'Redline', { docType: 'Redline', vendor: 'Nexus Industrial Solutions Ltd', owner: 'Legal' }, '', '3d ago'),
      mk('d3', 'NDA_Delta_Office.pdf', 'PDF', 'NDA', { docType: 'NDA', vendor: 'Delta Office Supplies', owner: 'Legal' }, '', '2w ago'),
    ] },
  { name: 'Quote Request Process', tone: 't',
    filters: [{ key: 'vendor', label: 'Vendor' }, { key: 'category', label: 'Item category' }],
    groups: [{ key: 'vendor', label: 'By Vendor', icon: 'building' }, { key: 'category', label: 'By Category', icon: 'grid' }],
    files: [
      mk('q1', 'Quote_safety_gear.pdf', 'PDF', 'Quote', { vendor: 'Apex Safety Gear', category: 'Safety equipment' }, '$ 2,310.00', '5h ago'),
      mk('q2', 'Quote_safety_gear_alt.pdf', 'PDF', 'Quote', { vendor: 'Bayview Electricals', category: 'Safety equipment' }, '$ 2,480.00', '5h ago'),
      mk('q3', 'Quote_printer_toner.pdf', 'PDF', 'Quote', { vendor: 'Delta Office Supplies', category: 'Office supplies' }, '$ 318.40', '1w ago'),
    ] },
  { name: 'Operation and Planning', tone: 'p',
    filters: [{ key: 'department', label: 'Department' }, { key: 'quarter', label: 'Quarter' }],
    groups: [{ key: 'department', label: 'By Department', icon: 'building' }, { key: 'quarter', label: 'By Quarter', icon: 'clock' }],
    files: [
      mk('o1', 'Q4_capacity_plan.xlsx', 'XLS', 'Plan', { department: 'Operations', quarter: 'Q4 2026' }, '', '1w ago'),
      mk('o2', 'Warehouse_layout_v2.pdf', 'PDF', 'Drawing', { department: 'Logistics', quarter: 'Q4 2026' }, '', '2w ago'),
    ] },
];
export const SAMPLE_FOLDER_FILES = FOLDER_DEFS.flatMap((f) => f.files || []);
export const fileValue = (f, key) => (f[key] != null && f[key] !== '' ? f[key] : (f.attrs && f.attrs[key]) || '—');
