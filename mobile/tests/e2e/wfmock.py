# Mock of the EZOFIS Workflow API, shaped on the live responses captured 26 Oct 2026.
import json, datetime
import expform as EX
USE_REAL = False
now = datetime.datetime.utcnow()
iso = lambda h: (now - datetime.timedelta(hours=h)).isoformat() + 'Z'
EXP, AP = '71615497-4d40-4f6f-8b41-344eea0a71da', '452859c2-9bbe-4e17-acd2-f11524a0650e'
F = dict(email='59578287', paid='3a191cfe', pos='885b0bf8', total='32d08658', desc='bbce89bf', table='cae5498c', merch='6c5178f6', bill='7b09f966', file='f6f34059', div='771cfb6b')
def exp_row(i, ref, h, amt, merchant):
    return {'id': 180+i, 'workflowId': EXP, 'name': 'Expense Reimbursement', 'workflowInstanceId': f'inst-exp-{i}', 'referenceNumber': ref,
      'createdAtUtc': iso(h), 'startedAtUtc': iso(h), 'completedAtUtc': None, 'transactionId': f'tx-{i}', 'activityId': 's2tjj', 'stageType': 'INTERNAL_ACTOR', 'stage': 'Approver',
      'transactionCreatedAt': iso(h), 'transactionCreatedByEmail': 'student.lawyer@example.com', 'repositoryId': 'repo-exp', 'formId': 'form-exp', 'formEntryId': 'fe',
      'formData': {F['email']: 'student.lawyer@example.com', F['paid']: 'CIBC Visa Card', F['pos']: 'Associate', F['total']: amt, F['desc']: '',
                   F['table']: [{F['file']: {'filename': 'receipt.pdf', 'itemid': 'x'}, F['bill']: '353806', F['merch']: merchant}]},
      'commentsCount': None, 'attachmentCount': None, 'agentResponse': '', 'repositoryItem': {'fileName': 'receipt.pdf', 'fields': {}}, 'action': 1}
AGENT = json.dumps({'decision': 'Duplicate', 'score': 77.5, 'ai_insight': 'Duplicate invoice and not matched — do not post until cleared', 'reason': 'Duplicate of INV-2026-3005.',
  'debug': {'Side-by-side Line Item matching': [
     {'Description': {'Invoice Value': 'Motor Control Starter', 'PO Value': 'Motor Control Starter', 'Score': 100.0}, 'Quantity': {'Invoice Value': '2', 'PO Value': '3', 'Score': 0.0}, 'Price': {'Invoice Value': 210.0, 'PO Value': 210.0, 'Score': 100.0}, 'Amount': {'Invoice Value': '420', 'PO Value': '630', 'Score': 0.0}, 'Line Score': 50.0},
     {'Description': {'Invoice Value': 'Industrial Fuse Kit', 'PO Value': 'Industrial Fuse Kit', 'Score': 100.0}, 'Quantity': {'Invoice Value': '5', 'PO Value': '5', 'Score': 100.0}, 'Price': {'Invoice Value': 42.0, 'PO Value': 42.0, 'Score': 100.0}, 'Amount': {'Invoice Value': '210', 'PO Value': '210', 'Score': 100.0}, 'Line Score': 100.0}]},
  'Extracted Invoice JSON': {'Line Item': [{'line_no': 1, 'description': 'Motor Control Starter', 'quantity': '2', 'rate': '210', 'line_amount': '420'}]}})
AGENT2 = json.dumps({'decision': 'Matched', 'Extracted Invoice JSON': {'Line Item': [{'line_no': 1, 'description': 'Cable tray', 'quantity': '4', 'rate': '25', 'line_amount': '100'}, {'line_no': 2, 'description': 'Bolts', 'quantity': '100', 'rate': '0.5', 'line_amount': '50'}]}})
def ap_row(i, ref, h):
    return {'id': 19+i, 'workflowId': AP, 'name': 'Accounts Payable', 'workflowInstanceId': f'inst-ap-{i}', 'referenceNumber': ref, 'createdAtUtc': iso(h), 'completedAtUtc': None,
      'transactionId': f'txa-{i}', 'activityId': 'DR97', 'stageType': 'AP_AGENT', 'stage': 'AP AGENT 1', 'transactionCreatedAt': iso(h), 'transactionCreatedByEmail': 'admin@example.com',
      'repositoryId': 'repo-ap', 'formId': 'form-ap', 'formData': {'kv1': ''}, 'agentResponse': AGENT,
      'itemId': 'item-ap-1', 'repositoryItem': {'fileName': 'INV-2026-3005.pdf', 'fileType': 'application/pdf', 'fileSize': 47306, 'fields': {'OcrText': 'INVOICE ... lots of text', 'TenantId': 'b843b988', 'WorkflowInstanceId': 'inst', 'StorageProviderId': 'sp1', 'RepositoryId': 'repo-ap', 'Currency': 'CAD', 'DocumentType': 'INVOICE', 'InvoiceAmount': '949.2', 'InvoiceNo': 'INV-2026-3005', 'MatchedStatus': 'Duplicate', 'OcrJson': '{}', 'Id': 'x'}}}
STATE = {'inbox': [exp_row(1, 'EXP-2026-92', 2, '41.16', 'Beertown Public House'), exp_row(2, 'EXP-2026-90', 30, '120.00', 'Air Canada'), ap_row(1, 'REQ-194', 1), dict(ap_row(2, 'REQ-193', 900), agentResponse=AGENT2)],
         'sent': [], 'completed': [dict(exp_row(9, 'EXP-2026-93', 5, '10.00', 'Tim Hortons'), stage='Approved', stageType='END', completedAtUtc=iso(4), activityId='yAZy')],
         'comments': {}, 'calls': [], 'fail401': False, 'uploads': [], 'started': [], 'masterCalls': [], 'ocr': [], 'ocrUpload': []}
