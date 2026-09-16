# CXA — Custom X Apparel

CXA is a production web application for a New Zealand custom apparel printing
business. It will let customers browse and configure apparel, upload artwork,
and submit quote requests. Customer quotes do not take payment and do not
automatically create supplier orders.

## Technology stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- ESLint
- Prisma ORM with a PostgreSQL schema and migration foundation

## Supplier architecture

CXA owns the customer-facing catalogue. Supplier records are integrations and
must not overwrite CXA names, descriptions, categories, visibility, decoration
options, or other merchandising data. A CXA product may eventually map to more
than one supplier.

The shared supplier contract supports API, CSV, XLSX, and manual sources.
Premium Apparel is the first adapter and is isolated under
`src/suppliers/premium-apparel`. Its credentials and requests are server-only.
Controlled development ingestion is available for style `101CVC`; unrestricted
catalogue ingestion and supplier ordering are not implemented.

## Local development

Requires a supported Node.js version and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Other useful commands:

```bash
npm run lint
npm run build
npm start
```

On PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env.local
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PREMIUM_APPAREL_API_URL` | Server-side Premium Apparel API base URL |
| `PREMIUM_APPAREL_API_KEY` | Server-side Premium Apparel credential |
| `CXA_POSTGRES_PASSWORD` | Local Docker PostgreSQL password |
| `DATABASE_URL` | Server-side PostgreSQL connection string |

Copy `.env.example` to `.env.local` and add the local secret. Never commit
`.env.local` or an API key. Neither variable uses the `NEXT_PUBLIC_` prefix, so
it must not be accessed from browser code.

## Premium Apparel connectivity discovery

After configuring `.env.local` with a real customer token, run:

```bash
npm run premium-apparel:test
```

This development-only command makes three authenticated, read-only requests. It
filters stock to one documented example style, filters prices to one exact SKU,
and uses a stock change timestamp for a narrow incremental product request. It
prints at most three records from each response and never prints the API key or
Authorization header.

Supplier prices are confidential server-side data. Do not expose them through
customer-facing pages or production HTTP endpoints. Task 2 performs catalogue
reads only; it does not create supplier orders or make any other write request.

## Database development

The local database uses the official PostgreSQL 18.6 Alpine image, a dedicated
`cxa_dev` database and volume, and a port bound only to `127.0.0.1`. Configure
`CXA_POSTGRES_PASSWORD` and the matching `DATABASE_URL` in `.env.local`, then:

```bash
docker compose --env-file .env.local up -d
docker compose --env-file .env.local ps
```

Only continue when the service reports healthy and `DATABASE_URL` names the
local `cxa_dev` database. Database commands:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
npm run db:seed
npm run db:status
npm test
```

The database status command reports only the database identity, record counts,
and sanitized sync state. It never prints the connection string, password,
supplier prices, or API credentials. The seed is idempotent and stores no API
credentials or supplier pricing.

Run the bounded development ingestion with:

```bash
npm run premium-apparel:ingest-test
```

This command is locked to the local `cxa_dev` database and style `101CVC`. It
uses a byte-limited streaming product lookup, exact style stock filtering, and
exact SKU price filtering. Output contains counts and status only.

Supplier products, variants, images, prices, stock, and sync cursors remain
separate from CXA-owned catalogue products. Incremental sync functions operate
server-side in bounded batches and do not create supplier orders.

Premium Apparel's `html_description` and `size_chart` fields contain HTML and
are sanitized server-side before customer-facing rendering. `rawData` may
contain confidential wholesale pricing and must never be included in public
DTOs or client payloads.

## Catalogue publishing

Supplier ingestion never publishes a customer product. Development publishing
is an explicit, local-database-only step:

```bash
npm run cxa:publish-test-product
npm run cxa:publish-test-product -- --status=PUBLISHED
```

The first command creates or reuses the CXA product in `DRAFT`; the status flag
publishes it. Both commands are idempotent. The publishing layer derives safe
initial defaults but does not copy supplier raw payloads or pricing into the
CXA product. Once created, CXA-owned merchandising fields are preserved.

Customer pages consume a server-created public DTO rather than supplier records.
Stock is reduced to `OUT_OF_STOCK` (0 or less), `LOW_STOCK` (1–10), or
`IN_STOCK` (more than 10). Exact stock, SKUs, supplier identifiers, wholesale
prices, raw payloads, credentials, and sync metadata are excluded.

## Product configuration and quote cart

Published products can be configured with quantities by size and one decoration
method per selected branding location. Only CXA-enabled methods are presented.
Artwork uploads and quote submission are intentionally deferred; customers can
add plain-text artwork and general notes only.

The quote cart is client-side and persists under the versioned
`cxa_quote_cart_v1` localStorage key. Each configuration has a separate UUID, so
the same product can appear multiple times with different colours or decoration
choices. Stored payloads are parsed defensively and reset if malformed or if
supplier-only fields appear.

`validateQuoteLineServer` re-reads the published customer-safe product and
validates colour, size, availability, quantities, decoration locations,
enabled methods, duplicates, and note limits. It is ready for reuse by a future
quote-submission workflow; Task 6 does not create quote database records.

## Quote submission and privacy

Quote submission stores the customer&apos;s name, contact details, requested date,
delivery preference/address, notes, and immutable snapshots of each configured
product. This information is required so CXA can review availability, artwork,
production requirements, and respond with final pricing. Quote snapshots contain
CXA-facing product details only; supplier prices, raw payloads, credentials,
variant identifiers, and exact stock are never copied.

