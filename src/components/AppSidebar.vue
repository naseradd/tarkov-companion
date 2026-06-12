<script setup lang="ts">
const nav = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/raid', label: 'Raid', icon: '⊳' },
  { to: '/trame', label: 'Trame', icon: '◈' },
  { to: '/cartes', label: 'Cartes', icon: '◎' },
  { to: '/quetes', label: 'Quêtes', icon: '✓' },
  { to: '/marchands', label: 'Marchands', icon: '⇄' },
  { to: '/loot', label: 'Loot & Éco', icon: '₽' },
  { to: '/gear', label: 'Gear', icon: '⌖' },
  { to: '/hideout', label: 'Hideout', icon: '⌂' },
  { to: '/config', label: 'Config', icon: '⚙' },
];
</script>

<template>
  <nav class="side">
    <RouterLink
      v-for="n in nav"
      :key="n.to"
      :to="n.to"
      class="navbtn"
      active-class="on"
      :exact-active-class="n.end ? 'on' : ''"
    >
      <span class="ic">{{ n.icon }}</span>
      <span class="lbl">{{ n.label }}</span>
    </RouterLink>
    <div class="foot">
      <span class="kicker">Data</span>
      tarkov.dev · GraphQL open source<br />Cartes : assets.tarkov.dev
    </div>
  </nav>
</template>

<style scoped>
.side {
  flex: 0 0 218px;
  border-right: 1px solid var(--hairline);
  background: var(--surface);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.navbtn {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  color: var(--ink-2);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 15px;
  padding: 11px 14px;
  border-radius: var(--r-sm);
  transition: all var(--t1) var(--ease);
}
.navbtn .ic { font-size: 16px; width: 20px; text-align: center; color: var(--ink-3); transition: color var(--t1) var(--ease); }
.navbtn:hover { background: var(--surface-2); color: var(--ink); }
.navbtn:hover .ic { color: var(--ink-2); }
.navbtn.on {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--accent-dim);
}
.navbtn.on .ic { color: var(--accent); }
.foot {
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--ink-3);
  line-height: 1.7;
  padding: 14px;
}
.foot .kicker { display: block; margin-bottom: 4px; }
@media (max-width: 720px) {
  .side { flex: 0 0 auto; flex-direction: row; overflow-x: auto; padding: 8px 10px; gap: 6px; border-right: none; border-bottom: 1px solid var(--hairline); }
  .navbtn { padding: 8px 13px; white-space: nowrap; }
  .navbtn .lbl { font-size: 14px; }
  .foot { display: none; }
}
</style>
