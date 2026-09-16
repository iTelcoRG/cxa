export type AdminQuoteStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "QUOTED"
  | "APPROVED"
  | "DECLINED"
  | "IN_PRODUCTION"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export const quoteTransitions: Record<
  AdminQuoteStatus,
  readonly AdminQuoteStatus[]
> = {
  SUBMITTED: ["REVIEWING"],
  REVIEWING: ["QUOTED", "DECLINED"],
  QUOTED: ["APPROVED", "DECLINED"],
  APPROVED: ["IN_PRODUCTION", "CANCELLED"],
  DECLINED: [],
  IN_PRODUCTION: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionQuote(
  from: AdminQuoteStatus,
  to: AdminQuoteStatus,
): boolean {
  return quoteTransitions[from].includes(to);
}