Quote numbers use an atomic PostgreSQL counter per calendar year inside the same
serializable transaction that creates the quote. The format is
`CXA-YYYY-00001`. A unique client submission UUID provides idempotency; the
browser associates it with a fingerprint of the current cart so edits receive a
new key while network retries reuse the original.

Customer details are validated centrally with Zod, and every cart line is
revalidated against the current published customer-safe catalogue before any
database write. The whole quote is committed or rejected—partial quotes are not
created. Stock is not reserved and exact supplier quantities are not exposed.

Premium Apparel receives no customer information during quote submission and no
supplier order is created. Supplier ordering remains a separate future staff
workflow. Artwork uploads are not included yet.

SMTP notifications are optional and configured only through the documented
environment variables. Database persistence is authoritative; notification
failures are recorded as safe quote events and never roll back a quote. The
in-memory request limiter is a development safeguard only and must be replaced
with shared durable infrastructure before horizontally scaled production use.

Safe development inspection commands:

```bash
npm run quotes:list
npm run quotes:show -- CXA-YYYY-00001
```

These commands require the protected local `cxa_dev` database and omit delivery
addresses, detailed customer notes, supplier data, and credentials.

Prisma 7.10 currently brings a development-CLI advisory through
`deepmerge-ts`. npm offers only a major downgrade as its automated resolution;
the project remains on the matched Prisma 7.10 client/CLI until a compatible
fix is available.

## Staff administration

The internal portal at `/admin` uses Auth.js credentials with bcrypt password
hashes. There is no public registration flow. Admin reads and writes pass
through centralized server-side authorization; hiding a client control is not
treated as access control.

Configure these values in `.env.local`:

```dotenv
AUTH_SECRET=
CXA_ADMIN_SESSION_MAX_AGE=28800
CXA_ADMIN_EMAIL=
CXA_ADMIN_PASSWORD=
```

Use a cryptographically secure random `AUTH_SECRET` and a staff password of at
least 12 characters. Never commit either value. Create or safely update the
initial development administrator and list non-sensitive staff details with:

```bash
npm run admin:seed
npm run admin:list
```

The seed is restricted to local `cxa_dev`, uses bcrypt cost 12, is idempotent
by normalized email, and never prints a password or hash. Login throttling is
in-memory for development; a multi-instance production deployment must use a
shared persistent limiter.

## Supplier catalogue synchronization

Premium Apparel synchronization uses a durable PostgreSQL queue (`SupplierSyncRun`)
and a supplier-scoped database lock. The worker atomically claims queued work,
recovers expired locks, records safe progress and history, and always releases
the lock. A full run streams the product response with a configurable byte cap,
persists independently transactional batches, and then applies the authoritative
stock and authenticated customer-price feeds. Product, stock, and price cursors
advance independently from each response's `as_of` value only after that resource
completes.

Run the development worker or a protected local one-off operation with:

```bash
npm run sync:worker
npm run sync:premium-apparel:full
npm run sync:premium-apparel:products
npm run sync:premium-apparel:stock-prices
npm run sync:status
```

The one-off commands require `cxa_dev` on `127.0.0.1`. Admin actions only enqueue
jobs; keep `npm run sync:worker` running to process them. Relevant tuning values
are `PREMIUM_APPAREL_SYNC_BATCH_SIZE`, `PREMIUM_APPAREL_MAX_RESPONSE_BYTES`,
`PREMIUM_APPAREL_REQUEST_TIMEOUT_MS`, `PREMIUM_APPAREL_REQUEST_SPACING_MS`,
`PREMIUM_APPAREL_SYNC_LOCK_MINUTES`, and `SUPPLIER_SYNC_WORKER_POLL_MS`.

Supplier ingestion never publishes CXA products. Wholesale prices and raw payloads
remain server-confidential, and quote submission never creates supplier orders.
No scheduler is active. A future starting cadence is products daily (or every few
hours), stock hourly, and prices daily, subject to business and supplier limits.

## Artwork storage and review

Customer artwork is uploaded before quote submission into short-lived
`TemporaryArtworkUpload` records and private storage under `.cxa-storage/artwork`.
Quote submission validates each opaque token against its client configuration and
decoration location, then consumes it atomically into one `ArtworkFile`. Retries
reuse the existing quote and do not duplicate artwork or stored files.

The `ArtworkStorageProvider` abstraction supplies save, read, delete, existence,
and inventory operations. Development uses `LocalArtworkStorage`; a future
object-storage provider can implement the same contract for S3-compatible storage,
Azure Blob, or Google Cloud Storage without coupling quote logic to paths. No cloud
credentials or SDKs are configured.

PNG, JPEG, PDF, and SVG are accepted after filename, extension, MIME, size, and
signature validation. SVG remains download-only and is never rendered inline.
All admin downloads are authenticated attachments with `nosniff`. Malware scanning
is not yet integrated, so files are truthfully recorded as `NOT_SCANNED`; production
must add a scanner before broader public rollout. Upload rate limiting is in-memory
for development and must become shared/persistent for multi-instance production.

Development operations:

```bash
npm run artwork:status
npm run artwork:cleanup -- --dry-run
npm run artwork:cleanup
npm run artwork:test-flow
```
