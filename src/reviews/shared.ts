import { z } from "zod";

export const reviewers = ["Neil", "Lawrence", "Indika"] as const;
export const reviewStatuses = { NOT_REVIEWED: "Not reviewed", CHANGES_REQUESTED: "Changes requested", APPROVED: "Signed off" } as const;
export type ReviewStatus = keyof typeof reviewStatuses;
export type ReviewPage = { path: string; title: string };
export type SavedReview = { pagePath: string; comment: string; status: ReviewStatus; updatedAt: string };
export const reviewSchema = z.object({
  reviewer: z.enum(reviewers),
  pagePath: z.string().min(1).max(500),
  comment: z.string().max(5000),
  status: z.enum(["NOT_REVIEWED", "CHANGES_REQUESTED", "APPROVED"]),
}).strict();

export const mainReviewPages: ReviewPage[] = [
  { path: "/", title: "Home" },
  { path: "/products", title: "Products" },
  { path: "/brands", title: "Brands" },
  { path: "/create-your-brand", title: "Create your brand" },
  { path: "/printing-embroidery", title: "Printing & embroidery" },
  { path: "/how-it-works", title: "How it works" },
  { path: "/about", title: "About" },
  { path: "/contact", title: "Contact" },
  { path: "/quote", title: "Quote basket" },
  { path: "/delivery", title: "Delivery" },
  { path: "/faq", title: "Frequently asked questions" },
  { path: "/privacy", title: "Privacy" },
  { path: "/terms", title: "Terms" },
];
