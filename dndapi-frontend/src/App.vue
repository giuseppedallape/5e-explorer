<template>
  <div class="wrap">
    <header>
      <h1>5e SRD Explorer</h1>
      <div class="controls">
        <label>Root endpoint:</label>
        <input v-model="rootPath" @keyup.enter="loadRoot" placeholder="/api/2014/" />
        <button @click="loadRoot" :disabled="loading.root">Carica</button>
        <span v-if="error.root" class="err">{{ error.root }}</span>
      </div>
    </header>

    <main class="grid">
      <!-- Colonna sinistra: Raccolte -->
      <section class="col">
        <h2>Raccolte</h2>
        <div v-if="loading.root">Caricamento indice...</div>
        <div v-else-if="error.root" class="err">{{ error.root }}</div>
        <ul class="list" v-else>
          <li v-for="c in categories" :key="c.key">
            <button class="link" @click="selectCategory(c)">
              {{ c.label }}
            </button>
          </li>
        </ul>
      </section>

      <!-- Colonna centrale: Lista elementi -->
      <section class="col">
        <h2 v-if="currentCategory">Lista: {{ currentCategory.label ?? currentCategory.key }}</h2>
        <p v-else>Seleziona una raccolta per vedere gli elementi.</p>

        <div v-if="currentCategory">
          <input v-model="search" placeholder="Filtra per nome..." />
          <div v-if="loading.list">Caricamento lista...</div>
          <div v-else-if="error.list" class="err">{{ error.list }}</div>
          <ul class="list" v-else>
            <li v-for="item in filteredItems" :key="item.url || item.name">
              <button class="link" @click="selectItem(item)">
                {{ item.name ?? item.index ?? item.url }}
              </button>
            </li>
          </ul>
        </div>
      </section>

      <!-- Colonna destra: Dettaglio -->
      <section class="col">
        <h2>Dettaglio</h2>

        <div v-if="loading.detail">Caricamento dettaglio...</div>
        <div v-else-if="error.detail" class="err">{{ error.detail }}</div>

        <DetailView
          v-else-if="currentItem"
          :data="currentItem"
          :category="currentCategory?.key"
          :links="links"
          @navigate="navigate"
        />

        <p v-else>Seleziona un elemento per vedere i dettagli.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DetailView from './components/DetailView.vue';
import { categoryLabelFor } from './i18n/categories.js';

const rootPath = ref('/api/2014/');
const rootData = ref(null);

const categories = computed(() => {
  if (!rootData.value) return [];
  return Object.entries(rootData.value).map(([key, url]) => ({
    key,
    url,
    label: categoryLabelFor(key)
  }));
});

const currentCategory = ref(null);
const items = ref([]);
const search = ref('');

const currentItem = ref(null);
const links = ref([]);

const loading = ref({ root: false, list: false, detail: false });
const error = ref({ root: '', list: '', detail: '' });

const filteredItems = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return items.value;
  return items.value.filter(it =>
    (it.name || '').toLowerCase().includes(q) ||
    (it.url || '').toLowerCase().includes(q)
  );
});

function sameOriginify(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname === '5e-bits.github.io') {
      return u.pathname + u.search;
    }
  } catch {}
  return url;
}

async function fetchJson(url) {
  const normalized = sameOriginify(url);
  const res = await fetch(normalized, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${txt}`.trim());
  }
  return res.json();
}

async function loadRoot() {
  loading.value.root = true;
  error.value.root = '';
  currentCategory.value = null;
  currentItem.value = null;
  items.value = [];
  links.value = [];
  try {
    let path = rootPath.value.trim();
    if (!path.endsWith('/')) path += '/';
    rootData.value = await fetchJson(path);
  } catch (e) {
    error.value.root = e.message;
    rootData.value = null;
  } finally {
    loading.value.root = false;
  }
}

async function selectCategory(c) {
  currentCategory.value = c;
  loading.value.list = true;
  error.value.list = '';
  items.value = [];
  currentItem.value = null;
  links.value = [];
  try {
    const data = await fetchJson(c.url);
    items.value = normalizeList(data);
  } catch (e) {
    error.value.list = e.message;
  } finally {
    loading.value.list = false;
  }
}

function normalizeList(data) {
  if (Array.isArray(data)) return data.map(toListItem);

  if (data && typeof data === 'object') {
    if (Array.isArray(data.results)) return data.results.map(toListItem);
    const pairs = Object.entries(data)
      .filter(([k, v]) => typeof v === 'string' && v.startsWith('/api/'));
    if (pairs.length) return pairs.map(([name, url]) => ({ name, url }));
  }
  return [];
}

function toListItem(x) {
  if (x && typeof x === 'object') {
    if (x.url) return { name: x.name ?? x.index ?? x.url, url: x.url };
    if (x.index && currentCategory.value?.url) {
      const base = currentCategory.value.url.replace(/\/$/, '');
      return { name: x.name ?? x.index, url: `${base}/${x.index}` };
    }
  }
  return { name: String(x), url: '' };
}

async function selectItem(item) {
  if (!item?.url) return;
  loading.value.detail = true;
  error.value.detail = '';
  currentItem.value = null;
  links.value = [];
  try {
    const data = await fetchJson(item.url);
    currentItem.value = data;
    links.value = extractLinks(data);
  } catch (e) {
    error.value.detail = e.message;
  } finally {
    loading.value.detail = false;
  }
}

function extractLinks(obj) {
  const out = [];
  const seen = new Set();

  function walk(val, hint) {
    if (!val) return;
    if (Array.isArray(val)) return val.forEach(v => walk(v, hint));
    if (typeof val === 'object') {
      if (val.url && typeof val.url === 'string' && val.url.includes('/api/')) {
        const label = val.name ?? val.index ?? hint ?? val.url;
        if (!seen.has(val.url)) {
          seen.add(val.url);
          out.push({ label, url: val.url });
        }
      }
      for (const [k, v] of Object.entries(val)) walk(v, k);
      return;
    }
    if (typeof val === 'string' && val.includes('/api/')) {
      if (!seen.has(val)) {
        seen.add(val);
        out.push({ label: hint ?? val, url: val });
      }
    }
  }

  walk(obj);
  return out;
}

function navigate(url) {
  selectItem({ url, name: url });
}

function pretty(v) {
  return JSON.stringify(v, null, 2);
}

loadRoot();
</script>

<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body, #app { height: 100%; margin: 0; }
.wrap { display: flex; flex-direction: column; min-height: 100%; }
header { padding: 12px 16px; border-bottom: 1px solid #ddd; }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.grid { display: grid; grid-template-columns: 1fr 1.5fr 1.5fr; gap: 12px; padding: 12px; flex: 1; min-height: 0; }
.col { border: 1px solid #eee; padding: 8px; overflow: auto; border-radius: 6px; }
.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.link { background: none; border: none; padding: 6px 8px; text-align: left; cursor: pointer; border-radius: 6px; width: 100%; }
.link:hover { background: rgba(127,127,127,0.15); }
input[type="text"], input:not([type]) { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; width: 100%; }
.err { color: #d00; }
.muted { color: #888; margin-left: 8px; }
</style>