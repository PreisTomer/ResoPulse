<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section id="physics" class="protocol__section">
    <div class="protocol__section-header">
      <h2 class="protocol__section-title" v-html="$t('protocol.physics.title')"></h2>
      <div class="protocol__expand-controls">
        <button class="protocol__expand-btn" @click="expandAll">{{ $t('protocol.physics.expandAll') }}</button>
        <span class="protocol__expand-sep" aria-hidden="true">·</span>
        <button class="protocol__expand-btn" @click="collapseAll">{{ $t('protocol.physics.collapseAll') }}</button>
      </div>
    </div>

    <ProtocolSubsection
      anchor-id="schwan"
      :title-html="$t('protocol.physics.schwan.title')"
      :tooltip="$t('protocol.physics.schwan.tip')"
      :summary="$t('protocol.physics.schwan.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.schwan.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.schwan.eqMain')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub2')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub3')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.schwan.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.schwan.p2')"></p>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.schwan.thSym')"></th>
            <th v-html="$t('protocol.physics.schwan.thParam')"></th>
            <th v-html="$t('protocol.physics.schwan.thUnit')"></th>
            <th v-html="$t('protocol.physics.schwan.thNote')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in schwanParams" :key="row.sym">
            <td class="protocol__mono" v-html="row.sym"></td>
            <td v-html="row.param"></td>
            <td class="protocol__mono" v-html="row.unit"></td>
            <td v-html="row.note"></td>
          </tr>
        </tbody>
      </table>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="thermal"
      :title-html="$t('protocol.physics.thermal.title')"
      :tooltip="$t('protocol.physics.thermal.tip')"
      :summary="$t('protocol.physics.thermal.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.thermal.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.thermal.eqSar')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqSarSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqSarSub2')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__eq-main" v-html="$t('protocol.physics.thermal.eqTss')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqTssSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqTssSub2')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.thermal.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.thermal.p2')"></p>
      <div class="protocol__note">
        <div class="protocol__bullet" v-html="$t('protocol.physics.thermal.scope')"></div>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="maxwell"
      :title-html="$t('protocol.physics.maxwell.title')"
      :tooltip="$t('protocol.physics.maxwell.tip')"
      :summary="$t('protocol.physics.maxwell.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.maxwell.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.maxwell.eqMain')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.maxwell.eqSub1')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.maxwell.eqSub2')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.maxwell.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.maxwell.p2')"></p>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="disruption"
      :title-html="$t('protocol.physics.disruption.title')"
      :tooltip="$t('protocol.physics.disruption.tip')"
      :summary="$t('protocol.physics.disruption.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.disruption.eqMain')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub1')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__bullet protocol__bullet--nourish" v-html="$t('protocol.physics.disruption.eqSub2')"></div>
        <div class="protocol__bullet protocol__bullet--revep" v-html="$t('protocol.physics.disruption.eqSub3')"></div>
        <div class="protocol__bullet protocol__bullet--lysis" v-html="$t('protocol.physics.disruption.eqSub4')"></div>
        <div class="protocol__bullet protocol__bullet--lysis" v-html="$t('protocol.physics.disruption.eqSub5')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.disruption.eqSub6')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.disruption.eqSub7')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__bullet protocol__bullet--hfire" v-html="$t('protocol.physics.disruption.eqSub8')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.disruption.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.p2')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.revEp')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.hfireNote')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.windowScoreNote')"></p>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="resonance"
      :title-html="$t('protocol.physics.resonance.title')"
      :tooltip="$t('protocol.physics.resonance.tip')"
      :summary="$t('protocol.physics.resonance.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.resonance.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.resonance.eqMain')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub2')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub3')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.resonance.eqNote')"></div>
      </div>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.resonance.thTarget')"></th>
            <th v-html="$t('protocol.physics.resonance.thFres')"></th>
            <th v-html="$t('protocol.physics.resonance.thQ')"></th>
            <th v-html="$t('protocol.physics.resonance.thEthr')"></th>
            <th v-html="$t('protocol.physics.resonance.thBasis')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in resonanceRows" :key="row.target">
            <td v-html="row.target"></td>
            <td class="protocol__mono" :class="row.fresClass ? 'protocol__' + row.fresClass : ''" v-html="row.fres"></td>
            <td class="protocol__mono" v-html="row.q"></td>
            <td class="protocol__mono" :class="row.ethrClass ? 'protocol__' + row.ethrClass : ''" v-html="row.ethr"></td>
            <td v-html="row.basis"></td>
          </tr>
        </tbody>
      </table>
      <div class="protocol__info-box">
        <span class="protocol__info-icon">{{ ICON.INFO }}</span>
        <span v-html="$t('protocol.physics.resonance.infoBox')"></span>
      </div>
      <div class="protocol__note">
        <div class="protocol__note-label" v-html="$t('protocol.physics.resonance.noteLabel')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.resonance.rfBasis')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.resonance.envelopedBasis')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.resonance.bacteriaQ')"></div>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="nsep"
      :title-html="$t('protocol.physics.nsep.title')"
      :tooltip="$t('protocol.physics.nsep.tip')"
      :summary="$t('protocol.physics.nsep.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.nsep.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.nsep.eqMain')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.nsep.eqSub1')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.nsep.eqNote')"></div>
      </div>
      <div class="protocol__info-box">
        <span class="protocol__info-icon">{{ ICON.INFO }}</span>
        <span v-html="$t('protocol.physics.nsep.scope')"></span>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="doubleshell"
      :title-html="$t('protocol.physics.doubleshell.title')"
      :tooltip="$t('protocol.physics.doubleshell.tip')"
      :summary="$t('protocol.physics.doubleshell.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.doubleshell.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.doubleshell.eqMain')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.doubleshell.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.doubleshell.eqSub2')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.doubleshell.eqNote')"></div>
      </div>
      <div class="protocol__note">
        <div class="protocol__note-label" v-html="$t('protocol.physics.doubleshell.noteLabel')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.doubleshell.fpeak')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.doubleshell.thinShell')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.doubleshell.sigmaNote')"></div>
      </div>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.doubleshell.thCell')"></th>
            <th v-html="$t('protocol.physics.doubleshell.thRnuc')"></th>
            <th v-html="$t('protocol.physics.doubleshell.thDne')"></th>
            <th v-html="$t('protocol.physics.doubleshell.thEne')"></th>
            <th v-html="$t('protocol.physics.doubleshell.thVthr')"></th>
            <th v-html="$t('protocol.physics.doubleshell.thFpeak')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in doubleshellRows" :key="row.cell">
            <td v-html="row.cell"></td>
            <td class="protocol__mono" :class="row.rnucClass ? 'protocol__' + row.rnucClass : ''" v-html="row.rnuc"></td>
            <td class="protocol__mono" :class="row.dneClass  ? 'protocol__' + row.dneClass  : ''" v-html="row.dne"></td>
            <td class="protocol__mono" :class="row.eneClass  ? 'protocol__' + row.eneClass  : ''" v-html="row.ene"></td>
            <td class="protocol__mono" :class="row.vThrClass ? 'protocol__' + row.vThrClass : ''" v-html="row.vthr"></td>
            <td class="protocol__mono" :class="row.fpeakClass ? 'protocol__' + row.fpeakClass : ''" v-html="row.fpeak"></td>
          </tr>
        </tbody>
      </table>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="dep"
      :title-html="$t('protocol.physics.dep.title')"
      :tooltip="$t('protocol.physics.dep.tip')"
      :summary="$t('protocol.physics.dep.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.dep.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.dep.eqForce')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.dep.eqForceSub')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.dep.p2')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.dep.eqCm')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.dep.eqCmSub1')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.dep.eqCmSub2')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.dep.eqCmSub3')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.dep.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.dep.p3')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.dep.p4')"></p>
      <div class="protocol__warn-box" v-html="$t('protocol.physics.dep.warnBox')"></div>
      <table class="protocol__param-table">
        <caption class="protocol__table-caption" v-html="$t('protocol.physics.dep.tableCaption')"></caption>
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.dep.thSym')"></th>
            <th v-html="$t('protocol.physics.dep.thParam')"></th>
            <th v-html="$t('protocol.physics.dep.thUnit')"></th>
            <th v-html="$t('protocol.physics.dep.thNote')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in depRows" :key="row.sym">
            <td class="protocol__mono" v-html="row.sym"></td>
            <td v-html="row.param"></td>
            <td class="protocol__mono" v-html="row.unit"></td>
            <td v-html="row.note"></td>
          </tr>
        </tbody>
      </table>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="uncertainty"
      :title-html="$t('protocol.physics.uncertainty.title')"
      :tooltip="$t('protocol.physics.uncertainty.tip')"
      :summary="$t('protocol.physics.uncertainty.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.uncertainty.p1')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.uncertainty.p2')"></p>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.uncertainty.thCategory')"></th>
            <th v-html="$t('protocol.physics.uncertainty.thBand')"></th>
            <th v-html="$t('protocol.physics.uncertainty.thRange')"></th>
            <th v-html="$t('protocol.physics.uncertainty.thSource')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in uncertaintyRows" :key="row.category">
            <td v-html="row.category"></td>
            <td class="protocol__mono" :class="row.bandClass ? 'protocol__' + row.bandClass : ''" v-html="row.band"></td>
            <td class="protocol__mono" v-html="row.range"></td>
            <td v-html="row.source"></td>
          </tr>
        </tbody>
      </table>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="biomodulation"
      :title-html="$t('protocol.physics.biomodulation.title')"
      :tooltip="$t('protocol.physics.biomodulation.tip')"
      :summary="$t('protocol.physics.biomodulation.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <div class="protocol__warn-box" v-html="$t('protocol.physics.biomodulation.empiricalWarn')"></div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.biomodulation.eqMain')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__bullet protocol__bullet--nourish" v-html="$t('protocol.physics.biomodulation.eqSub1')"></div>
        <div class="protocol__bullet protocol__bullet--nourish" v-html="$t('protocol.physics.biomodulation.eqSub2')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.biomodulation.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p2')"></p>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="impedance"
      :title-html="$t('protocol.physics.impedance.title')"
      :tooltip="$t('protocol.physics.impedance.tip')"
      :summary="$t('protocol.physics.impedance.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.impedance.p1')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.impedance.p2')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqMain')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub2')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub3')"></div>
        <div class="protocol__eq-divider"></div>
        <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqZ')"></div>
        <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqCorr')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.impedance.eqNote')"></div>
      </div>
      <div class="protocol__note">
        <div class="protocol__note-label" v-html="$t('protocol.physics.impedance.hardwareTitle')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.impedance.hardwareP')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.impedance.hardwareSchema')"></div>
        <div class="protocol__note-label" v-html="$t('protocol.physics.impedance.hardwareDriversTitle')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.impedance.hardwareDrivers')"></div>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="sonification"
      :title-html="$t('protocol.physics.sonification.title')"
      :tooltip="$t('protocol.physics.sonification.tip')"
      :summary="$t('protocol.physics.sonification.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.p1')"></p>
      <div class="protocol__warn-box" v-html="$t('protocol.physics.sonification.disclaimer')"></div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.mappingsTitle')"></p>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.sonification.thParam')"></th>
            <th v-html="$t('protocol.physics.sonification.thMapping')"></th>
            <th v-html="$t('protocol.physics.sonification.thNote')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sonificationMappings" :key="row.param">
            <td v-html="row.param"></td>
            <td class="protocol__mono protocol__primary-val" v-html="row.mapping"></td>
            <td v-html="row.note"></td>
          </tr>
        </tbody>
      </table>
      <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.p2')"></p>
      <div class="protocol__note">
        <div class="protocol__bullet" v-html="$t('protocol.physics.sonification.refNote')"></div>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="electrosensitization"
      :title-html="$t('protocol.physics.electrosensitization.title')"
      :tooltip="$t('protocol.physics.electrosensitization.tip')"
      :summary="$t('protocol.physics.electrosensitization.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.electrosensitization.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.electrosensitization.eq')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.electrosensitization.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.electrosensitization.eqSub2')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.electrosensitization.eqSub3')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.electrosensitization.eqSub4')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.electrosensitization.eqSub5')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.electrosensitization.examplesTitle')"></p>
      <table class="protocol__param-table">
        <thead>
          <tr>
            <th v-html="$t('protocol.physics.electrosensitization.thN')"></th>
            <th v-html="$t('protocol.physics.electrosensitization.thFactor')"></th>
            <th v-html="$t('protocol.physics.electrosensitization.thNote')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in electrosensitizationExamples" :key="row.n">
            <td class="protocol__mono protocol__primary-val" v-html="row.n"></td>
            <td :class="['protocol__mono', `protocol__${row.factorClass}`]" v-html="row.factor"></td>
            <td v-html="row.note"></td>
          </tr>
        </tbody>
      </table>
      <div class="protocol__warn-box" v-html="$t('protocol.physics.electrosensitization.warnBox')"></div>
      <div class="protocol__note">
        <div class="protocol__bullet" v-html="$t('protocol.physics.electrosensitization.refNote')"></div>
      </div>
    </ProtocolSubsection>

    <ProtocolSubsection
      anchor-id="closedloop"
      :title-html="$t('protocol.physics.closedloop.title')"
      :tooltip="$t('protocol.physics.closedloop.tip')"
      :summary="$t('protocol.physics.closedloop.summary')"
      :expand-token="expandToken"
      :collapse-token="collapseToken"
    >
      <p class="protocol__body-text" v-html="$t('protocol.physics.closedloop.p1')"></p>
      <div class="protocol__eq-block">
        <div class="protocol__eq-main" v-html="$t('protocol.physics.closedloop.eqMain')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.closedloop.eqSub1')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.closedloop.eqSub2')"></div>
        <div class="protocol__eq-sub" v-html="$t('protocol.physics.closedloop.eqSub3')"></div>
        <div class="protocol__eq-note" v-html="$t('protocol.physics.closedloop.eqNote')"></div>
      </div>
      <p class="protocol__body-text" v-html="$t('protocol.physics.closedloop.p2')"></p>
      <p class="protocol__body-text" v-html="$t('protocol.physics.closedloop.p3')"></p>
      <div class="protocol__warn-box" v-html="$t('protocol.physics.closedloop.warnBox')"></div>
      <div class="protocol__note">
        <div class="protocol__note-label" v-html="$t('protocol.physics.closedloop.scopeTitle')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.closedloop.scope1')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.closedloop.scope2')"></div>
        <div class="protocol__bullet" v-html="$t('protocol.physics.closedloop.scope3')"></div>
      </div>
    </ProtocolSubsection>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import type { SchwanParamRow, ResonanceRow, DoubleshellRow, DepRow, UncertaintyRow, SonificationRow, ElectrosensitizationRow } from './types'

