<template>
  <div v-if="data" class="detail">
    <!-- Header -->
    <div class="card header">
      <h2 class="title">
        {{ title }}
      </h2>
      <div class="meta" v-if="headerMeta.length">
        <div v-for="(m,i) in headerMeta" :key="i" class="meta-item">
          <span class="k">{{ m.label }}</span>
          <span class="v">{{ m.value }}</span>
        </div>
      </div>
    </div>

    <!-- Descrizioni -->
    <!-- Descrizioni (Markdown) -->
    <div v-if="mdBlocks.length" class="card">
      <h3>Descrizione</h3>
      <div v-for="(b,i) in mdBlocks" :key="i">
        <div class="md" v-html="b.html" @click="onMdClick"></div>
      </div>
    </div>

    <!-- Proprietà principali (key-value) -->
    <div v-if="kvPairs.length" class="card">
      <h3>Proprietà</h3>
      <div class="kv-grid">
        <div v-for="(row, i) in kvPairs" :key="i" class="kv">
          <div class="k">{{ row.label }}</div>
          <div class="v">{{ formatValue(row.key, row.value) }}</div>
        </div>
      </div>
    </div>

    <!-- Liste (array) -->
    <div v-for="(sec, si) in arraySections" :key="si" class="card">
      <h3>{{ sec.label }}</h3>

      <!-- Array di primitivi -->
      <div v-if="sec.kind === 'primitive' && sec.values.length" class="tags">
        <span class="tag" v-for="(v, i) in sec.values" :key="i">{{ v }}</span>
      </div>

      <!-- Array di oggetti con name/url -->
      <ul v-else-if="sec.kind === 'objects-named' && sec.values.length" class="list">
        <li v-for="(o, i) in sec.values" :key="i">
          <button class="link" @click="onNavigate(o.url)" v-if="o.url">
            {{ o.name || o.index || o.url }}
            <small class="muted">{{ o.url }}</small>
          </button>
          <span v-else>{{ o.name || o.index || pretty(o) }}</span>
        </li>
      </ul>

      <!-- Array di oggetti generici (tabella) -->
      <div v-else-if="sec.kind === 'objects-table' && sec.values.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th v-for="c in sec.columns" :key="c">{{ humanizeKey(c) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in sec.values" :key="ri" @click="row.url && onNavigate(row.url)" :class="{ clickable: !!row.url }">
              <td v-for="c in sec.columns" :key="c">{{ formatCell(row[c]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Oggetti annidati “noti” -->
    <div v-for="(sec, si) in objectSections" :key="'o'+si" class="card">
      <h3>{{ sec.label }}</h3>

      <!-- Riferimento singolo con name/url -->
      <div v-if="sec.kind === 'ref'">
        <button class="link" @click="onNavigate(sec.value.url)" v-if="sec.value.url">
          {{ sec.value.name || sec.value.index || sec.value.url }}
          <small class="muted">{{ sec.value.url }}</small>
        </button>
        <pre v-else class="json">{{ pretty(sec.value) }}</pre>
      </div>

      <!-- Oggetto generico flattato -->
      <div v-else-if="sec.kind === 'object-kv'">
        <div class="kv-grid">
          <div v-for="(row, i) in sec.rows" :key="i" class="kv">
            <div class="k">{{ row.label }}</div>
            <div class="v">
              <template v-if="isPrimitive(row.value)">
                {{ formatValue(row.key, row.value) }}
              </template>
              <template v-else>
                <pre class="json">{{ pretty(row.value) }}</pre>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Link correlati (passati dal parent) -->
    <div v-if="links?.length" class="card">
      <h3>Link correlati</h3>
      <ul class="list">
        <li v-for="(l, i) in links" :key="i">
          <button class="link" @click="onNavigate(l.url)">
            {{ l.label }}
            <small class="muted">{{ l.url }}</small>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getLayoutForCategory, aliasFor, shouldHideKey } from '../layouts.js';
import { mdToHtml } from '../utils/markdown.js';

const props = defineProps({
  data: { type: Object, required: true },
  category: { type: String, default: '' },
  links: { type: Array, default: () => [] }
});
const emit = defineEmits(['navigate']);

const layout = computed(() => getLayoutForCategory(props.category));

const title = computed(() => props.data.name || props.data.index || 'Dettaglio');

// 1) Header meta: mostra in ordine layout.fieldOrder (se presente) solo i campi primitivi
const headerMeta = computed(() => {
  const keys = layout.value?.fieldOrder ?? ['level','type','size','challenge_rating','hit_points','armor_class','school','range','duration'];
  const out = [];
  for (const k of keys) {
    const v = props.data[k];
    if (isPrimitive(v) && !isEmpty(v)) {
      out.push({ key: k, label: labelFor(k), value: v });
    }
  }
  return out;
});

// 2) Descrizioni
const mdBlocks = computed(() => {
  const blocks = [];
  for (const [k, v] of Object.entries(props.data)) {
    if (!/desc|description|higher_level/i.test(k)) continue;
    if (typeof v === 'string' && v.trim()) blocks.push({ label: labelFor(k), html: mdToHtml(v.trim()) });
    if (Array.isArray(v)) {
      for (const s of v) if (typeof s === 'string' && s.trim()) blocks.push({ label: labelFor(k), html: mdToHtml(s.trim()) });
    }
  }
  return blocks;
});

// 3) Key-Value: primitivi non già usati, non nascosti
const kvPairs = computed(() => {
  const used = new Set(['name','index','url']);
  headerMeta.value.forEach(m => used.add(m.key));
  for (const [k] of Object.entries(props.data)) {
    if (/desc|description/i.test(k)) used.add(k);
  }
  const rows = [];
  for (const [k, v] of Object.entries(props.data)) {
    if (used.has(k)) continue;
    if (shouldHideKey(k)) continue;
    if (isPrimitive(v) && !isEmpty(v)) {
      rows.push({ key: k, label: labelFor(k), value: v });
    }
  }
  // Ordina alfabeticamente per stabilità
  rows.sort((a,b) => a.label.localeCompare(b.label));
  return rows;
});

// 4) Liste (array)
const arraySections = computed(() => {
  const out = [];
  for (const [k, v] of Object.entries(props.data)) {
    if (!Array.isArray(v) || v.length === 0) continue;
    if (shouldHideKey(k)) continue;

    const lbl = labelFor(k);
    if (v.every(isPrimitive)) {
      out.push({ label: lbl, kind: 'primitive', values: v });
      continue;
    }
    if (v.every(isNamedObject)) {
      out.push({ label: lbl, kind: 'objects-named', values: v.map(x => ({ ...x })) });
      continue;
    }
    // Tabella generica
    const columns = pickColumns(v[0]);
    out.push({ label: lbl, kind: 'objects-table', values: v.map(x => ({ ...x })), columns });
  }
  return out;
});

// 5) Oggetti annidati
const objectSections = computed(() => {
  const out = [];
  for (const [k, v] of Object.entries(props.data)) {
    if (!v || Array.isArray(v) || typeof v !== 'object') continue;
    if (shouldHideKey(k)) continue;

    const lbl = labelFor(k);
    if (isNamedObject(v)) {
      out.push({ label: lbl, kind: 'ref', value: v });
      continue;
    }
    const rows = [];
    for (const [ik, iv] of Object.entries(v)) {
      rows.push({ key: ik, label: labelFor(ik), value: iv });
    }
    out.push({ label: lbl, kind: 'object-kv', rows });
  }
  return out;
});

function isPrimitive(x) {
  return ['string','number','boolean'].includes(typeof x);
}
function isEmpty(x) {
  return x === '' || x === null || x === undefined;
}
function isNamedObject(x) {
  return x && typeof x === 'object' && (x.name || x.index || x.url);
}
function pickColumns(obj) {
  const keys = Object.keys(obj || {});
  return keys
    .filter(k => k !== 'url' && k !== 'index' && typeof obj[k] !== 'object' && !Array.isArray(obj[k]))
    .slice(0, 6);
}
function labelFor(key) {
  return aliasFor(key) || humanizeKey(key);
}
function humanizeKey(k) {
  return String(k)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, s => s.toUpperCase());
}
function formatValue(key, val) {
  if (typeof val === 'boolean') return val ? 'Sì' : 'No';
  return String(val);
}
function formatCell(val) {
  if (val == null) return '';
  if (typeof val === 'boolean') return val ? 'Sì' : 'No';
  if (typeof val === 'object') return '—';
  return String(val);
}
function onNavigate(url) {
  if (!url) return;
  emit('navigate', url);
}
function pretty(v) {
  return JSON.stringify(v, null, 2);
}
</script>

<style scoped>
.card { border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; background: rgba(127,127,127,0.05); }
.header .title { margin: 0 0 6px 0; }
.meta { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.meta-item .k { color: #666; margin-right: 6px; }
.meta-item .v { font-weight: 600; }
.kv-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 8px 12px; }
.kv .k { color: #666; }
.kv .v { font-weight: 500; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: rgba(127,127,127,0.2); padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.table-wrap { overflow: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { text-align: left; border-bottom: 1px solid #ddd; padding: 6px; font-size: 13px; }
.table tr.clickable { cursor: pointer; }
.desc p { margin: 0 0 8px 0; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.link { background: none; border: none; padding: 6px 8px; text-align: left; cursor: pointer; border-radius: 6px; width: 100%; }
.link:hover { background: rgba(127,127,127,0.15); }
.muted { color: #888; margin-left: 8px; }
.md :where(h1,h2,h3){ margin: 0.5em 0 0.25em; }
.md p{ margin: 0 0 0.75em; line-height: 1.5; }
.md ul, .md ol{ margin: 0.5em 0 0.75em 1.25em; }
.md li{ margin: 0.25em 0; }
.md a{ color: #2a6df4; text-decoration: underline; }
.md code{ background: rgba(127,127,127,0.15); padding: 0.1em 0.3em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.md pre{ background: rgba(127,127,127,0.15); padding: 8px; border-radius: 6px; overflow: auto; }
.md blockquote{ border-left: 3px solid #ccc; margin: 0.5em 0; padding: 0.1em 0 0.1em 0.8em; color: #555; }
.json { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; background: rgba(127,127,127,0.08); padding: 8px; border-radius: 6px; }
</style>