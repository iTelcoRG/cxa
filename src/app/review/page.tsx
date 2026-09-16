import type { Metadata } from "next";
import { ReviewBoard } from "./review-board";

export const metadata: Metadata = { title: "Website sign-off | CXA", robots: { index: false, follow: false } };

export default function ReviewPage() {
  return <main className="shell page-shell"><ReviewBoard /></main>;
}
