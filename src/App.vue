<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import AppHeader from '@/components/AppHeader.vue';
import AppSidebar from '@/components/AppSidebar.vue';
import CommandPalette from '@/components/CommandPalette.vue';

const paletteOpen = ref(false);

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    paletteOpen.value = true;
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="shell">
    <AppHeader @open-palette="paletteOpen = true" />
    <div class="body">
      <AppSidebar />
      <main class="content">
        <RouterView v-slot="{ Component }">
          <Transition name="view" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
    <CommandPalette v-model="paletteOpen" />
  </div>
</template>

<style scoped>
.shell { display: flex; flex-direction: column; height: 100%; position: relative; z-index: 1; }
.body { display: flex; flex: 1; min-height: 0; }
.content { flex: 1; overflow-y: auto; padding: 26px 30px 72px; }
@media (max-width: 720px) {
  .body { flex-direction: column; }
  .content { padding: 18px 14px 56px; }
}
</style>
