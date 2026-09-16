import type { PremiumApparelApiErrorCode } from "./types.ts";

export type PremiumApparelErrorCode =
  | PremiumApparelApiErrorCode
  | "configuration_error"
  | "invalid_response"
  | "network_error"
  | "timeout";

export interface PremiumApparelErrorOptions extends ErrorOptions {
  code: PremiumApparelErrorCode;
  status?: number;
  details?: unknown;
}

export class PremiumApparelError extends Error {
  readonly code: PremiumApparelErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, options: PremiumApparelErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "PremiumApparelError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}
