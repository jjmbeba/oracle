import type { SignalCategory } from "./values";

export type SignalDedupeStrategy =
  | "provider-native"
  | "provider-derived"
  | "conservative-fingerprint";

type BaseSignalDedupeInput = {
  category: SignalCategory;
  provider: string;
  possibleCrossProviderDuplicateParts?: readonly string[];
};

export type ProviderNativeSignalDedupeInput = BaseSignalDedupeInput & {
  strategy: "provider-native";
  providerEventId: string;
};

export type ProviderDerivedSignalDedupeInput = BaseSignalDedupeInput & {
  strategy: "provider-derived";
  providerDerivedId: string;
};

export type ConservativeFingerprintSignalDedupeInput = BaseSignalDedupeInput & {
  strategy: "conservative-fingerprint";
  fingerprintParts: readonly string[];
};

export type SignalDedupeInput =
  | ProviderNativeSignalDedupeInput
  | ProviderDerivedSignalDedupeInput
  | ConservativeFingerprintSignalDedupeInput;

export type SignalDedupeMetadata = {
  dedupeKey: string;
  providerEventId?: string;
  possibleCrossProviderDuplicateKey?: string;
};

const canonicalizeValue = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const requireRawValue = (name: string, value: string): string => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return trimmedValue;
};

const requireCanonicalKeyPart = (name: string, value: string): string => {
  const canonicalValue = canonicalizeValue(value);

  if (canonicalValue.length === 0) {
    throw new Error(`${name} must not be empty`);
  }

  return canonicalValue;
};

const encodeKeyPart = (value: string): string => encodeURIComponent(value).replaceAll("%20", "+");

const canonicalizeFingerprintParts = (parts: readonly string[]): string[] => {
  const canonicalParts = parts
    .map((part) => requireCanonicalKeyPart("fingerprint parts", part))
    .sort();

  if (canonicalParts.length < 2) {
    throw new Error("fingerprint parts must include at least two stable parts");
  }

  return canonicalParts;
};

const buildKey = (parts: readonly string[]): string => parts.map(encodeKeyPart).join(":");

const buildFingerprintKeyPart = (parts: readonly string[]): string =>
  canonicalizeFingerprintParts(parts).map(encodeKeyPart).join("|");

const buildProviderDedupeKey = (
  category: SignalCategory,
  provider: string,
  strategy: SignalDedupeStrategy,
  providerScopedValue: string,
): string => buildKey(["signal", category, provider, strategy, providerScopedValue]);

const buildPossibleCrossProviderDuplicateKey = (
  category: SignalCategory,
  parts: readonly string[],
): string =>
  buildKey([
    "signal",
    category,
    "possible-cross-provider-duplicate",
    buildFingerprintKeyPart(parts),
  ]);

export const createSignalDedupeMetadata = (input: SignalDedupeInput): SignalDedupeMetadata => {
  const provider = requireCanonicalKeyPart("provider", input.provider);
  const crossProviderParts = input.possibleCrossProviderDuplicateParts;
  const possibleCrossProviderDuplicateKey = crossProviderParts
    ? buildPossibleCrossProviderDuplicateKey(input.category, crossProviderParts)
    : undefined;

  if (input.strategy === "provider-native") {
    const providerEventId = requireRawValue("provider event ID", input.providerEventId);
    const canonicalProviderEventId = canonicalizeValue(providerEventId);

    return {
      dedupeKey: buildProviderDedupeKey(
        input.category,
        provider,
        input.strategy,
        canonicalProviderEventId,
      ),
      providerEventId,
      possibleCrossProviderDuplicateKey,
    };
  }

  if (input.strategy === "provider-derived") {
    const providerDerivedId = requireCanonicalKeyPart(
      "provider derived ID",
      input.providerDerivedId,
    );

    return {
      dedupeKey: buildProviderDedupeKey(
        input.category,
        provider,
        input.strategy,
        providerDerivedId,
      ),
      possibleCrossProviderDuplicateKey,
    };
  }

  return {
    dedupeKey: buildProviderDedupeKey(
      input.category,
      provider,
      input.strategy,
      buildFingerprintKeyPart(input.fingerprintParts),
    ),
    possibleCrossProviderDuplicateKey,
  };
};
