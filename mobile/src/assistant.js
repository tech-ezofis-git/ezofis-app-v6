// Ask EZOFIS AI: Repository Assistant chatbot (REPOSITORY_CHATBOT_API_FRONTEND, Oct 2026).
// POST /api/repositories/assistant/chatbot { message, sessionId, specificId? } → the agent's `chatbot_result` object:
//   { conversation, text: { blocks }, hits, action, actionTo, specificId, pending_action? }
// Block types (agents CHATBOT.md contract, same as the web Ask AI): paragraph, bullets, card, cards, repo_picker.
// Card `id` objects carry the record keys: itemId + repositoryId (documents), workflowId + instanceId (requests), formId.
import { authed } from './api.js';

// The server waits up to 120 s for the agent, so the app waits a little longer.
export const ASK_TIMEOUT_MS = 125000;

export const newSessionId = () => {
  try { if (crypto && crypto.randomUUID) return 'mobile-' + crypto.randomUUID(); } catch (e) { /* older WebView */ }
  return 'mobile-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
};

// actionFrom is left out so the server uses its default ("Repository"); the token comes from the Authorization header.
export const askAssistant = ({ message, sessionId, specificId }) => authed('/repositories/assistant/chatbot', {
  method: 'POST', timeout: ASK_TIMEOUT_MS,
  body: { message, sessionId, ...(specificId ? { specificId } : {}) },
});

// Error text for the chat thread (doc: 400 validation, 502 assistant unavailable, others passed through).
export function askErrorMessage(e) {
  const s = e && e.status;
  if (s === 400) return (e.message && !/^Request failed/.test(e.message)) ? e.message : "EZOFIS couldn't read that question. Try asking it another way.";
  if (s === 502 || s === 503 || s === 504) return 'Ask AI is unavailable right now. Try again in a moment.';
  if (s === 403) return "You don't have access to Ask AI in this organization.";
  if (s === 0) return /too long/.test((e && e.message) || '') ? 'Ask AI took too long to answer. Try a shorter or more specific question.' : e.message;
  return "Ask AI couldn't answer that. Try again.";
}

const str = (v) => (v == null ? '' : String(v).trim());
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export const pickId = (id, ...keys) => {
  if (!isObj(id)) return '';
  for (const k of keys) { const v = id[k]; if (v != null && v !== '' && v !== 0 && v !== '0') { const t = str(v); if (t) return t; } }
  return '';
};

function card(raw) {
  if (!isObj(raw)) return null;
  const title = str(raw.title ?? raw.entity_name ?? raw.name ?? raw.ifileName);
  if (!title) return null;
  return {
    title,
    subtitle: str(raw.subtitle),
    description: str(raw.description),
    type: str(raw.type ?? raw.entity_type).toLowerCase(),
    id: isObj(raw.id) ? raw.id : null,
    fields: Array.isArray(raw.fields) ? raw.fields.filter(isObj).map((f) => ({ label: str(f.label), value: str(f.value) })).filter((f) => f.label && f.value) : [],
    when: str(raw.modifiedDateandtime || raw.dateandtime),
  };
}

function block(raw) {
  if (!isObj(raw)) return null;
  const type = str(raw.type);
  if (type === 'paragraph') { const text = str(raw.text); return text ? { type, text } : null; }
  if (type === 'bullets') {
    const items = (Array.isArray(raw.items) ? raw.items : []).map((i) => (isObj(i) ? { label: str(i.label), value: str(i.value) } : { label: '', value: str(i) })).filter((i) => i.label || i.value);
    return items.length ? { type, title: str(raw.title), items } : null;
  }
  if (type === 'card') { const c = card(raw); return c ? { type: 'cards', title: '', items: [c] } : null; }
  if (type === 'cards') { const items = (Array.isArray(raw.items) ? raw.items : []).map(card).filter(Boolean); return items.length ? { type, title: str(raw.title), items } : null; }
  if (type === 'repo_picker') {
    const items = (Array.isArray(raw.items) ? raw.items : []).filter(isObj).map((i) => ({ name: str(i.name ?? i.repositoryName), repositoryId: str(i.repositoryId ?? i.id) })).filter((i) => i.name && i.repositoryId);
    return items.length ? { type, title: str(raw.title) || 'Choose a repository', items } : null;
  }
  return null;
}

// chatbot_result (or the agent's raw body when it isn't JSON) → { blocks, needsWeb }
export function normalizeAnswer(raw) {
  if (typeof raw === 'string') return { blocks: raw.trim() ? [{ type: 'paragraph', text: raw.trim() }] : [], needsWeb: false };
  if (!isObj(raw)) return { blocks: [], needsWeb: false };
  const data = isObj(raw.chatbot_result) ? raw.chatbot_result : raw;
  let blocks = (isObj(data.text) && Array.isArray(data.text.blocks) ? data.text.blocks : []).map(block).filter(Boolean);
  if (!blocks.length && Array.isArray(data.hits) && data.hits.length) {
    const items = data.hits.map(card).filter(Boolean);
    if (items.length) blocks = [{ type: 'paragraph', text: `I found ${items.length} matching result${items.length === 1 ? '' : 's'}.` }, { type: 'cards', title: '', items }];
  }
  if (!blocks.length && typeof data.reply === 'string' && data.reply.trim()) blocks = [{ type: 'paragraph', text: data.reply.trim() }];
  if (!blocks.length && Array.isArray(data.conversation)) {
    const last = data.conversation.filter((m) => isObj(m) && m.role === 'assistant').pop();
    if (last && str(last.content)) blocks = [{ type: 'paragraph', text: str(last.content) }];
  }
  // Actions the agent proposes (start workflow, upload, create user) are confirmed through the agents service,
  // which the V6 API doesn't expose to the app yet.
  return { blocks, needsWeb: isObj(data.pending_action) };
}

// What tapping a result card does in the app.
export function cardTarget(c) {
  const itemId = pickId(c.id, 'itemId', 'documentId');
  const repositoryId = pickId(c.id, 'repositoryId', 'repoId');
  const workflowId = pickId(c.id, 'workflowId');
  const instanceId = pickId(c.id, 'instanceId');
  if ((c.type === 'ticket' || c.type === 'request' || c.type === 'comment') && workflowId && instanceId) return { kind: 'request', key: `${workflowId}~${instanceId}` };
  if (itemId && repositoryId) return { kind: 'file', file: { fileName: c.title, repositoryId, itemId } };
  if (workflowId && instanceId) return { kind: 'request', key: `${workflowId}~${instanceId}` };
  return null;
}

export const CARD_LABEL = { document: 'Document', file: 'Document', ticket: 'Request', request: 'Request', comment: 'Comment', form: 'Form entry', repository: 'Folder', workflow: 'Workflow' };

// Starter questions (the assistant searches documents, folders, requests, comments and form entries).
export const SUGGESTIONS = [
  { icon: 'file', text: 'Show invoices received this month' },
  { icon: 'search', text: 'Find purchase orders for my top supplier' },
  { icon: 'inbox', text: 'Which requests mention a duplicate invoice?' },
  { icon: 'folder', text: 'What documents were added this week?' },
];