WORKFLOWS = {'items': [{'id': EXP, 'name': 'Expense Reimbursement', 'status': 1}, {'id': AP, 'name': 'Accounts Payable', 'status': 1}, {'id': 'draft', 'name': 'Draft wf', 'status': 0}]}
META = {
  EXP: {'id': EXP, 'name': 'Expense Reimbursement', 'formId': 'form-exp-real' if USE_REAL else 'form-exp', 'repositoryId': 'repo-exp', 'steps': [], 'workflowJson': {
    'blocks': [{'id': 'qxq', 'type': 'START', 'settings': {'label': 'Receipt Upload', 'toolType': 'manual_user', 'isUserEnabled': True, 'users': ['u1', 'u2']}}, {'id': 's2tjj', 'type': 'INTERNAL_ACTOR', 'settings': {'label': 'Approver', 'formEditAccess': 'ALL'}},
               {'id': 'yAZy', 'type': 'END', 'settings': {'label': 'Approved'}}, {'id': 'X0ty', 'type': 'END', 'settings': {'label': 'Rejected'}}, {'id': 'eU3', 'type': 'END', 'settings': {'label': 'Force Close'}}],
    'rules': [{'id': 'r0', 'fromBlockId': 'qxq', 'toBlockId': 's2tjj', 'action': 'Submit', 'proceedAction': 'Submit'},
              {'id': 'r1', 'fromBlockId': 's2tjj', 'toBlockId': 'eU3', 'action': 'Force Close', 'proceedAction': 'Force Close', 'remarks': False, 'buttonColor': 'orange'},
              {'id': 'r2', 'fromBlockId': 's2tjj', 'toBlockId': 'X0ty', 'action': 'Reject', 'proceedAction': 'Reject', 'remarks': False, 'buttonColor': 'red'},
              {'id': 'r3', 'fromBlockId': 's2tjj', 'toBlockId': 'yAZy', 'action': 'Approve', 'proceedAction': 'Approve', 'remarks': False, 'buttonColor': 'green'}],
    'settings': {'general': {'previewValues': ['Email', 'Paid Via', 'Position', 'Total Expense Amount'], 'isStageBased': 1, 'requestTabs': [{'id': 'tab-1', 'label': 'Claim Approval', 'nodeIds': ['s2tjj']}, {'id': 'tab-2', 'label': 'Approved', 'nodeIds': ['yAZy']}, {'id': 'tab-3', 'label': 'Rejected', 'nodeIds': ['X0ty', 'eU3']}]}}}},
  AP: {'id': AP, 'name': 'Accounts Payable', 'formId': 'form-ap', 'repositoryId': 'repo-ap', 'steps': [], 'workflowJson': {
    'blocks': [{'id': 'st', 'type': 'START', 'settings': {'label': 'Gmail', 'toolType': 'email_monitor'}}, {'id': 'DR97', 'type': 'AP_AGENT', 'settings': {'label': 'AP AGENT 1'}}, {'id': 'so19', 'type': 'INTERNAL_ACTOR', 'settings': {'label': 'Verifier'}}],
    'rules': [{'id': 'a1', 'fromBlockId': 'DR97', 'toBlockId': 'so19', 'proceedAction': 'MATCHED'}, {'id': 'a2', 'fromBlockId': 'DR97', 'toBlockId': 'so19', 'proceedAction': 'NOT MATCHED'}, {'id': 'a3', 'fromBlockId': 'DR97', 'toBlockId': 'so19', 'proceedAction': 'NON-INVOICE', 'signature': True}],
    'settings': {'general': {'previewValues': []}}}},
}
FORMS = {
  'form-exp-real': {'name': 'Expense Form', 'formJson': EX.FORM},
  'form-exp': {'name': 'Expense Form', 'formJson': {'panels': [{'fields': [
     {'id': F['email'], 'label': 'Email', 'type': 'SINGLE_SELECT', 'settings': {'specific': {'optionsType': 'USER_LIST'}, 'validation': {'fieldRule': 'REQUIRED'}}}, {'id': F['div'], 'label': 'Divider', 'type': 'DIVIDER', 'settings': {}},
     {'id': F['paid'], 'label': 'Paid Via', 'type': 'SINGLE_SELECT', 'settings': {'specific': {'optionsType': 'CUSTOM', 'customOptions': 'CIBC Visa Card,Cash,Bank transfer'}}}, {'id': F['pos'], 'label': 'Position', 'type': 'SHORT_TEXT', 'settings': {'validation': {'fieldRule': 'REQUIRED'}}},
     {'id': 'hidden1', 'label': 'Requested Date', 'type': 'DATE', 'settings': {'general': {'visibility': 'HIDDEN'}}}, {'id': 'ocr1', 'label': 'OCR Text', 'type': 'LONG_TEXT', 'settings': {}},
     {'id': F['table'], 'label': 'Expense Receipt', 'type': 'TABLE', 'settings': {'specific': {'tableColumns': [{'id': F['file'], 'label': 'Receipt Upload', 'type': 'FILE_UPLOAD'}, {'id': F['bill'], 'label': 'Bill No', 'type': 'SHORT_TEXT'}, {'id': F['merch'], 'label': 'Merchant', 'type': 'SHORT_TEXT'}]}}},
     {'id': F['total'], 'label': 'Total Expense Amount', 'type': 'CALCULATED', 'settings': {}}, {'id': F['desc'], 'label': 'Description', 'type': 'LONG_TEXT', 'settings': {}}]}]}},
  'form-ap': {'name': 'AP Form', 'formJson': {'panels': [{'fields': [{'id': 'kv1', 'label': 'Invoice No', 'type': 'SHORT_TEXT', 'settings': {}}]}]}},
}
PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
       b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj "
       b"4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 40 100 Td (Receipt 41.16) Tj ET\nendstream endobj "
       b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF")
def mailbox(box, wf=None, inst=None, page=1, size=20):
    rows = [r for r in STATE[box] if (not wf or r['workflowId'] == wf) and (not inst or r['workflowInstanceId'] == inst)]
    return {'items': rows[(page-1)*size: page*size], 'totalCount': len(rows), 'pageNumber': page, 'pageSize': size, 'tableExists': True}
