# KTC Trade Manager — Sprint 4 Products + Amazon Retail Packs

## What changed

Sprint 4 improves the Products and Amazon modules without changing Supabase tables or backend logic.

### Products
- Redesigned Product Catalog into a product command center.
- Added summary cards for active products, mill stock, average base cost, and Amazon candidates.
- Added tabs for Catalog, Portfolio, and Amazon Packs.
- Added KTC current FOB reference price board.
- Added export CSV action for product catalog.
- Added smarter category inference for rice, salt, and sesame.
- Added retail pack planner for Himalayan Pink Salt 1 lb, 2 lb, and 5 lb.

### Amazon
- Redesigned Amazon page into an Amazon Salt Launch Center.
- Added starter pack cards for 1 lb, 2 lb, and 5 lb Himalayan Pink Salt SKUs.
- Added launch readiness checklist.
- Added reusable listing copy template.
- Added listing cards with price, stock, revenue, units, ACOS, and rating.
- Kept existing manual listing and sales logging functionality.

## Files changed

- `src/pages/Products.jsx`
- `src/pages/Amazon.jsx`
- `src/index.css`
- New folder: `src/components/products/`
  - `ProductSummaryCards.jsx`
  - `ProductPortfolioBoard.jsx`
  - `RetailPackPlanner.jsx`
  - `AmazonLaunchChecklist.jsx`

## Deploy

After replacing files, run:

```bash
npm run build
git add .
git commit -m "Sprint 4 products and Amazon retail redesign"
git push
```

Netlify should redeploy automatically after the push.
