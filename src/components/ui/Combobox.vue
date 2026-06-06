<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

export interface Option {
  value: string | number;
  label: string;
  hint?: string;
  icon?: string | null;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    options: Option[];
    placeholder?: string;
    searchable?: boolean;
    size?: 'sm' | 'md';
  }>(),
  { placeholder: 'Choisir…', size: 'md' },
);
const emit = defineEmits<{ (e: 'update:modelValue', v: string | number | null): void }>();

const open = ref(false);
const query = ref('');
const active = ref(0);
const root = ref<HTMLElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);

const showSearch = computed(() => props.searchable || props.options.length > 12);

const selected = computed(() => props.options.find((o) => String(o.value) === String(props.modelValue)) ?? null);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
});

function toggle() {
  open.value ? closeMenu() : openMenu();
}
async function openMenu() {
  open.value = true;
  query.value = '';
  active.value = Math.max(0, filtered.value.findIndex((o) => String(o.value) === String(props.modelValue)));
  await nextTick();
  if (showSearch.value) searchEl.value?.focus();
}
function closeMenu() {
  open.value = false;
}
function pick(o: Option) {
  emit('update:modelValue', o.value);
  closeMenu();
}
function onKey(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); openMenu(); }
    return;
  }
  if (e.key === 'Escape') { closeMenu(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); active.value = Math.min(filtered.value.length - 1, active.value + 1); scrollActive(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(0, active.value - 1); scrollActive(); }
  else if (e.key === 'Enter') { e.preventDefault(); const o = filtered.value[active.value]; if (o) pick(o); }
}
async function scrollActive() {
  await nextTick();
  listEl.value?.querySelector<HTMLElement>('.opt.active')?.scrollIntoView({ block: 'nearest' });
}
watch(query, () => { active.value = 0; });

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) closeMenu();
}
watch(open, (o) => {
  if (o) document.addEventListener('mousedown', onDocClick);
  else document.removeEventListener('mousedown', onDocClick);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <div ref="root" class="cb" :class="size" @keydown="onKey">
    <button
      type="button"
      class="trigger"
      :class="{ open }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
    >
      <img v-if="selected?.icon" :src="selected.icon" class="ic" alt="" />
      <span class="val" :class="{ ph: !selected }">{{ selected?.label ?? placeholder }}</span>
      <span v-if="selected?.hint" class="hint num">{{ selected.hint }}</span>
      <span class="chev" :class="{ flip: open }">▾</span>
    </button>

    <Transition name="pop">
      <div v-if="open" class="popover" role="listbox">
        <div v-if="showSearch" class="search">
          <input ref="searchEl" v-model="query" class="search-in" placeholder="Rechercher…" />
        </div>
        <div ref="listEl" class="list">
          <button
            v-for="(o, i) in filtered"
            :key="String(o.value)"
            type="button"
            role="option"
            :aria-selected="String(o.value) === String(modelValue)"
            class="opt"
            :class="{ active: i === active, sel: String(o.value) === String(modelValue) }"
            @click="pick(o)"
            @mousemove="active = i"
          >
            <img v-if="o.icon" :src="o.icon" class="ic" alt="" />
            <span class="o-lbl">{{ o.label }}</span>
            <span v-if="o.hint" class="o-hint num">{{ o.hint }}</span>
            <span v-if="String(o.value) === String(modelValue)" class="check">✓</span>
          </button>
          <p v-if="!filtered.length" class="none">Aucun résultat</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cb { position: relative; }
.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--canvas);
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-sm);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--t1) var(--ease), box-shadow var(--t1) var(--ease);
}
.md .trigger { padding: 10px 12px; font-size: 14px; }
.sm .trigger { padding: 7px 11px; font-size: 13px; }
.trigger:hover { border-color: var(--hairline-2); }
.trigger.open { border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-soft); }
.val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.val.ph { color: var(--ink-3); }
.hint { color: var(--amber); font-size: 12px; }
.chev { color: var(--ink-3); font-size: 11px; transition: transform var(--t1) var(--ease); }
.chev.flip { transform: rotate(180deg); color: var(--accent); }
.ic { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; flex: 0 0 auto; }

.popover {
  position: absolute;
  z-index: 60;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--popover);
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.search { padding: 8px; border-bottom: 1px solid var(--hairline); }
.search-in {
  width: 100%;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  color: var(--ink);
  padding: 8px 10px;
  font-size: 13.5px;
}
.search-in:focus { outline: none; border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-soft); }
.list { max-height: 280px; overflow-y: auto; padding: 6px; }
.opt {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  background: transparent;
  border: none;
  border-radius: var(--r-sm);
  color: var(--ink-2);
  cursor: pointer;
  padding: 9px 10px;
  font-size: 13.5px;
  text-align: left;
  transition: background var(--t1) var(--ease);
}
.opt.active { background: var(--surface-2); color: var(--ink); }
.opt.sel { color: var(--accent); }
.o-lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.o-hint { color: var(--amber); font-size: 12px; }
.check { color: var(--accent); font-size: 12px; }
.none { color: var(--ink-3); font-size: 13px; text-align: center; padding: 16px; margin: 0; }

.pop-enter-active { transition: opacity var(--t1) var(--ease), transform var(--t1) var(--ease-out); }
.pop-leave-active { transition: opacity 0.12s var(--ease); }
.pop-enter-from { opacity: 0; transform: translateY(-6px); }
.pop-leave-to { opacity: 0; }
</style>
