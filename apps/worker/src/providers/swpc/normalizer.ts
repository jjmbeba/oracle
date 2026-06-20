import { z } from "zod";
import type { NormalizedSignal, SignalSeverity } from "@oracle/domain";
import { createSignalDedupeMetadata } from "@oracle/domain";

const MESSAGE_CODE_PREFIXES = ["ALT", "WAR", "WAT", "SUM"] as const;

const MESSAGE_CODE_SEVERITY: Record<string, SignalSeverity> = {
  K04: "minor",
  K05: "minor",
  K06: "moderate",
  K07: "significant",
  EF3: "moderate",
  PX1: "minor",
  XMF: "moderate",
  X01: "significant",
  A30: "moderate",
  A50: "significant",
};

const SWPC_SOURCE_LINK = {
  url: "https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
  label: "NOAA SWPC Alert",
} as const;

const swpcAlertItemSchema = z
  .object({
    product_id: z.string().min(1),
    issue_datetime: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function extractMessageHeader(text: string): { messageCode: string; serialNumber: string } | null {
  const normalized = normalizeLineEndings(text);
  const codeMatch = normalized.match(/Space Weather Message Code:\s*(\S+)/);
  const serialMatch = normalized.match(/Serial Number:\s*(\d+)/);

  if (!codeMatch || !serialMatch) return null;

  return {
    messageCode: codeMatch[1]!.trim(),
    serialNumber: serialMatch[1]!.trim(),
  };
}

function extractTitle(text: string): string | null {
  const normalized = normalizeLineEndings(text);
  const headerEndIndex = normalized.indexOf("\n\n");
  if (headerEndIndex === -1) return null;

  const afterHeader = normalized.slice(headerEndIndex + 2);
  const firstLineEnd = afterHeader.indexOf("\n");
  const line = firstLineEnd === -1 ? afterHeader : afterHeader.slice(0, firstLineEnd);

  return line.trim() || null;
}

function extractMessageSuffix(messageCode: string): string | null {
  for (const prefix of MESSAGE_CODE_PREFIXES) {
    if (messageCode.startsWith(prefix)) {
      return messageCode.slice(prefix.length);
    }
  }
  return null;
}

function swpcMessageCodeToSeverity(messageCode: string): SignalSeverity {
  const suffix = extractMessageSuffix(messageCode);
  if (!suffix) return "minor";
  return MESSAGE_CODE_SEVERITY[suffix] ?? "minor";
}

function normalizeSwpcAlert(item: z.infer<typeof swpcAlertItemSchema>): NormalizedSignal | null {
  const header = extractMessageHeader(item.message);
  if (!header) return null;

  const title = extractTitle(item.message);
  if (!title) return null;

  const issueDate = new Date(item.issue_datetime + "Z");
  if (Number.isNaN(issueDate.getTime())) return null;
  const effectiveAt = issueDate.toISOString();

  const { dedupeKey } = createSignalDedupeMetadata({
    strategy: "provider-derived",
    category: "space-weather",
    provider: "noaa-swpc",
    providerDerivedId: `${header.messageCode} / ${header.serialNumber}`,
  });

  return {
    provider: "noaa-swpc",
    dedupeKey,
    providerEventId: item.product_id,
    category: "space-weather",
    title,
    severity: swpcMessageCodeToSeverity(header.messageCode),
    confidence: "high",
    effectiveAt,
    issuedAt: effectiveAt,
    scope: { kind: "global" },
    sourceLink: SWPC_SOURCE_LINK,
  };
}

export function normalizeSwpcResponse(input: unknown): {
  signals: NormalizedSignal[];
  skipped: { productId: string }[];
} {
  const rawItems = z.array(z.unknown()).parse(input);
  const signals: NormalizedSignal[] = [];
  const skipped: { productId: string }[] = [];

  for (const rawItem of rawItems) {
    const parsed = swpcAlertItemSchema.safeParse(rawItem);
    if (!parsed.success) {
      const productId =
        typeof rawItem === "object" &&
        rawItem !== null &&
        "product_id" in rawItem &&
        typeof (rawItem as { product_id?: unknown }).product_id === "string"
          ? (rawItem as { product_id: string }).product_id
          : "unknown";
      skipped.push({ productId });
      continue;
    }

    const signal = normalizeSwpcAlert(parsed.data);
    if (signal) {
      signals.push(signal);
    } else {
      skipped.push({ productId: parsed.data.product_id });
    }
  }

  return { signals, skipped };
}
