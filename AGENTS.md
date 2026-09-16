<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CXA production application rules

- This repository is the CXA (Custom X Apparel) production application.
- Keep the supplier architecture multi-supplier. Supplier data must not dictate
  the CXA catalogue model.
- Access Premium Apparel and its credentials from server-only code.
- Never commit API keys, secrets, `.env`, or `.env.local` files.
- Never expose supplier wholesale pricing directly to customers.
- Treat `SupplierProduct.rawData` as confidential server-only data because it
  may contain supplier wholesale pricing. Never include it in public DTOs.
- Sanitize supplier-provided HTML before any customer-facing rendering. Do not
  trust `htmlDescription` or `sizeChart` merely because it came from a supplier.
- Never automatically create supplier orders from customer quote submissions.
- Treat quote submission and supplier ordering as separate workflows.
- Do not generate images or replace supplied design assets without explicit
  approval.
- Make every customer-facing page mobile responsive.
- Prefer incremental, tested changes over large uncontrolled rewrites.
