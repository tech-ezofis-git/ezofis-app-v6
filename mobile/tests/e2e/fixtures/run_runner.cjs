// Runs public/runners/inbox.js with a fake Capacitor Background Runner (KV store, notifications, fetch) for test_flow23.py.
// usage: node run_runner.cjs <path to inbox.js>
const fs = require('fs');
const vm = require('vm');
let code = 200; const kv = {}; const shown = []; const handlers = {}; const fetched = [];
let inbox = { totalCount: 2, workflows: [{ items: [{ workflowInstanceId: 'i1', transactionId: 1, referenceNumber: 'EXP-1', name: 'Expense Reimbursement', stage: 'Approver' }, { workflowInstanceId: 'i2', transactionId: 2, referenceNumber: 'EXP-2', name: 'Expense Reimbursement', stage: 'Approver' }] }] };
const ctx = {
  JSON, Date, Math,
  CapacitorKV: { set: (k, v) => { kv[k] = v; }, get: (k) => ({ value: kv[k] || '' }) },
  CapacitorNotifications: { schedule: (list) => shown.push(...list) },
  fetch: async (url, opts) => { fetched.push({ url, auth: opts.headers.Authorization, tenant: opts.headers['X-Tenant-Id'] }); return code === 200 ? { status: 200, json: async () => inbox } : { status: code, json: async () => ({}) }; }, // no res.ok, like the runner's fetch may be
  addEventListener: (name, fn) => { handlers[name] = fn; },
};
vm.runInNewContext(fs.readFileSync(process.argv[2], 'utf8'), ctx);
const fire = (name, args) => new Promise((res, rej) => handlers[name](res, rej, args));
(async () => {
  await fire('checkInbox'); const noSession = fetched.length === 0;
  await fire('session', { token: 'jwt', tenantId: 't1', expiresAt: Date.now() + 3600e3, enabled: true });
  await fire('checkInbox'); const baselineQuiet = shown.length === 0;
  inbox = { totalCount: 3, workflows: [{ items: [{ workflowInstanceId: 'i3', transactionId: 3, referenceNumber: 'EXP-3', name: 'Expense Reimbursement', stage: 'Approver' }, ...inbox.workflows[0].items] }] };
  await fire('checkInbox'); const one = shown.slice();
  await fire('checkInbox'); const noRepeat = shown.length === 1;
  inbox = { totalCount: 4, workflows: [{ items: [{ workflowInstanceId: 'i4', transactionId: 4, referenceNumber: 'EXP-4', name: 'Expense Reimbursement' }, ...inbox.workflows[0].items] }] };
  await fire('seen', { keys: ['i4|4', 'i3|3', 'i2|2', 'i1|1'] }); await fire('checkInbox'); const seenByApp = shown.length === 1;
  await fire('session', { token: 'jwt', tenantId: 't1', expiresAt: Date.now() + 3600e3, enabled: false }); const before = fetched.length; await fire('checkInbox'); const offRespected = fetched.length === before;
  await fire('session', { token: 'jwt', tenantId: 't1', expiresAt: Date.now() + 3600e3, enabled: true });
  code = 401; await fire('checkInbox'); const st401 = (await fire('status')).last.result;
  code = 200; await fire('checkInbox'); const st = await fire('status');
  const test = await fire('testNotify'); const testShown = shown[shown.length - 1].title;
  await fire('session', {}); await fire('checkInbox'); const signedOut = !kv.session && JSON.parse(kv.status).result === 'not signed in';
  console.log('RUNNER:', JSON.stringify({ noSession, baselineQuiet, notified: one.map((n) => n.title), headers: fetched[0] && fetched[0].auth === 'Bearer jwt' && fetched[0].tenant === 't1', noRepeat, seenByApp, offRespected, signedOut }));
  console.log('RUNNER STATUS:', JSON.stringify({ st401, after: st.last.result, signedIn: st.signedIn, seen: st.seen, test: test.ok, testShown }));
})();
