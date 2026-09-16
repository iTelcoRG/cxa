import "server-only";
import { mainReviewPages, type ReviewPage } from "./shared.ts";

export async function listReviewPages(): Promise<ReviewPage[]> {
  return [...mainReviewPages];
}
