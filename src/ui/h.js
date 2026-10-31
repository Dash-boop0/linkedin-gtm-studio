// Tiny HTML helpers shared by the views. Everything user-supplied goes through esc().
import { esc } from '../lib/charts.js';

export { esc };

let fid = 0;
const nextId = () => `f${(fid += 1)}`;

export function input(label, name, value = '', { type = 'text', full = false, hint = '', attrs = '' } = {}) {
  const id = nextId();
  return `<div class="field${full ? ' full' : ''}"><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}" name="${name}" value="${esc(value ?? '')}" ${attrs}>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
}

export function textarea(label, name, value = '', { full = true, hint = '', rows = 3, attrs = '' } = {}) {
  const id = nextId();
  return `<div class="field${full ? ' full' : ''}"><label for="${id}">${esc(label)}</label><textarea id="${id}" name="${name}" rows="${rows}" ${attrs}>${esc(value ?? '')}</textarea>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}</div>`;
}

/** options: [value] or [[value, label]] */
export function select(label, name, value, options, { full = false, attrs = '' } = {}) {
  const id = nextId();
  const opts = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  return `<div class="field${full ? ' full' : ''}"><label for="${id}">${esc(label)}</label><select id="${id}" name="${name}" ${attrs}>${opts
    .map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());

export const btn = (label, action, { cls = '', data = {}, type = 'button' } = {}) =>
  `<button type="${type}" class="btn ${cls}"${action ? ` data-action="${action}"` : ''}${Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${esc(label)}</button>`;

export function empty(title, text, actions = '') {
  return `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`;
}

export const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;

export function meter(value, label) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return `<div class="meter" role="img" aria-label="${esc(label)}: ${Math.round(v * 100)}%"><span style="width:${(v * 100).toFixed(0)}%"></span></div>`;
}

export function table(caption, cols, rows, { cls = '' } = {}) {
  return `<div class="table-wrap"><table class="data ${cls}"><caption>${esc(caption)}</caption><thead><tr>${cols
    .map((c) => `<th scope="col"${c.num ? ' class="num"' : ''}>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td${c.num ? ' class="num"' : ''}>${c.html ? c.html(r) : esc(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
