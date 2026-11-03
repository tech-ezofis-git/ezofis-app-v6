// EZOFIS notifications (MOBILE_APP_NOTIFICATIONS_API): the bell list the web app shows, stored on the server.
//   GET /api/notifications[?category=workflow]  → all of the user's notifications, newest first (not paged)
//   PATCH /api/notifications/{id}/read           → { id, isRead: true }
//   DELETE /api/notifications/{id}               → 204
// Opening one goes to the ticket (data.workflowId + data.processId; the detail screen locates its mailbox).
import { authed } from './api.js';

export const notifApi = {
  list: (category) => authed('/notifications' + (category ? '?category=' + encodeURIComponent(category) : '')).then((d) => (Array.isArray(d) ? d : (d && (d.items || d.data)) || [])),
  read: (id) => authed(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  remove: (id) => authed(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// createdAtUtc is a code, not a date: minutesAgo(N) | daysAgo(N) | weekAgo(N)
export function relTime(code) {
  const m = /^(minutesAgo|daysAgo|weekAgo)\((\d+)\)$/.exec(String(code || '').trim());
  if (!m) return { text: '', today: false };
  const n = Number(m[2]);
  if (m[1] === 'minutesAgo') return { text: n < 1 ? 'Just now' : n < 60 ? `${n} min ago` : `${Math.floor(n / 60)} h ago`, today: n < 24 * 60 };
  if (m[1] === 'daysAgo') return { text: n === 1 ? 'Yesterday' : `${n} days ago`, today: false };
  return { text: n === 1 ? '1 week ago' : `${n} weeks ago`, today: false };
}

const TONE = { info: 'p', success: 't', warning: 'a', error: 'r', danger: 'r' };
// server notification → the app's notification item
export function toItem(raw) {
  const d = (raw && raw.data) || {};
  const s = (raw && raw.target && raw.target.search) || {};
  const wf = d.workflowId || s.workflowId;
  const inst = d.processId || s.processId;
  const t = relTime(raw && raw.createdAtUtc);
  return {
    id: String(raw.id),
    server: true,
    type: String(raw.category || '').toLowerCase() === 'workflow' ? 'wf' : 'other',
    tone: TONE[String(raw.severity || 'info').toLowerCase()] || 'p',
    title: raw.title || raw.message || 'Notification',
    body: raw.message && raw.message !== raw.title ? raw.message : d.workflowName || '',
    time: t.text, today: t.today,
    unread: !raw.isRead,
    to: wf && inst ? '/app/inbox/' + encodeURIComponent(`${wf}~${inst}`) : '/app/inbox',
  };
}
