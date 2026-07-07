# KTC Trade Manager — Sprint 1 UI/UX Update

This ZIP contains the updated `src/` folder for Sprint 1.

## What changed

- Simplified sidebar into grouped CRM sections: Home, Buyers, Orders, Products, Operations, Insights.
- Added a more polished KTC brand panel and daily focus card.
- Improved topbar for tablet/mobile with search and quick create action.
- Rebuilt the dashboard as a cleaner command center.
- Added reusable dashboard components under `src/components/dashboard/`.
- Updated CSS for the new dashboard, cards, quick actions, pipeline bars, alerts, and mobile behavior.

## Files changed

- `src/data/navItems.js`
- `src/components/Sidebar.jsx`
- `src/components/Topbar.jsx`
- `src/pages/Dashboard.jsx`
- `src/index.css`
- `src/components/dashboard/*`

## How to install

1. Back up your current project.
2. Replace your current `src/` folder with the `src/` folder in this ZIP.
3. In your project root, run:

```bash
npm install
npm run dev
```

4. If the local app looks good, build it:

```bash
npm run build
```

5. Deploy the updated project to Netlify/Vercel.

## Build check

I tested this update with:

```bash
npm run build
```

The build completed successfully. Vite showed a chunk-size warning, but that existed as a normal optimization warning and does not block deployment.
