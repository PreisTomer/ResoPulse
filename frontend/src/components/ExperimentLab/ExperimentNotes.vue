<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div v-show="open" class="experiment__notes-panel" @click.stop>
    <div class="experiment__notes-field">
      <label class="experiment__notes-label">{{ $t('exp.notesLabelSample') }}</label>
      <input
        class="experiment__notes-input"
        type="text"
        :placeholder="$t('exp.notesSamplePlaceholder')"
        :value="expStore.sampleDescription"
        @input="expStore.setSampleDescription(($event.target as HTMLInputElement).value)"
        spellcheck="false"
      />
    </div>
    <div class="experiment__notes-field experiment__notes-field--grow">
      <label class="experiment__notes-label">{{ $t('exp.notesLabelNotes') }}</label>
      <textarea
        class="experiment__notes-textarea"
        :placeholder="$t('exp.notesNotesPlaceholder')"
        :value="expStore.sessionNotes"
        @input="expStore.setSessionNotes(($event.target as HTMLTextAreaElement).value)"
        rows="2"
        spellcheck="false"
      ></textarea>
    </div>
    <p class="experiment__notes-hint">{{ $t('exp.notesHint') }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { useExperimentStore } from '@/stores/experimentStore'

export default defineComponent({
  name: 'ExperimentNotes',

  props: {
    open: { type: Boolean, default: false },
  },

  computed: {
    ...mapStores(useExperimentStore),
    expStore() { return useExperimentStore() },
  },
})
</script>

<style lang="scss" scoped>
.experiment__notes-panel {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 0.65rem 1.75rem;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.experiment__notes-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 220px;

  &--grow { flex: 1; }
}

.experiment__notes-label {
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

.experiment__notes-input,
.experiment__notes-textarea {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  padding: 0.3rem 0.6rem;
  outline: none;
  transition: border-color var(--tr-fast);
  resize: none;

  &::placeholder { color: var(--color-text-muted); opacity: var(--op-muted); }
  &:focus { border-color: var(--color-primary); }
}

.experiment__notes-textarea { line-height: 1.5; }

.experiment__notes-hint {
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: var(--op-muted);
  align-self: flex-end;
  white-space: nowrap;
  margin-top: auto;
}
</style>
