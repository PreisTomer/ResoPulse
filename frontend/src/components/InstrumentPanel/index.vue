<template>
  <div class="inst-panel">
    <!-- Top grid: Setup + Meter -->
    <div class="inst-panel__top-grid">
      <CuvetteSetup class="inst-panel__card" />
      <ImpedanceMeter class="inst-panel__card" />
    </div>

    <!-- Load Impedance Monitor (full width) -->
    <div class="inst-panel__card">
      <LoadMonitor />
    </div>

    <!-- Middle grid: Field corrector + Hardware input -->
    <div class="inst-panel__mid-grid">
      <FieldCorrector class="inst-panel__card" />
      <HardwareInput class="inst-panel__card" />
    </div>

    <!-- Trend (full width) -->
    <div class="inst-panel__card inst-panel__card--trend">
      <ImpedanceTrend />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CuvetteSetup    from './CuvetteSetup.vue'
import ImpedanceMeter  from './ImpedanceMeter.vue'
import FieldCorrector  from './FieldCorrector.vue'
import HardwareInput   from './HardwareInput.vue'
import ImpedanceTrend  from './ImpedanceTrend.vue'
import LoadMonitor     from './LoadMonitor.vue'

export default defineComponent({
  name: 'InstrumentPanel',
  components: { CuvetteSetup, ImpedanceMeter, FieldCorrector, HardwareInput, ImpedanceTrend, LoadMonitor },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.inst-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  &__top-grid,
  &__mid-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }
  }

  &__card {
    @include surface-card(var(--radius-lg, var(--radius)), 1.25rem);

    &--trend {
      padding: 1.25rem;
    }
  }
}
</style>
