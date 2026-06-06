<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

const props = withDefaults(
  defineProps<{ index?: number; step?: number; tag?: string; once?: boolean }>(),
  { index: 0, step: 55, once: true },
);

const el = ref<HTMLElement | null>(null);
let obs: IntersectionObserver | null = null;

onMounted(() => {
  if (!el.value) return;
  obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in');
          if (props.once) obs?.unobserve(e.target);
        } else if (!props.once) {
          (e.target as HTMLElement).classList.remove('in');
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
  );
  obs.observe(el.value);
});
onBeforeUnmount(() => obs?.disconnect());
</script>

<template>
  <component :is="tag || 'div'" ref="el" class="reveal" :style="{ '--reveal-delay': index * step + 'ms' }">
    <slot />
  </component>
</template>
