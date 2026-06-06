<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';

const props = defineProps<{ modelValue: boolean; title?: string; size?: 'sm' | 'md' }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

function close() { emit('update:modelValue', false); }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

watch(
  () => props.modelValue,
  (open) => {
    if (open) window.addEventListener('keydown', onKey);
    else window.removeEventListener('keydown', onKey);
  },
);
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="backdrop" @click.self="close">
        <div class="modal" :class="size || 'sm'" role="dialog" aria-modal="true">
          <header v-if="title || $slots.header" class="m-head">
            <slot name="header"><h3 class="m-title">{{ title }}</h3></slot>
            <button class="x" aria-label="Fermer" @click="close">✕</button>
          </header>
          <div class="m-body"><slot /></div>
          <footer v-if="$slots.footer" class="m-foot"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(8, 9, 6, 0.62);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 24px;
}
.modal {
  width: 100%;
  background: linear-gradient(180deg, var(--raised), var(--surface));
  border: 1px solid var(--hairline-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.sm { max-width: 440px; }
.md { max-width: 640px; }
.m-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--hairline); }
.m-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 0; }
.x { background: transparent; border: none; color: var(--ink-3); cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: var(--r-xs); }
.x:hover { color: var(--ink); background: var(--surface-2); }
.m-body { padding: 18px; }
.m-foot { padding: 14px 18px; border-top: 1px solid var(--hairline); display: flex; gap: 10px; justify-content: flex-end; }

.modal-enter-active, .modal-leave-active { transition: opacity var(--t2) var(--ease); }
.modal-enter-active .modal { transition: transform var(--t2) var(--ease-out); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal { transform: translateY(12px) scale(0.98); }
</style>
