// EZOFIS background inbox check (Capacitor Background Runner, Android WorkManager about every 15 minutes, also while
// the app is closed). No DOM here: only fetch, CapacitorKV (app-private storage) and CapacitorNotifications.
// The app sends the session ("session" event) and the requests it has already shown ("seen" event); this runner
// notifies only requests that are new since then, so nothing is announced twice. Every run records its outcome under
// "status" so Settings → Background check can show what happened ("status" event), and "testNotify" posts a test.
var API = 'https://cloud.ezofis.com/api';

function kvJson(key) {
  try { var r = CapacitorKV.get(key); return r && r.value ? JSON.parse(r.value) : null; } catch (e) { return null; }
}
function keyOf(r) { return r.workflowInstanceId + '|' + (r.transactionId || r.activityId || ''); }
// last outcome under "status", and the last 8 runs under "history" (who started it: Android's schedule, the app while
// the user was away, or Check now) so Settings → Background check shows where it stops
var BY = 'schedule';
function record(result, extra) {
  var s = { at: Date.now(), result: result, by: BY };
  if (extra) for (var k in extra) s[k] = extra[k];
  try {
    CapacitorKV.set('status', JSON.stringify(s));
    var h = kvJson('history') || [];
    h.unshift(s);
    CapacitorKV.set('history', JSON.stringify(h.slice(0, 8)));
  } catch (e) { /* nothing to record into */ }
}
function notify(id, title, body) {
  CapacitorNotifications.schedule([{ id: id, title: title, body: body, autoCancel: true }]);
}

addEventListener('session', function (resolve, reject, args) {
  try {
    if (args && args.token) CapacitorKV.set('session', JSON.stringify(args));
    else { CapacitorKV.set('session', ''); CapacitorKV.set('seen', ''); }
    resolve();
  } catch (e) { reject(e); }
});

addEventListener('seen', function (resolve, reject, args) {
  try { CapacitorKV.set('seen', JSON.stringify(((args && args.keys) || []).slice(0, 300))); resolve(); } catch (e) { reject(e); }
});

addEventListener('status', function (resolve) {
  var s = kvJson('session');
  var seen = kvJson('seen');
  resolve({ last: kvJson('status'), history: kvJson('history') || [], signedIn: !!(s && s.token), enabled: !!(s && s.enabled !== false), expiresAt: (s && s.expiresAt) || 0, seen: seen ? seen.length : -1 });
});

addEventListener('testNotify', function (resolve) {
  try { notify(1999999999, 'EZOFIS notifications work', 'You will be told here when a new request is waiting for you.'); resolve({ ok: true }); } catch (e) { resolve({ ok: false, error: String(e && e.message || e) }); }
});

addEventListener('checkInbox', async function (resolve, reject, args) {
  BY = (args && args.by) || 'schedule';
  try {
    var s = kvJson('session');
    if (!s || !s.token) { record('not signed in'); resolve(); return; }
    if (s.enabled === false) { record('notifications off'); resolve(); return; }
    if (s.expiresAt && s.expiresAt < Date.now()) { record('sign-in expired'); resolve(); return; }
    var res = await fetch(API + '/Workflows/inbox/all-workflows?itemsPerWorkflow=10', { method: 'GET', headers: { Authorization: 'Bearer ' + s.token, 'X-Tenant-Id': s.tenantId, Accept: 'application/json' } });
    // the runner's fetch may not expose res.ok, so the status code decides when there is one
    var code = res && typeof res.status === 'number' ? res.status : 0;
    if (code && (code < 200 || code >= 300)) { record('server answered ' + code); resolve(); return; }
    var d = await res.json();
    var rows = [];
    ((d && d.workflows) || []).forEach(function (g) { (g.items || []).forEach(function (r) { rows.push(r); }); });
    var seen = kvJson('seen');
    CapacitorKV.set('seen', JSON.stringify(rows.map(keyOf).slice(0, 300)));
    if (!seen) { record('first check, ' + rows.length + ' waiting'); resolve(); return; } // remember what's there, announce nothing
    var fresh = rows.filter(function (r) { return seen.indexOf(keyOf(r)) < 0; });
    if (fresh.length) {
      var one = fresh[0];
      notify(Math.floor(Date.now() / 1000) % 2000000000,
        fresh.length === 1 ? 'New request · ' + (one.referenceNumber || one.name) : fresh.length + ' new requests',
        fresh.length === 1 ? (one.name || 'A request') + (one.stage ? ' · ' + one.stage : '') + ' is waiting for you' : ((d && d.totalCount) || rows.length) + ' waiting in your EZOFIS inbox');
    }
    record(fresh.length ? fresh.length + ' new, notified' : 'no new requests', { waiting: rows.length, newest: rows[0] ? (rows[0].referenceNumber || rows[0].name || '') : '' });
    resolve();
  } catch (e) { record('error: ' + String((e && e.message) || e).slice(0, 120)); resolve(); } // tried again next time
});
