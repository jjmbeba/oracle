export { createSignalDedupeMetadata } from "./dedupe";
export type {
  ConservativeFingerprintSignalDedupeInput,
  ProviderDerivedSignalDedupeInput,
  ProviderNativeSignalDedupeInput,
  SignalDedupeInput,
  SignalDedupeMetadata,
  SignalDedupeStrategy,
} from "./dedupe";
export {
  normalizedSignalSchema,
  positionSchema,
  signalGeometrySchema,
  signalCategorySchema,
  signalConfidenceSchema,
  signalScopeKindSchema,
  signalScopeSchema,
  signalSeveritySchema,
  signalSourceLinkSchema,
} from "./schemas";
export type { NormalizedSignal, SignalGeometry, SignalScope, SignalSourceLink } from "./schemas";
export type {
  NormalizedRejection,
  NormalizedRejectionIssue,
  NormalizedRejectionReason,
} from "./rejection";
export {
  signalCategories,
  signalCategoryLabels,
  signalConfidenceLabels,
  signalConfidences,
  signalScopeLabels,
  signalScopes,
  signalSeverities,
  signalSeverityLabels,
} from "./values";
export type { SignalCategory, SignalConfidence, SignalScopeKind, SignalSeverity } from "./values";