# Repository Assistant chatbot: the V6 API returns only the agent's chatbot_result (REPOSITORY_CHATBOT_API_FRONTEND).
def doc_card(i, name, repo='repo-ap', repo_name='Accounts Payable'):
    return {'title': name, 'subtitle': 'Supplier · Field Hit', 'description': 'Vertex Industrial Supply', 'type': 'document', 'matchSource': 'field',
            'id': {'itemId': f'item-ap-{i}', 'repositoryId': repo, 'repositoryName': repo_name}, 'modifiedDateandtime': iso(24 * i)}
def chatbot(body):
    STATE.setdefault('chat', []).append(body)
    msg = (body or {}).get('message', '').lower()
    if not msg.strip(): return 400, {'error': 'message is required.'}
    if 'fail' in msg: return 502, {'error': 'Repository Python chatbot service is unavailable: timeout'}
    blocks = []
    if body.get('specificId'):
        blocks = [{'type': 'paragraph', 'text': 'In **Accounts Payable** I found 1 invoice from Vertex Industrial Supply.'},
                  {'type': 'cards', 'items': [doc_card(1, 'INV-2026-3005.pdf')]}]
    elif 'where' in msg or 'repository' in msg:
        blocks = [{'type': 'paragraph', 'text': 'Invoices are stored in more than one place. Which repository should I search?'},
                  {'type': 'repo_picker', 'title': 'Choose a repository', 'items': [{'name': 'Accounts Payable', 'repositoryId': 'repo-ap'}, {'name': 'Expense Claims', 'repositoryId': 'repo-exp'}]}]
    elif 'hello' in msg:
        blocks = [{'type': 'paragraph', 'text': 'Hi! Ask me about a document, invoice, PO or request.'}]
    elif 'nothing' in msg:
        return 200, {'conversation': [], 'text': {'blocks': []}, 'hits': [], 'action': None, 'actionTo': None}
    else:
        blocks = [{'type': 'paragraph', 'text': 'I found **6 results** for invoices from Vertex Industrial Supply.\nThe newest is INV-2026-3005.'},
                  {'type': 'bullets', 'title': 'Filters Applied', 'items': [{'label': 'Search', 'value': 'invoices'}, {'label': 'Supplier', 'value': 'Vertex Industrial Supply'}, {'label': 'Repository', 'value': 'Accounts Payable'}]},
                  {'type': 'cards', 'title': 'Results', 'items': [doc_card(1, 'INV-2026-3005.pdf'),
                      {'title': 'EXP-2026-92', 'subtitle': 'Request · Field Hit', 'description': '{"bbce89bf": "Client lunch"}', 'type': 'ticket', 'id': {'workflowId': EXP, 'instanceId': 'inst-exp-1', 'requestNo': 'EXP-2026-92'}},
                      {'title': 'Vendor master: Vertex', 'subtitle': 'Form entry', 'description': 'Vendor code V-3101', 'type': 'form', 'id': {'formId': 'form-vendor'}, 'fields': [{'label': 'Vendor code', 'value': 'V-3101'}, {'label': 'Contact', 'value': 'ap@example.com'}]},
                      doc_card(2, 'INV-2026-2990.pdf'), doc_card(3, 'PO-30005.xlsx'), doc_card(4, 'Statement-Oct.pdf')]}]
    pending = {'action_id': 'act-1', 'tool': 'chatbot_start_workflow', 'arguments': {}} if 'start' in msg else None
    res = {'conversation': [{'role': 'user', 'content': body['message']}, {'role': 'assistant', 'content': 'ok'}], 'text': {'blocks': blocks}, 'hits': [],
           'action': None, 'actionTo': 'Repository', 'tenantId': 't1', 'specificId': body.get('specificId')}
    if pending: res['pending_action'] = pending
    return 200, res

# Repositories (FORM_AND_REPOSITORY_FUNCTIONS_API): folder tree, items, staged files, bulk upload jobs.
import re
REPOS = [{'id': 'repo-ap', 'name': 'Accounts Payable', 'description': 'Supplier invoices and POs', 'fileCount': 5, 'storageProviderName': 'EZOFIS Storage', 'status': 'Active'},
         {'id': 'repo-exp', 'name': 'Expense Claims', 'description': '', 'fileCount': 2, 'storageProviderName': 'EZOFIS Storage', 'status': 'Active'},
         {'id': 'repo-hr', 'name': 'HR Letters', 'description': 'Offer and appointment letters', 'fileCount': 0, 'storageProviderName': 'EZOFIS Storage', 'status': 'Active'}]
def item(i, repo, name, supplier, doctype, amount, h):
    return {'id': f'it-{i}', 'repo': repo, 'fileName': name, 'fileVersion': 1, 'documentType': doctype, 'supplier': supplier, 'invoiceNumber': name.split('.')[0] if doctype == 'Invoice' else None,
            'poNumber': name.split('.')[0] if doctype == 'Purchase Order' else None, 'documentDate': iso(h), 'amount': amount, 'currency': 'CAD', 'status': 'Indexed', 'createdBy': 'admin@example.com',
            'fields': {'supplier': supplier, 'documentType': doctype}}
ITEMS = [item(1, 'repo-ap', 'INV-2026-4001.pdf', 'Vertex Industrial Supply', 'Invoice', 949.2, 30), item(2, 'repo-ap', 'INV-2026-4002.pdf', 'Vertex Industrial Supply', 'Invoice', 120.5, 50),
         item(3, 'repo-ap', 'PO-30005.pdf', 'Vertex Industrial Supply', 'Purchase Order', 1582.0, 80), item(4, 'repo-ap', 'INV-2026-4100.pdf', 'Nexus Industrial', 'Invoice', 75.0, 90),
         item(5, 'repo-ap', 'PO-31001.pdf', 'Nexus Industrial', 'Purchase Order', 300.0, 100),
         dict(item(6, 'repo-exp', 'Taxi receipt.jpg', None, None, 32.1, 20), fields={'employee': 'Student Lawyer', 'category': 'Travel'}), dict(item(7, 'repo-exp', 'Lunch.pdf', None, None, 41.16, 40), fields={'employee': 'Student Lawyer', 'category': 'Meals'})]
