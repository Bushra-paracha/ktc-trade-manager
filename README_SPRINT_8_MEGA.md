# KTC Trade Manager — Sprint 8 Mega Update

This combined release speeds up the remaining roadmap into one deployable update.

## New pages added

- `/quotes` — Quotation + Proforma Invoice Generator
- `/templates` — Email and WhatsApp outreach templates
- `/lead-scoring` — Buyer lead scoring and priority queue
- `/website-growth` — Website improvement plan, FAQ, Vision/Mission draft
- `/amazon-setup` — Himalayan Pink Salt Amazon USA/UK setup workflow

## Updated files

- `src/App.jsx`
- `src/data/navItems.js`
- `src/components/GlobalSearch.jsx`
- `src/index.css`

## New files

- `src/pages/QuotationGenerator.jsx`
- `src/pages/Templates.jsx`
- `src/pages/LeadScoring.jsx`
- `src/pages/WebsiteGrowth.jsx`
- `src/pages/AmazonSetup.jsx`

## Backend impact

No Supabase schema changes were made. This release is frontend-only and safe to deploy.

## Deploy

```bash
npm run build
git add .
git commit -m "Sprint 8 mega update sales tools and growth workflows"
git push
```

Netlify should redeploy automatically after the push.
