<script setup lang="ts">
const nav = [
  { to: '/cartes', ix: '01', label: 'Cartes', icon: '◎' },
  { to: '/quetes', ix: '02', label: 'Quêtes', icon: '✓' },
  { to: '/items', ix: '03', label: 'Items', icon: '▤' },
  { to: '/hideout', ix: '04', label: 'Hideout', icon: '⌂' },
];
</script>

<template>
  <nav class="side">
    <RouterLink v-for="n in nav" :key="n.to" :to="n.to" class="navbtn" active-class="on">
      <span class="ic">{{ n.icon }}</span>
      <span class="lbl"><span class="ix">{{ n.ix }}</span>{{ n.label }}</span>
    </RouterLink>
    <div class="foot">
      Données : API GraphQL<br />tarkov.dev (open source).<br />Cartes : assets.tarkov.dev.
    </div>
  </nav>
</template>

<style scoped>
.side { flex: 0 0 206px; border-right: 1px solid var(--line); background: #0e110a; padding: 14px 10px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.navbtn { display: flex; align-items: center; gap: 11px; text-align: left; cursor: pointer; border-left: 2px solid transparent; color: var(--muted); font-family: var(--cond); font-weight: 600; font-size: 15px; letter-spacing: 0.5px; text-transform: uppercase; padding: 11px 12px; border-radius: 2px; transition: 0.14s var(--tap); }
.navbtn .ic { font-size: 15px; width: 18px; text-align: center; color: var(--dim); transition: 0.14s; }
.navbtn .ix { font-family: var(--mono); font-size: 10px; color: var(--dim); margin-right: 9px; }
.navbtn:hover { background: #141810; color: var(--txt); }
.navbtn.on { background: linear-gradient(90deg, rgba(200, 224, 33, 0.12), transparent); border-left-color: var(--acid); color: var(--acid); }
.navbtn.on .ic { color: var(--acid); }
.foot { margin-top: auto; font-family: var(--mono); font-size: 9px; color: var(--dim); line-height: 1.7; padding: 10px 12px; border-top: 1px solid var(--line); }
@media (max-width: 720px) {
  .side { flex-direction: row; flex: 0 0 auto; overflow-x: auto; padding: 8px; }
  .navbtn { border-left: 0; border-bottom: 2px solid transparent; white-space: nowrap; }
  .navbtn.on { border-bottom-color: var(--acid); }
  .foot { display: none; }
}
</style>