STRUCT = {'repo-ap': {'folderFields': [{'level': 1, 'name': 'Supplier', 'sqlColumnName': 'Supplier'}, {'level': 2, 'name': 'Document Type', 'sqlColumnName': 'DocumentType'}],
                      'browsePaths': [{'id': 'by-Supplier', 'label': 'Supplier → Document Type', 'fieldOrder': ['Supplier', 'DocumentType']}, {'id': 'by-DocumentType', 'label': 'Document Type → Supplier', 'fieldOrder': ['DocumentType', 'Supplier']}]},
          'repo-exp': {'folderFields': [], 'browsePaths': []}, 'repo-hr': {'folderFields': [], 'browsePaths': []}}
FILTER_FIELDS = {'repo-ap': [{'name': 'Supplier', 'sqlColumnName': 'Supplier', 'dataType': 'SHORT_TEXT'}, {'name': 'Document Type', 'sqlColumnName': 'DocumentType', 'dataType': 'SHORT_TEXT'},
                             {'name': 'Invoice Number', 'sqlColumnName': 'InvoiceNumber', 'dataType': 'SHORT_TEXT'}, {'name': 'Invoice Date', 'sqlColumnName': 'InvoiceDate', 'dataType': 'DATE'}, {'name': 'OCR Text', 'sqlColumnName': 'OcrText', 'dataType': 'LONG_TEXT'}]}
COL = {'Supplier': 'supplier', 'DocumentType': 'documentType'}
STAGE = {}  # fileId → stage row
def paged(rows, page, size): return {'data': rows[(page-1)*size: page*size], 'page': page, 'pageSize': size, 'totalCount': len(rows)}
def live_items(repo): return [x for x in ITEMS if x['repo'] == repo and not x.get('deleted')]
def match(x, filters):
    for k, v in (filters or {}).items():
        val = x.get(COL.get(k, k[0].lower() + k[1:]))
        if (val not in v) if isinstance(v, list) else (val != v): return False
    return True
def stage_row(s): return {k: s[k] for k in ('id', 'fileId', 'name', 'status', 'stageStatus', 'repositoryId', 'repositoryName', 'size', 'fileType', 'createdAt', 'fields', 'itemId', 'isIndexed')}
PHASE_OF = {'PendingOCR': 'PendingOcr', 'OCR': 'OcrCompleted', 'OCRFailed': 'OcrFailed', 'ARCHIVED': 'Indexed'}
# MOBILE_APP_REPOSITORY_API: intelligent upload, AI summary, share, sign requests, signing.
SUMMARY = json.dumps({'confidence_score': 86.0, 'document_type': 'Invoice', 'document_title': 'Industrial Supplies Invoice', 'document_language': 'English',
                      'document_summary': 'Invoice from <b><u>Vertex Industrial Supply</u></b> for <b><u>CAD 949.20</u></b>, due 19 Nov 2026.',
                      'key_facts_extracted': ['The invoice number is <b><u>INV-2026-4001</u></b>.', 'It references PO-30005.', '<script>alert(1)</script>Two line items are billed.']})
SHARES, SIGNS = [], {}
PENDING = [{'signRequestId': 'sr-9', 'repositoryId': 'repo-ap', 'itemId': 'it-3', 'fileName': 'PO-30005.pdf', 'signingMode': 'sequential', 'status': 'InProgress', 'signerStatus': 'Pending', 'signerOrder': 1,
            'message': 'Please sign the PO', 'senderName': 'Jordan Approver', 'senderEmail': 'approver@example.com', 'expiresAtUtc': iso(-240), 'createdAtUtc': iso(2), 'inviteToken': 'inv-9'},
           {'signRequestId': 'sr-7', 'repositoryId': 'repo-ap', 'itemId': 'it-5', 'fileName': 'PO-31001.pdf', 'signingMode': 'parallel', 'status': 'InProgress', 'signerStatus': 'Pending', 'signerOrder': 1,
            'message': None, 'senderName': 'Jordan Approver', 'senderEmail': 'approver@example.com', 'expiresAtUtc': iso(-100), 'createdAtUtc': iso(5), 'inviteToken': 'inv-7'},
           {'signRequestId': 'sr-8', 'repositoryId': 'repo-ap', 'itemId': 'it-4', 'fileName': 'INV-2026-4100.pdf', 'signingMode': 'sequential', 'status': 'InProgress', 'signerStatus': 'Waiting', 'signerOrder': 2,
            'message': None, 'senderName': 'Jordan Approver', 'senderEmail': 'approver@example.com', 'expiresAtUtc': iso(-100), 'createdAtUtc': iso(5), 'inviteToken': 'inv-8'}]
def mp_field(mp, name):
    m = re.search(r'name="' + name + r'"\r\n\r\n(.*?)\r\n--', mp, re.S); return m.group(1) if m else None
