export type NormalizedRejectionReason =
  | "schema-validation"
  | "invalid-date"
  | "missing-required-field";

export type NormalizedRejectionIssue = {
  path: string;
  message: string;
};

export type NormalizedRejection = {
  providerEventId: string;
  reason: NormalizedRejectionReason;
  issues?: readonly NormalizedRejectionIssue[];
};
