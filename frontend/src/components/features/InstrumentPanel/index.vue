<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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

    <!-- |Z(f)| Bode plot (full width) -->
    <div class="inst-panel__card">
      <ImpedanceBodePlot />
    </div>

    <!-- Trend (full width) -->
    <div class="inst-panel__card inst-panel__card--trend">
      <ImpedanceTrend />
    </div>

    <!-- Sonification toggle -->
    <div id="hl-sonif-card" class="inst-panel__card inst-panel__card--sonif">
      <SonificationToggle />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import CuvetteSetup from "./components/CuvetteSetup.vue";
import ImpedanceMeter from "./components/ImpedanceMeter.vue";
import ImpedanceBodePlot from "./components/ImpedanceBodePlot.vue";
import FieldCorrector from "./components/FieldCorrector.vue";
import HardwareInput from "./components/HardwareInput.vue";
import ImpedanceTrend from "./components/ImpedanceTrend.vue";
import LoadMonitor from "./components/LoadMonitor.vue";
import SonificationToggle from "./components/SonificationToggle.vue";
export default defineComponent({
  name: "InstrumentPanel",
  components: {
    CuvetteSetup,
    ImpedanceMeter,
    ImpedanceBodePlot,
    FieldCorrector,
    HardwareInput,
    ImpedanceTrend,
    LoadMonitor,
    SonificationToggle,
  },
});
</script>

<style lang="scss" scoped>
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

    &--sonif {
      padding: 1rem 1.25rem;
    }
  }
}
</style>