def doc_route(method, path, qs, body):
    mp = (body or {}).get('__multipart', '') if isinstance(body, dict) else ''
    if path == '/repositories/document-intelligent-agent/upload':
        STATE.setdefault('classify', []).append({'pageno': mp_field(mp, 'pageno'), 'catalog': mp_field(mp, 'include_repository_catalog'), 'tenant': mp_field(mp, 'tenantId')})
        if 'mystery' in mp: return 502, {'error': 'Document intelligent agent timed out.'}
        return 200, {'confidence_score': 91.5, 'repository_id': 'repo-ap', 'repository_name': 'Accounts Payable', 'rationale': 'Supplier invoice with PO reference',
                     'candidates': [{'repository_id': 'repo-ap', 'repository_name': 'Accounts Payable', 'score': 91.5}, {'repository_id': 'repo-exp', 'repository_name': 'Expense Claims', 'score': 22.0}]}
    if path == '/uploadAndIndex/uploadForOcr' and mp_field(mp, 'repositoryId') in ('repo-ap', 'repo-hr'):
        STATE.setdefault('smartOcr', []).append(mp_field(mp, 'repositoryId'))
        return 200, {'ocrJson': '{"pages":1}', 'ocrText': 'INVOICE Vertex', 'ocrFieldList': [{'name': 'Supplier', 'value': 'Vertex Industrial Supply', 'type': 'SHORT_TEXT'}, {'name': 'Document Type', 'value': 'Invoice', 'type': 'SHORT_TEXT'},
                     {'name': 'Invoice Number', 'value': 'INV-2026-6001', 'type': 'SHORT_TEXT'}, {'name': 'Invoice Date', 'value': '2026-10-25', 'type': 'DATE'}, {'name': 'OCR Text', 'value': 'raw', 'type': 'LONG_TEXT'}]}
    if path == '/uploadAndIndex/uploadWithOcr' and mp_field(mp, 'repositoryId') in ('repo-ap', 'repo-hr'):
        fid = f'st-{len(STAGE) + 1}'; name = re.search(r'filename="([^"]+)"', mp).group(1)
        STAGE[fid] = {'id': fid, 'fileId': fid, 'name': name, 'status': 'OCR', 'stageStatus': 'OCR', 'repositoryId': mp_field(mp, 'repositoryId'), 'repositoryName': 'Accounts Payable', 'size': 1000, 'fileType': 'pdf', 'createdAt': iso(0),
                      'fields': [], 'itemId': None, 'isIndexed': False}
        STATE.setdefault('smartStage', []).append({'repositoryId': mp_field(mp, 'repositoryId'), 'metadata': json.loads(mp_field(mp, 'metadata') or '{}'), 'ocrText': mp_field(mp, 'ocrText'), 'ocrJson': mp_field(mp, 'ocrJson')})
        return 200, {'fileId': fid, 'repositoryId': mp_field(mp, 'repositoryId'), 'fileName': name, 'filePath': 'monitor/' + name}
    if path == '/repositories/shared-with-me': return 200, [{'shareId': 'sh-in-1', 'shareToken': 'tok-1', 'sourceRepositoryId': 'repo-ap', 'sourceItemId': 'it-2', 'fileName': 'INV-2026-4002.pdf', 'sourceOrganizationName': 'Vertex Holdings',
                                                             'permission': 'Can View', 'sharedAtUtc': iso(3), 'expiresAtUtc': iso(-300)}]
    sm = re.match(r'^/repositories/share/(.+)$', path)
    if sm and method == 'DELETE': STATE.setdefault('revokes', []).append(sm.group(1)); return 204, {}
    im = re.match(r'^/repositories/([\w-]+)/items/(it-\d+)/(ai-summary|share|sign-requests)$', path)
    if im:
        repo, iid, what = im.groups(); x = next((i for i in ITEMS if i['id'] == iid), None)
        if what == 'ai-summary': STATE['aiSum'] = STATE.get('aiSum', 0) + 1; return 200, {'output': SUMMARY, 'creditConsumed': STATE['aiSum'] == 1}
        if what == 'share':
            STATE.setdefault('shares', []).append(body)
            if not re.match(r'^[^@\s]+@[^@\s]+\.\w+$', body.get('email', '')): return 400, {'error': 'A valid email is required.'}
            s = {'shareId': f'sh-{len(STATE["shares"])}', 'shareToken': 'tk', 'recipientEmail': body['email'], 'expiresAtUtc': iso(-24 * 30), 'shareUrl': 'https://cloud.example.com/s/tk', 'permission': 'Can Edit' if body.get('action') == 1 else 'Can View', 'isNew': True}
            return 201, s
        if method == 'POST':
            STATE.setdefault('signReqs', []).append(body)
            if not x['fileName'].lower().endswith('.pdf'): return 400, {'error': 'Only PDF documents can be signed.'}
            sid = f'sr-new-{len(STATE["signReqs"])}'
            SIGNS.setdefault(iid, []).append({'signRequestId': sid, 'itemId': iid, 'fileName': x['fileName'], 'signingMode': body['signingMode'], 'status': 'InProgress', 'createdAtUtc': iso(0), 'expiresAtUtc': iso(-24 * 14),
                                             'signers': [{'signerId': f'{sid}-{s["order"]}', 'email': s['email'], 'name': s.get('name'), 'order': s['order'], 'status': 'Pending' if (body['signingMode'] == 'parallel' or s['order'] == 1) else 'Waiting', 'signedAtUtc': None} for s in body['signers']]})
            return 201, SIGNS[iid][-1]
        return 200, SIGNS.get(iid, [])
    if path == '/sign-requests/pending-for-me': return 200, PENDING
    gm = re.match(r'^/sign-requests/([\w-]+)(/file|/sign|/decline|/cancel)?$', path)
    if gm:
        sid, act = gm.groups()
        if act == '/file': return 200, ('bytes', PDF, 'application/pdf')
        if act == '/cancel':
            for l in SIGNS.values():
                for r in l:
                    if r['signRequestId'] == sid: r['status'] = 'Cancelled'
            STATE.setdefault('cancels', []).append(sid); return 200, {'status': 'Cancelled'}
        if act in ('/sign', '/decline'):
            STATE.setdefault('signed' if act == '/sign' else 'declined', []).append({'id': sid, **(body or {})})
            PENDING[:] = [p for p in PENDING if p['signRequestId'] != sid]
            return 200, {'signRequestId': sid, 'status': 'Completed' if act == '/sign' else 'InProgress'}
    return None

