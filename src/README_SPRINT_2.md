# KTC Trade Manager — Sprint 2 Buyer CRM

This update improves the Buyers module and buyer profile UX while keeping the existing Supabase/backend logic unchanged.

## Files changed / added

- `src/pages/Clients.jsx`
- `src/pages/ClientProfile.jsx`
- `src/components/Sidebar.jsx`
- `src/index.css`
- `src/components/buyers/LeadScoreBadge.jsx`
- `src/components/buyers/BuyerSummaryCards.jsx`
- `src/components/buyers/BuyerActionCenter.jsx`
- `src/components/buyers/BuyerProfileTimeline.jsx`

## What changed

- Cleaner Buyer CRM page with search, filters, score sorting, CSV import, add/edit buyer modal, and buyer action center.
- Better buyer profile with metrics, contact details, next actions, quick email/WhatsApp draft copy buttons, and timeline.
- Clearer hot/warm/nurture/cold lead score system.
- Improved responsive layout for desktop and mobile.

## How to deploy

After replacing the files:

```bash
npm install
npm run build
git add .
git commit -m "Sprint 2 buyer CRM redesign"
git push
```

Netlify should redeploy automatically if connected to GitHub.
