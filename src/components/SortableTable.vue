<script setup lang="ts">
import { ref, computed } from 'vue';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortValue?: (row: Record<string, any>) => number | string;
}

const props = defineProps<{
  columns: Column[];
  rows: Record<string, any>[];
  initialKey?: string;
  initialDir?: 1 | -1;
}>();

const sortKey = ref(props.initialKey ?? props.columns[0]?.key ?? '');
const sortDir = ref<1 | -1>(props.initialDir ?? -1);

function colByKey(key: string) {
  return props.columns.find((c) => c.key === key);
}

function setSort(col: Column) {
  if (col.sortable === false) return;
  if (sortKey.value === col.key) sortDir.value = (sortDir.value * -1) as 1 | -1;
  else {
    sortKey.value = col.key;
    sortDir.value = -1;
  }
}

const sorted = computed(() => {
  const col = colByKey(sortKey.value);
  if (!col) return props.rows;
  const val = (r: Record<string, any>) => (col.sortValue ? col.sortValue(r) : r[col.key]);
  return [...props.rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === 'string' || typeof vb === 'string') {
      return sortDir.value * String(va ?? '').localeCompare(String(vb ?? ''));
    }
    return sortDir.value * (((va as number) ?? 0) - ((vb as number) ?? 0));
  });
});
</script>

<template>
  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[col.align === 'right' ? 'r' : col.align === 'center' ? 'c' : '', { sortable: col.sortable !== false }]"
            @click="setSort(col)"
          >
            {{ col.label }}
            <span v-if="sortKey === col.key" class="arr">{{ sortDir === -1 ? '▾' : '▴' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in sorted" :key="row.id ?? i">
          <td
            v-for="col in columns"
            :key="col.key"
            :class="col.align === 'right' ? 'r' : col.align === 'center' ? 'c' : ''"
          >
            <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">{{ row[col.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tbl-wrap { overflow: auto; border: 1px solid var(--line); border-radius: var(--radius); max-height: 64vh; }
table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
thead th { position: sticky; top: 0; z-index: 2; background: #161a10; font-family: var(--mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--line2); white-space: nowrap; }
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: var(--txt); }
thead th.r, td.r { text-align: right; font-family: var(--mono); }
thead th.c, td.c { text-align: center; }
.arr { color: var(--acid); margin-left: 3px; }
tbody td { padding: 7px 10px; border-bottom: 1px solid #1c2114; vertical-align: middle; }
tbody tr:hover { background: #14180e; }
</style>