def repos_route(method, path, qs, body):
    d = doc_route(method, path, qs, body)
    if d is not None: return d
    if path == '/repositories' and method == 'GET': return 200, REPOS
    m = re.match(r'^/repositories/([\w-]+)/(.*)$', path)
    if m and m.group(1) in STRUCT:
        repo, rest = m.group(1), m.group(2)
        if rest == 'browse/structure': return 200, STRUCT[repo]
        if rest == 'browse/children':
            pf = json.loads(qs.get('parentFilters') or '{}'); order = next((p['fieldOrder'] for p in STRUCT[repo]['browsePaths'] if p['id'] == qs.get('pathId')), STRUCT[repo]['browsePaths'][0]['fieldOrder'])
            lvl = len(pf); field = order[lvl]; rows = [x for x in live_items(repo) if match(x, pf)]
            names = sorted({x[COL[field]] for x in rows if x[COL[field]]}); s = (qs.get('search') or '').lower()
            groups = [{'name': n, 'itemCount': sum(1 for x in rows if x[COL[field]] == n), 'dateModified': iso(10)} for n in names if s in n.lower()]
            ff = next(f for f in STRUCT[repo]['folderFields'] if f['sqlColumnName'] == field)
            return 200, {'level': lvl + 1, 'groupField': field, 'groupFieldName': ff['name'], 'pathId': qs.get('pathId') or 'by-Supplier', 'pathLabel': '', 'parentFilters': pf, 'isLeafLevel': lvl + 1 == len(order),
                         'groups': paged(groups, int(qs.get('page', 1)), int(qs.get('pageSize', 50)))}
        if rest == 'items/query' and method == 'POST':
            STATE.setdefault('itemQueries', []).append(body); s = (body.get('search') or '').lower()
            rows = [{k: v for k, v in x.items() if k not in ('repo', 'deleted')} for x in live_items(repo) if match(x, body.get('filters')) and (not s or s in x['fileName'].lower() or s in (x['supplier'] or '').lower())]
            return 200, paged(rows, body.get('page', 1), body.get('pageSize', 50))
        if rest == 'items/filter-fields': return 200, {'fields': FILTER_FIELDS.get(repo, [])}
        im = re.match(r'^items/(it-\d+)(/metadata|/file)?$', rest)
        if im:
            x = next((i for i in ITEMS if i['id'] == im.group(1)), None)
            if not x or x.get('deleted'): return 404, {'error': 'not found'}
            if im.group(2) == '/file': return 200, ('bytes', PDF, 'application/pdf')
            if im.group(2) == '/metadata' and method == 'PATCH':
                STATE.setdefault('patches', []).append(body)
                for k, v in body.items():
                    x['fields'][k] = v
                    if k in COL: x[COL[k]] = v
                return 200, {'itemId': x['id'], 'updatedFieldCount': len(body), 'item': None}
            if method == 'DELETE': x['deleted'] = True; STATE.setdefault('deletes', []).append(x['id']); return 200, {'itemId': x['id'], 'isDeleted': True}
            return 200, {'id': x['id'], 'fileName': x['fileName'], 'fileType': 'application/pdf' if x['fileName'].lower().endswith('.pdf') else 'image/jpeg', 'fileSize': 48000, 'fields': {'Supplier': x['supplier'], 'DocumentType': x['documentType'], 'InvoiceNumber': x['invoiceNumber'], 'OcrPercent': 92, 'OcrText': 'lots of text', 'RepositoryId': repo, **{k: v for k, v in x['fields'].items() if k[0].isupper()}}}
    if path == '/uploadAndIndex/bulkUpload' and method == 'POST':
        mp = body['__multipart']; repo = re.search(r'name="repositoryId"\r\n\r\n(.*?)\r\n', mp).group(1); names = re.findall(r'name="files"; filename="([^"]+)"', mp)
        jid = 'bulk-' + str(len(STATE.setdefault('jobs', {})) + 1); files = []
        for n in names:
            fid = f'st-{len(STAGE) + 1}'
            STAGE[fid] = {'id': fid, 'fileId': fid, 'name': n, 'status': 'PendingOCR', 'stageStatus': 'PendingOCR', 'repositoryId': repo, 'repositoryName': next(r['name'] for r in REPOS if r['id'] == repo),
                          'size': 182044, 'fileType': 'pdf', 'createdAt': iso(0), 'fields': [], 'itemId': None, 'isIndexed': False, 'job': jid}
            files.append({'fileId': fid, 'repositoryId': repo, 'fileName': n, 'filePath': 'monitor/x/' + n, 'ocrJson': '', 'ocrFieldList': None, 'succeeded': True, 'status': 'PendingOCR'})
        STATE['jobs'][jid] = {'polls': 0, 'files': [f['fileId'] for f in files]}; STATE.setdefault('bulk', []).append({'repositoryId': repo, 'files': names})
        return 202, {'repositoryId': repo, 'jobId': jid, 'message': 'queued', 'files': files, 'succeeded': len(files), 'failed': 0}
    jm = re.match(r'^/uploadAndIndex/bulkUpload/jobs/(.+)$', path)
    if jm:
        if jm.group(1) == 'active': return 404, {'error': 'No active bulk upload OCR job for this tenant.'}
        j = STATE.get('jobs', {}).get(jm.group(1))
        if not j: return 404, {'error': 'Job not found.'}
        j['polls'] += 1
        if j['polls'] >= 2:
            for fid in j['files']:
                s = STAGE[fid]
                if s['status'] == 'PendingOCR':
                    bad = 'bad' in s['name']; s['status'] = s['stageStatus'] = 'OCRFailed' if bad else 'OCR'
                    if not bad: s['fields'] = [{'name': 'Supplier', 'value': 'Vertex Industrial Supply'}, {'name': 'Document Type', 'value': 'Invoice'}, {'name': 'Invoice Number', 'value': 'INV-2026-5001'}, {'name': 'Invoice Date', 'value': '2026-10-20T00:00:00'}]
        fl = [{'fileId': fid, 'fileName': STAGE[fid]['name'], 'status': STAGE[fid]['status'], 'phase': 'Missing' if STAGE[fid].get('deleted') else PHASE_OF[STAGE[fid]['status']], 'promotedItemId': STAGE[fid]['itemId']} for fid in j['files']]
        pend = sum(1 for f in fl if f['phase'] == 'PendingOcr')
        return 200, {'jobId': jm.group(1), 'hangfireState': 'Processing' if pend else 'Succeeded', 'isTerminal': not pend, 'errorMessage': None, 'repositoryId': STAGE[j['files'][0]]['repositoryId'], 'files': fl,
                     'ocrCompleted': sum(1 for f in fl if f['phase'] == 'OcrCompleted'), 'ocrPending': pend, 'ocrFailed': sum(1 for f in fl if f['phase'] == 'OcrFailed'), 'indexed': sum(1 for f in fl if f['phase'] == 'Indexed')}
    if path == '/uploadAndIndex/index/all' and method == 'POST':
        rows = [stage_row(s) for s in STAGE.values() if s['repositoryId'] == body['repositoryId'] and not s.get('deleted') and s['status'] != 'ARCHIVED']
        return 200, {'data': [{'key': '', 'value': rows}], 'meta': {'currentPage': 1, 'itemsPerPage': 50, 'totalItems': len(rows)}}
    fm = re.match(r'^/uploadAndIndex/files/(st-\d+)$', path)
    if fm: return (200, ('bytes', PDF, 'application/pdf')) if fm.group(1) in STAGE else (404, {'error': 'Stage file not found.'})
    xm = re.match(r'^/uploadAndIndex/index/(st-\d+)(/fields)?$', path)
    if xm and method == 'PUT':
        s = STAGE.get(xm.group(1))
        if not s: return 404, {'error': 'Index record not found.'}
        s['fields'] = body['fields']
        if xm.group(2): STATE.setdefault('stageSaves', []).append(body); return 200, {'id': s['id'], 'fileName': s['name'], 'message': 'saved', 'fields': body['fields']}
        STATE.setdefault('exports', []).append(body); s['status'] = 'ARCHIVED'; s['itemId'] = f'it-{len(ITEMS) + 1}'
        f = {x['name']: x['value'] for x in body['fields']}
        ITEMS.append(dict(item(len(ITEMS) + 1, s['repositoryId'], s['name'], f.get('Supplier'), f.get('Document Type'), None, 0)))
        return 200, {'stageId': s['id'], 'hangfireJobId': '', 'message': 'archived', 'itemId': s['itemId'], 'fileName': s['name'], 'filePath': 'archive/' + s['name']}
    if path == '/uploadAndIndex/index/deleteFiles' and method == 'POST':
        STATE.setdefault('stageDeletes', []).append(body)
        for fid in body['fileIds']: STAGE[fid]['deleted'] = True
        return 200, {'requested': len(body['fileIds']), 'succeeded': len(body['fileIds']), 'failed': 0, 'files': [{'fileId': f, 'succeeded': True} for f in body['fileIds']]}
    return None

