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
def handle(method, path, qs, body):
    STATE['calls'].append((method, path, qs, body))
    if STATE['fail401']: return 401, {'message': 'Unauthorized'}
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
