CREATE TABLE "WebsiteReview" (
  "reviewer" TEXT NOT NULL CHECK ("reviewer" IN ('Neil', 'Lawrence', 'Indika')),
  "pagePath" TEXT NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '' CHECK (char_length("comment") <= 5000),
  "status" TEXT NOT NULL DEFAULT 'NOT_REVIEWED' CHECK ("status" IN ('NOT_REVIEWED', 'CHANGES_REQUESTED', 'APPROVED')),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteReview_pkey" PRIMARY KEY ("reviewer", "pagePath")
);
