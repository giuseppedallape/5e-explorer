import snarkdown from 'snarkdown';
import DOMPurify from 'dompurify';

export function mdToHtml(md) {
  const raw = typeof md === 'string' ? md : '';
  const html = snarkdown(raw);
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}