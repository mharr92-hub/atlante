# Atlante del Pacifico

Independent booking & marketing web app for Atlante del Pacifico — private tours and
yacht charters from Panama City, Taboga and Las Perlas.

Built as a **Next.js 16 (App Router, TypeScript) + Tailwind v4** full-stack app,
deployable on **Vercel**. Booking/payment patterns reference the `catamaran-rentals-prod`
app but this is a fully separate codebase.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Phase 1 (the marketing site) needs **no** environment variables. Phase 2 features
each require an account — see `.env.example`.

## Architecture

```
src/
  app/                 App Router pages
    page.tsx           Home (all sections)
    tours/[slug]/      Tour & charter detail pages (SEO + JSON-LD)
    compare/           Side-by-side compare
    api/lead/          Email-capture endpoint (stub -> Phase 2)
    sitemap.ts robots.ts
  components/
    site/              Header, Footer, floating WhatsApp
    sections/          Home sections (hero, tours, charters, reviews, ...)
    tour/              TourCard, TourDetail, RouteMap, WeatherWidget, PriceCalculator, Badges, CompareTable
    marketing/         Analytics (GA4/Meta), LeadPopups (capture + exit-intent)
  content/             tours.ts, reviews.ts  (bilingual data)
  lib/                 i18n, locale + currency contexts, formatting/pricing
  config/              site.ts (brand, WhatsApp, trust)
prisma/schema.prisma   Phase 2 data model (bookings, payments, coupons, ...)
```

Bilingual **ES/EN** everywhere (locale context + cookie for SSR + browser detection).
Multi-currency **USD/EUR/COP/MXN** with reference rates in `lib/format.ts`.

## Feature status vs. the 50-item plan

### Done (Phase 1 — no external accounts)
Tour landing pages (gallery, itinerary, included/excluded, per-tour FAQ, difficulty
badges) · interactive route map (OpenStreetMap) · live weather (Open-Meteo) · compare
tours · reviews/social-proof + JSON-LD aggregate rating · trust indicators · urgency
pills · group-size price calculator with deposit · multi-currency · bilingual ES/EN +
auto-detect · SEO + Open Graph per page · sitemap/robots · email-capture + exit-intent
popups · floating WhatsApp + pre-filled messages · GA4/Meta Pixel loaders (inert until IDs set).

### To wire (Phase 2 — needs your accounts, schema is ready)
Stripe checkout + deposits + "pay later" · real availability calendar · one-page checkout ·
admin dashboard (block dates, view revenue) · QR ticket emails · automated email sequences
(Resend) · abandoned-booking recovery · SMS/WhatsApp reminders (Twilio) · digital waivers ·
coupon redemption (schema in place; client codes today) · gift cards · referral/affiliate
portal · loyalty · auto-collected post-trip reviews · weather rebooking flow · Google
Calendar sync · checkout upsells.

## Phase 2 setup (when ready)

1. Create a Postgres DB (Neon or Supabase) → set `DATABASE_URL`.
2. `npx prisma migrate dev --name init`
3. Stripe account → set `STRIPE_*` keys, add the webhook endpoint.
4. Resend (email) and Twilio (SMS/WhatsApp) → set their keys.
5. Set the same vars in Vercel → Project → Settings → Environment Variables.

## Deploy (Vercel)

Push to GitHub (`origin` is already set). In Vercel, "Import Project" from the
`atlante` repo — it auto-detects Next.js. No config needed for Phase 1.

## Notes

- Only `og-atlante.jpg` and `logo.png` ship as real imagery; galleries reuse the hero
  as a placeholder. Drop real trip photos into `public/` and update `gallery`/`heroImage`
  in `content/tours.ts`.
- WhatsApp number, brand and trust numbers live in `src/config/site.ts`.
