export interface QuoteSubmissionSuccess {
  ok: true;
  quoteNumber: string;
  confirmationToken: string;
  duplicate: boolean;
}

export interface QuoteSubmissionFailure {
  ok: false;
  errors: string[];
  fieldErrors?: Record<string, string[]>;
}

export type QuoteSubmissionResult = QuoteSubmissionSuccess | QuoteSubmissionFailure;

export interface SafeConfirmation {
  quoteNumber: string;
  customerName: string;
  submittedAt: string;
  configurationCount: number;
  totalGarments: number;
  products: Array<{
    productName: string;
    colourDescription: string;
    totalQuantity: number;
  }>;
  artwork: Array<{ originalFileName: string }>;
}
