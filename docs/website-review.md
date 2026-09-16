# Website sign-off

Share `https://cxa-website.vercel.app/review` with Neil, Lawrence and Indika after the production deployment completes.
This is a normal webpage URL; no separate HTML file is needed.

Select a name, open a page in a new tab, enter comments, choose a status, and click
**Save review** on that page. Reviews are stored in PostgreSQL per person and page.
Selecting the same name on another device loads the saved reviews. The owner can
select each name to read their feedback. Saving again replaces that person's
previous comment and status for that page. Simultaneous edits to the same person's
page use the most recent save.

The page lists public information pages, the quote basket, published products,
active brands and active categories. Private admin, customer-specific quote
confirmations and artwork proof links are excluded. It is not linked from public
navigation or the sitemap and requests no search indexing.

Name selection is a convenience, not authentication: anyone with the link can
read and edit any listed person's reviews. Share it with the intended review group.

## Deployment

The existing Vercel project deploys from the connected GitHub repository.
`vercel.json` runs `scripts/vercel-build.mjs`, which applies tracked migrations
before production builds and stops if migration fails. Preview builds never run
migrations because the project shares a database across production and preview.
The production migration uses `DATABASE_URL_UNPOOLED` when available; the app uses
`DATABASE_URL`. The existing postinstall step generates the Prisma client.
The new migration creates only the `WebsiteReview` table.

A localhost URL is only accessible on the machine running the site. Friends need
the deployed site's public domain.
