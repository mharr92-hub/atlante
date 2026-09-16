# Atlante del Pacifico

Independent booking and marketing web app for **Atlante del Pacifico** —
private yacht charters from Panama City, Taboga and Las Perlas.

Fully independent brand. There is no Pacific Experience co-brand, “by Pacific
Experience”, or “Operado por…” copy on the site.

Built as a **Next.js 16 (App Router, TypeScript) + Tailwind v4** full-stack app,
deployable on **Vercel**.

## Run locally

```bash
npm install
cp .env.example .env   # fill DATABASE_URL + PagueloFácil when testing checkout
npm run dev            # http://localhost:3000
npm run build          # production build
```

The marketing site and charter fichas render without env vars. Creating a
PagueloFácil deposit link requires `DATABASE_URL` plus the PF secrets below.

## Charter MVP (Route A)

Live product: **private charters**. Ferry and tours stay “Próximamente”.

| Route | What it is |
| --- | --- |
| `/` | Hero with Charters live; Ferry / Tours próximamente |
| `/charters` | Fleet grid — Pacific Ferry + Sirena del Mar live; other boats placeholder |
| `/charters/pacific-ferry` | Ficha + request form |
| `/charters/sirena-del-mar` | Ficha + request form |
| `/reservar/[slug]` | Same short form (name, WhatsApp, date, hours, pax) |
| `/reservar/[slug]/gracias` | Post-request / post-deposit |

**UX lock:** request + 24h operator confirmation + 30% deposit. No live calendars
for the fleet. Aura is excluded. Placeholder boats have no invented prices.

**Disclaimer (locked ES):** the deposit confirms the *request*, not the
reservation. Availability is checked with the vessel operator within 24 hours
via WhatsApp. Alternative date/boat, or 100% refund.

**Prices:** sample 4h totals in `src/data/charters.ts` are tagged `TODO_MARK`
(cited “desde” $1,300 — not official 8h/12h tariffs). Replace before treating
them as operator rates. 8h and 12h stay `null` until filled (form still accepts
the request; no PagueloFácil charge).

## PagueloFácil (not static button links)

Checkout follows the PEX `catamaran-rentals` Enlace de Pago pattern:

1. `POST /api/charters/reservar` stores the lead, then server-creates a
   single-use LinkDeamon URL (`CCLW`, `CMTN`, `CDSC`, hex `RETURN_URL`,
   `PARM_1` = lead id, `EXPIRES_IN=900`).
2. Browser redirects to that hosted URL.
3. PF hits `GET /api/payments/paguelofacil/return` and/or
   `POST /api/payments/paguelofacil/webhook` with `Oper` — **hints only**.
4. Atlante confirms via MerchantTransactions S2S. Authorization is the **raw
   API token** (do not prefix `Bearer `). Status whitelist includes numeric `1`.
   Amount must match the stored 30% deposit; `PARM_1` must match the lead id.

Client: `src/lib/paguelofacil.ts`.

**TODO:** keep that client aligned with
`catamaran-rentals/backend/src/modules/payments/payments.service.ts` when
porting remaining PEX behavior (reconciliation cron, expired-recovery mark-paid).

### Env (Vercel → Project → Environment Variables)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (pooled). Required to persist leads and reconcile payments. |
| `DIRECT_URL` | Direct Postgres URL for `prisma db push` / migrate. |
| `PUBLIC_APP_URL` | Public origin, e.g. `https://www.atlantedelpacifico.lat` |
| `PAGUELOFACIL_CCLW` | Merchant web code |
| `PAGUELOFACIL_API_TOKEN` | MerchantTransactions token (raw Authorization) |
| `PAGUELOFACIL_API_URL` | Default `https://secure.paguelofacil.com/LinkDeamon.cfm` |
| `PAGUELOFACIL_VERIFY_URL` | Default `https://admin.paguelofacil.com` |
| `PAGUELOFACIL_RETURN_URL` | Optional override of `${PUBLIC_APP_URL}/api/payments/paguelofacil/return` |

Webhook URL (dashboard Notificaciones, no env var):
`https://www.atlantedelpacifico.lat/api/payments/paguelofacil/webhook`

Without PF or DB, the form still works: lead is logged, customer lands on
`/gracias?pago=pendiente`, follow-up is WhatsApp (+507 6860 3623).

Schema apply when the database exists: `npx prisma db push` or
`psql "$DATABASE_URL" -f prisma/charter-requests.sql`.

## Architecture

```
src/
  app/
    (site)/charters/          Fleet + fichas
    (site)/reservar/[slug]/   Request form + gracias
    api/charters/reservar     Create lead + PagueloFácil link
    api/payments/paguelofacil return / webhook / availability
  components/charter/         Cards, ficha, form, deposit disclaimer
  data/charters.ts            Fleet source of truth (Aura omitted)
  lib/paguelofacil.ts         LinkDeamon + S2S verify
  lib/charter-requests.ts     Lead persist (lazy Prisma)
prisma/schema.prisma          Includes CharterRequest
```

Bilingual **ES/EN**. Multi-currency **USD/EUR/COP/MXN** (display only; PF charges USD).

## Deploy (Vercel)

Import the `atlante` repo. Set the env vars above for production and preview
if you want live PagueloFácil. Preview without secrets still shows the charter
UX; checkout degrades to WhatsApp follow-up.
