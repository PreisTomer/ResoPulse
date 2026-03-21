// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

export interface SchwanParamRow   { sym: string; param: string; unit: string; note: string }
export interface ResonanceRow     { target: string; fres: string; fresClass: string; q: string; ethr: string; ethrClass: string; basis: string }
export interface DoubleshellRow   { cell: string; rnuc: string; rnucClass?: string; dne: string; dneClass?: string; ene: string; eneClass?: string; vthr: string; vThrClass?: string; fpeak: string; fpeakClass: string }
export interface DepRow           { sym: string; param: string; unit: string; note: string }
export interface UncertaintyRow   { category: string; band: string; bandClass: string; range: string; source: string }
export interface SafetyRow        { param: string; value: string; valueClass: string; sig: string }
export interface RawRefItem       { body: string; doi?: string; pmid?: string; note?: string }
export interface RefItem          { body: string; url?: string; urlLabel?: string; note?: string }
export interface TocItem          { id: string; key: string; indent: boolean; physicsParent?: boolean }
export interface SonificationRow  { param: string; mapping: string; note: string }
