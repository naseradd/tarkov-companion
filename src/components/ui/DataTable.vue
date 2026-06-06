<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/game';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortValue?: (row: Record<string, any>) => number | string;
  width?: string;
}

const props = defineProps<{
  columns: Column[];
  rows: Record<string, any>[];
  initialKey?: string;
  initialDir?: 1 | -1;
}>();

const game = useGameStore();
const sortKey = ref(props.initialKey ?? props.columns[0]?.key ?? '');
const sortDir = ref<1 | -1>(props.initialDir ?? -1);

const colByKey = (key: string) => props.columns.find((c) => c.key === key);

function setSort(col: Column) {
  if (col.sortable === false) return;
  if (sortKey.value === col.key) sortDir.value = (sortDir.value * -1) as 1 | -1;
  else { sortKey.value = col.key; sortDir.value = -1; }
}

const sorted = computed(() => {
  const col = colByKey(sortKey.value);
  if (!col) return props.rows;
  const val = (r: Record<string, any>) => (col.sortValue ? col.sortValue(r) : r[col.key]);
  return [...props.rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === 'string' || typeof vb === 'string') return sortDir.value * String(va ?? '').localeCompare(String(vb ?? ''));
    return sortDir.value * (((va as number) ?? 0) - ((vb as number) ?? 0));
  });
});

const alignClass = (a?: string) => (a === 'right' ? 'r' : a === 'center' ? 'c' : '');
</script>

<template>
  <div class="tbl-wrap" :class="game.density">
    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[alignClass(col.align), { sortable: col.sortable !== false, active: sortKey === col.key }]"
            :style="col.width ? { width: col.width } : undefined"
            @click="setSort(col)"
          >
            <span class="th-in">
              {{ col.label }}
              <span v-if="sortKey === col.key" class="arr">{{ sortDir === -1 ? '▾' : '▴' }}</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in sorted" :key="row.id ?? i">
          <td v-for="col in columns" :key="col.key" :class="alignClass(col.align)">
            <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">{{ row[col.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tbl-wrap {
  overflow: auto;
  border: 1px solid var(--hairline);
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  max-height: 70vh;
}
table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 14px; }
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--raised);
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: left;
  padding: 11px 14px;
  border-bottom: 1px solid var(--hairline-2);
  white-space: nowrap;
  user-select: none;
}
thead th:first-child { border-top-left-radius: var(--r-md); }
thead th:last-child { border-top-right-radius: var(--r-md); }
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: var(--ink); }
thead th.active { color: var(--accent); }
.th-in { display: inline-flex; align-items: center; gap: 4px; }
.arr { color: var(--accent); }
th.r, td.r { text-align: right; }
th.c, td.c { text-align: center; }
td.r { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

tbody td { padding: 10px 14px; border-bottom: 1px solid var(--hairline); vertical-align: middle; color: var(--ink); transition: background var(--t1) var(--ease); }
tbody tr:last-child td { border-bottom: none; }
tbody tr { transition: background var(--t1) var(--ease); }
tbody tr:hover td { background: var(--surface-2); }

.condensed tbody td { padding: 6px 14px; }
.condensed { font-size: 13px; }
.relaxed tbody td { padding: 15px 14px; }
</style>
