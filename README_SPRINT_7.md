# KTC Trade Manager — Sprint 7

## Focus
Global Search + Quick Actions

## What changed
- Added a new global search modal in `src/components/GlobalSearch.jsx`
- Updated `src/components/Topbar.jsx` to open global search
- Added keyboard shortcut: `Cmd + K` on Mac / `Ctrl + K` on Windows
- Search now covers:
  - Buyers
  - Orders
  - Products
  - Tasks
  - Shipments
  - Order documents
- Added quick action cards for:
  - Add buyer
  - Create order
  - Follow-up tasks
  - Amazon salt packs
- Made the topbar visible on desktop as a true command bar
- Added responsive mobile search behavior

## Backend safety
No Supabase tables or backend logic were changed.

## Files changed
- `src/components/Topbar.jsx`
- `src/components/GlobalSearch.jsx`
- `src/index.css`

## Deploy
After replacing the files, run:

```bash
npm run build
git add .
git commit -m "Sprint 7 global search and quick actions"
git push
```

Netlify should redeploy after the push.