def handle(method, path, qs, body):
    r = repos_route(method, path, qs, body)
    if r is not None:
        STATE['calls'].append((method, path, qs, body)); return r
    STATE['calls'].append((method, path, qs, body))
    if STATE['fail401']: return 401, {'message': 'Unauthorized'}
    if path == '/repositories/assistant/chatbot' and method == 'POST': return chatbot(body)
    if path == '/usersession': return 200, {'id': 'u1', 'email': 'student.lawyer@example.com', 'displayName': 'Student Lawyer', 'role': 'User', 'Job Title': None, 'department': 'Legal', 'MFAuthentication': 'No', 'configuration': 1}
    p = path[len('/Workflows'):] if path.startswith('/Workflows') else None
    if path.startswith('/repositories/') and path.endswith('/file'): return 200, ('bytes', PDF, 'application/pdf')
    if path.startswith('/repositories/') and path.endswith('/ai-summary') and method == 'POST': STATE['aiSum'] = STATE.get('aiSum', 0) + 1; return 200, {'data': {'output': 'Invoice INV-2026-3005 from Vertex Industrial Supply for CAD 949.20 against PO-30005. Two lines; quantity on line 1 differs from the PO.', 'creditConsumed': True}}
    if path.startswith('/repositories/') and path.count('/') == 4 and '/items/' in path:
        return 200, {'id': 'x', 'fileName': 'INV-2026-3005.pdf', 'fileType': 'application/pdf', 'fileSize': 47306, 'storageProviderId': 'sp', 'fields': {'DocumentType': 'INVOICE', 'InvoiceNo': 'INV-2026-3005', 'InvoiceAmount': '949.2', 'Currency': 'CAD', 'DueDate': '2026-10-19T00:00:00', 'MatchedStatus': 'Duplicate', 'Buyer': None, 'OcrText': 'lots', 'TenantId': 't', 'RepositoryId': 'r', 'WorkflowInstanceId': 'w', 'StorageProviderId': 's', 'FileVersion': 1, 'CreatedAtUtc': '2026-10-26T13:42:06Z'}}
    if path == '/Users': return 200, {'items': [{'id': 'u1', 'email': 'student.lawyer@example.com', 'displayName': 'Student Lawyer'}, {'id': 'u2', 'email': 'approver@example.com', 'displayName': 'Jordan Approver'}]}
    if p and p.endswith('/start') and method == 'POST':
        STATE['started'].append(body); return 201, {'instanceId': 'inst-new2', 'requestNo': 'EXP-2026-100', 'firstTransactionId': 231, 'apAgentJobId': 'job1'}
    if p and p.endswith('/start/json'):
        STATE['started'].append(body); return 201, {'instanceId': 'inst-new', 'requestNo': 'EXP-2026-99', 'firstTransactionId': 'tx-new', 'formEntryId': 'fe-new'}
    if path.startswith('/form/') and '/entry/all' in path:
        mid=path.split('/')[2]; STATE['masterCalls'].append(mid); return 200, {'status':'ok','formId':mid,'entries':EX.MASTERS.get(mid,[]),'meta':{'totalItems':len(EX.MASTERS.get(mid,[]))}}
    if path.startswith('/form/'): return 200, FORMS[path.split('/')[2]]
    if path == '/uploadAndIndex/uploadForOcr':
        STATE['ocr'].append(body); return 200, {'ocrFieldList':[{'name':'Bill No,SHORT_TEXT','value':'353806'},{'name':'Merchant,SHORT_TEXT','value':'Beertown Public House'},{'name':'Date,DATE','value':'2025-02-21'},{'name':'Category,SINGLE_SELECT','value':'Entertainment'},{'name':'Total,NUMBER','value':'34.88'},{'name':'HST,NUMBER','value':'4.54'},{'name':'Tips,NUMBER','value':'6.28'},{'name':'Currency Type,SINGLE_SELECT','value':'CAD'}],'ocrJson':'{"doc":"receipt"}'}
    if path == '/uploadAndIndex/uploadWithOcr':
        STATE['ocrUpload'].append(body); return 200, {'fileId':'file-'+str(len(STATE['ocrUpload'])),'repositoryId':'repo-exp'}
    if path.lower() == '/workflows/by-activity/counts':
        rows = STATE['inbox'] + STATE['sent'] + STATE['completed']; ids = body['activityIds']
        return 200, {'workflowId': body['workflowId'], 'fullCount': sum(1 for r in rows if r['workflowId'] == body['workflowId']), 'items': [{'activityId': a, 'count': sum(1 for r in rows if r['workflowId'] == body['workflowId'] and r['activityId'] == a)} for a in ids]}
    if path.lower() == '/workflows/by-activity':
        STATE.setdefault('byAct', []).append(body)
        out = [dict(r, mailbox=k) for k in ('inbox', 'sent', 'completed') for r in STATE[k] if r['workflowId'] == body['workflowId'] and r['activityId'] in body['activityIds']]
        pn, ps = body.get('pageNumber', 1), body.get('pageSize', 20)
        return 200, {'items': out[(pn-1)*ps: pn*ps], 'totalCount': len(out), 'pageNumber': pn, 'pageSize': ps}
    if p == '': return 200, WORKFLOWS
    if p == '/counts': return 200, {'inboxCount': 99, 'sentCount': len(STATE['sent']), 'completedCount': len(STATE['completed']), 'totalActive': 4}
    if p == '/instance-count':
        wf = qs.get('workflowId'); return 200, {'workflowId': wf, **{k + 'Count': len([r for r in STATE[k] if r['workflowId'] == wf]) for k in ('inbox', 'sent', 'completed')}}
    if p == '/inbox/all-workflows':
        n = int(qs.get('itemsPerWorkflow', 20)); out = []
        for wid, name in ((EXP, 'Expense Reimbursement'), (AP, 'Accounts Payable')):
            rows = [r for r in STATE['inbox'] if r['workflowId'] == wid]
            if rows: out.append({'workflowId': wid, 'workflowName': name, 'totalCount': len(rows) + (40 if wid == EXP else 0), 'newTodayCount': 1, 'earlierCount': 0, 'items': rows[:n]})
        return 200, {'totalCount': sum(g['totalCount'] for g in out), 'workflows': out}
    if p in ('/inbox', '/sent', '/completed'):
        if 'workflowId' not in qs: return 400, {'message': 'workflowId is required'}
        return 200, mailbox(p[1:], qs['workflowId'], qs.get('instanceId'), int(qs.get('pageNumber', 1)), int(qs.get('pageSize', 20)))
    if p.startswith('/instances/') and p.endswith('/move-next'):
        inst = p.split('/')[2]; r = next(x for x in STATE['inbox'] if x['workflowInstanceId'] == inst)
        STATE['inbox'].remove(r); r = dict(r, stage=body['review'] == 'Approve' and 'Approved' or 'Rejected', stageType='END', completedAtUtc=iso(0)); STATE['completed'].insert(0, r)
        return 200, {'success': True, 'message': 'Moved', 'nextStepName': r['stage'], 'nextStepOrder': 3, 'workflowCompleted': True}
    if p.startswith('/') and p.count('/') >= 3 and '/instances/' in p:
        parts = p.split('/'); wf, inst, sub = parts[1], parts[3], (parts[4] if len(parts) > 4 else '')
        if wf not in META: return 404, {'message': 'not found'}
        if sub == 'locate':
            for box in ('inbox', 'sent', 'completed'):
                for r in STATE[box]:
                    if r['workflowInstanceId'] == inst: return 200, dict(r, mailbox=box)
            return 404, {'message': 'Not in any mailbox'}
        if sub == '': return 200, {'id': inst, 'workflowId': wf, 'status': 1, 'currentStepInstanceId': 'si2', 'stepInstances': [{'id': 'si1', 'order': 1, 'stepName': 'Receipt Upload', 'status': 2}, {'id': 'si2', 'order': 2, 'stepName': 'Approver', 'status': 1}]}
        if sub == 'history': return 200, {'referenceNumber': 'X', 'statusName': 'Running', 'nextActionUser': 'admin@example.com', 'flows': [
            {'sequence': 1, 'milestone': 'submitted', 'action': 'submit', 'title': 'Submitted — Receipt Upload', 'performedByUserName': 'student.lawyer@example.com', 'performedAtUtc': iso(3), 'stageName': 'Receipt Upload', 'review': 'Submit', 'description': 'Submit'},
            {'sequence': 2, 'milestone': 'moved', 'action': 'move', 'title': 'Moved to Approver', 'performedByUserName': 'system', 'performedAtUtc': iso(2), 'stageName': 'Approver'}]}
        if sub == 'comments':
            if method == 'POST':
                STATE['comments'].setdefault(inst, []).append({'id': 'c' + str(len(STATE['calls'])), 'comments': body['comments'], 'authorName': 'student.lawyer@example.com', 'createdAtUtc': iso(0), 'isAgent': False})
                return 201, {'commentId': 'c1', 'skipped': False}
            return 200, {'comments': [{'id': 'c0', 'comments': 'Receipt attached.', 'authorName': 'AI Agent', 'isAgent': True, 'createdAtUtc': iso(2)}] + STATE['comments'].get(inst, [])}
        if sub == 'attachments':
            if method == 'POST': STATE['uploads'].append(inst); return 201, {'ok': True}
            return 200, {'attachments': [{'id': 'a1', 'fileName': 'BeerTown Food receipt with Tip.pdf', 'contentType': 'application/pdf', 'fileSize': 90108, 'uploadedBy': 'admin@example.com', 'createdAtUtc': iso(2), 'repositoryId': 'repo-exp', 'itemId': 'item-1'}]}
    if p and p.count('/') == 1 and p[1:] in META: return 200, META[p[1:]]
    return 404, {'message': 'mock: no route ' + path}
