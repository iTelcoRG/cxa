import { database } from "../../../lib/database.ts";
import { listReviewPages } from "../../../reviews/pages.ts";
import { reviewers, reviewSchema } from "../../../reviews/shared.ts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

export async function GET(request: Request) {
  const reviewer = new URL(request.url).searchParams.get("reviewer");
  if (!reviewers.some(name => name === reviewer)) return json({ error: "Select your name." }, 400);
  try {
    const [pages, reviews] = await Promise.all([
      listReviewPages(),
      database.websiteReview.findMany({ where: { reviewer: reviewer! }, select: { pagePath: true, comment: true, status: true, updatedAt: true } }),
    ]);
    return json({ pages, reviews });
  } catch { return json({ error: "Reviews could not be loaded. Please try again." }, 503); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Save from the CXA review page." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Expected JSON." }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Enter your review." }, 400);
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32_000) { await reader.cancel(); return json({ error: "Your comment is too long." }, 413); }
      chunks.push(value);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return json({ error: "Invalid review." }, 400); }
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return json({ error: "Select a name and status, and limit comments to 5,000 characters." }, 400);
    const { reviewer, pagePath, comment, status } = parsed.data;
    if (!(await listReviewPages()).some(page => page.path === pagePath)) return json({ error: "This page is no longer available for review." }, 400);
    const review = await database.websiteReview.upsert({
      where: { reviewer_pagePath: { reviewer, pagePath } },
      create: { reviewer, pagePath, comment, status }, update: { comment, status },
      select: { pagePath: true, comment: true, status: true, updatedAt: true },
    });
    return json({ review });
  } catch { return json({ error: "Your review was not saved. Please try again." }, 503); }
}