import ProtocolSubsection from './ProtocolSubsection.vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ProtocolSectionPhysics',

  components: { ProtocolSubsection },

  props: {
    schwanParams: {
      type: Array as PropType<SchwanParamRow[]>,
      required: true,
    },
    resonanceRows: {
      type: Array as PropType<ResonanceRow[]>,
      required: true,
    },
    doubleshellRows: {
      type: Array as PropType<DoubleshellRow[]>,
      required: true,
    },
    depRows: {
      type: Array as PropType<DepRow[]>,
      required: true,
    },
    uncertaintyRows: {
      type: Array as PropType<UncertaintyRow[]>,
      required: true,
    },
    sonificationMappings: {
      type: Array as PropType<SonificationRow[]>,
      required: true,
    },
    electrosensitizationExamples: {
      type: Array as PropType<ElectrosensitizationRow[]>,
      required: true,
    },
  },

  data() {
    return {
      expandToken:   0,
      collapseToken: 0,
    }
  },

  computed: {
    ICON() { return ICON },
  },

  methods: {
    expandAll(): void   { this.expandToken   += 1 },
    collapseAll(): void { this.collapseToken += 1 },
  },
})
</script>

<style lang="scss" scoped>

@use './protocol' as proto;

@include proto.protocol-section();
@include proto.protocol-eq-block();
@include proto.protocol-utils();
@include proto.protocol-param-table();

.protocol {
  &__section-header {
    @include flex-between();
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  &__expand-controls {
    @include flex-row(0.4rem);
    align-items: baseline;
  }

  &__expand-btn {
    @include mono-upper(var(--fs-xxs), 0.06em);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    cursor: pointer;
    padding: 0;
    transition: color var(--tr-fast), opacity var(--tr-fast);

    &:hover { color: var(--color-primary); opacity: 1; }
  }

  &__expand-sep {
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    font-size: var(--fs-xs);
  }
}
</style>
