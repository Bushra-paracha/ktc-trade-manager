# KTC Trade Manager — Sprint 6

## Focus
Tasks, follow-ups, and daily outreach workflow.

## What changed
- Redesigned `src/pages/Tasks.jsx` into a daily operations command center.
- Added task KPI cards for active work, overdue tasks, due-today items, and buyer follow-ups.
- Added a buyer action queue powered by existing CRM clients.
- Added one-click creation of WhatsApp follow-up tasks for priority buyers.
- Added copy-ready WhatsApp and email follow-up drafts.
- Added Kanban/List/Action Center views.
- Added search, priority, status, and category filters.
- Added CSV export for current filtered task list.
- Added responsive mobile styles.

## Backend notes
No database schema changes were made. This update continues using the existing `tasks` and `clients` tables.

## Deploy
```bash
npm run build
git add .
git commit -m "Sprint 6 tasks and follow-up command center"
git push
```
