<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue';
import AppSidebar from '@/components/AppSidebar.vue';
</script>

<template>
  <div class="shell">
    <AppHeader />
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
  </div>
</template>

<style scoped>
.shell { display: flex; flex-direction: column; height: 100%; }
.body { display: flex; flex: 1; min-height: 0; }
.content { flex: 1; overflow-y: auto; padding: 22px 26px 60px; }
@media (max-width: 720px) {
  .body { flex-direction: column; }
  .content { padding: 18px 14px 50px; }
}
</style>
