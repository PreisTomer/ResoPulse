<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    icon: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      default: null,
    },
  },

  emits: {
    click: () => true,
  },

  methods: {
    handleClick() {
      this.$emit('click')
    },
  },
})
</script>

<template>
  <div class="feature" @click="handleClick">
    <div class="feature-icon">{{ icon }}</div>
    <div class="feature-title">{{ title }}</div>
    <div class="feature-desc">{{ description }}</div>
  </div>
</template>

<style scoped>
.feature {
  padding: 1.5rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-top: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.feature:hover {
  border-color: var(--color-primary);
  border-top-color: var(--color-primary);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.08);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 1.4rem;
  color: var(--color-primary);
  margin-bottom: 0.85rem;
}

.feature-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-heading);
  margin-bottom: 0.5rem;
}

.feature-desc {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  line-height: 1.65;
}
</style>
