# Kanban Board

A fast, friendly Kanban board for small teams — create cards, drag them across your workflow, and keep everyone in sync.

**Live demo:** https://kanban-board-e1c.pages.dev

## Features

- **Kanban board** with four columns (To Do, In Progress, In Review, Done), smooth drag-and-drop (mouse, touch, and keyboard via [dnd-kit](https://dndkit.com/)), and Trello-style inline card composers.
- **Guest sessions** — Supabase anonymous auth creates a private board on first visit. Every table is protected by Row Level Security, so each guest can only ever read or write their own data. Open a private window to see a second, fully isolated guest board.
- **Card details** — description, priority, due date, labels, and assignees in a Trello-style modal.
- **Team members** — add teammates with colored avatars and assign one or more to a card.
- **Comments** — threaded conversation per card with timestamps.
- **Activity log** — every change (status moves, edits, assignments, labels, comments) is recorded **by database triggers** and shown as a timeline ("moved this card from To Do to In Progress · 2 hours ago"). Clients can't forge history: the activity table is read-only for users.
- **Labels** — create custom colored labels and filter the board by them.
- **Search & filters** — filter by title, priority, assignee, or label, in any combination.
- **Due-date indicators** — overdue / due-today / due-soon badges directly on cards, plus an overdue counter in the header.
- **Board stats** — total, done, and overdue counts at a glance.
- **Realtime sync** — open two tabs and watch changes flow between them (Supabase Realtime).
- **Light & dark themes**, responsive layout with snap-scrolling columns on mobile, skeleton loading states, and actionable error states throughout.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (design tokens via CSS variables), Radix UI primitives |
| Drag & drop | dnd-kit |
| Data fetching | TanStack Query with optimistic updates |
| Backend | Supabase (Postgres, anonymous auth, RLS, Realtime) |

## Architecture notes

- **Optimistic UI everywhere.** Creates, moves, edits, and deletes update the TanStack Query cache immediately, then reconcile with the server; failures roll back and surface a toast.
- **Fractional ordering.** Cards store a float `position`; dropping a card between two neighbors assigns their midpoint, so any reorder is a single-row update.
- **Trigger-driven activity log.** Postgres triggers (SECURITY DEFINER) write the audit trail so it stays consistent no matter how rows change, and RLS keeps it read-only for clients.
- **No custom backend.** The frontend talks to Supabase directly; RLS is the authorization layer. (A thin API could be added later for cross-user features.)

## Isolation model

Two independent layers keep one guest's board away from another's:

1. **Row Level Security** scopes every table to `auth.uid()`.
2. **Composite foreign keys** carry `user_id` into every relationship —
   `(task_id, user_id) references tasks (id, user_id)` rather than
   `references tasks (id)`.

The second layer matters more than it looks. RLS alone does not stop a guest
from *linking* to another guest's rows: a policy of `user_id = auth.uid()` is
satisfied because `user_id` defaults to the caller's own id, and PostgreSQL
deliberately suppresses row security while checking referential integrity. So a
plain foreign key would happily resolve another tenant's task or member — and
the activity triggers would then copy that member's name into the attacker's
own readable feed. Carrying `user_id` through the key makes the link impossible
to form at all.

[`supabase/tests/`](supabase/tests/) contains an executable proof: eight
cross-guest attacks that must all fail, runnable against a throwaway Postgres
container with no Supabase project required.

A note on realtime, since it's easy to state incorrectly: INSERT and UPDATE
events **are** filtered by RLS, so no other guest's row data is delivered.
DELETE events are **not** — Postgres cannot evaluate a policy against a row
that no longer exists, and Supabase does not support filters on delete events —
so subscribers receive delete notifications carrying primary keys only. The
client ignores deletes for rows it doesn't already hold.

Before any real deployment, anonymous sign-ups should also get CAPTCHA
protection (Authentication → Providers → Anonymous) and a scheduled job to
delete stale anonymous users; `on delete cascade` on `user_id` already cleans
up every table.

## Run it locally

1. **Install dependencies** (Node 20+):

   ```bash
   npm install
   ```

2. **Create a Supabase project** (free tier) at [supabase.com](https://supabase.com), then:
   - Enable **Authentication → Sign In / Providers → Anonymous**.
   - Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).

3. **Configure environment** — copy `.env.example` to `.env.local` and fill in your project's values from **Settings → API**:

   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   Only the public anon key goes here — never the service role key.

4. **Start the dev server**:

   ```bash
   npm run dev
   ```

The app signs you in as a guest automatically and shows an empty board — create a card, or click **Load sample board** to explore with realistic data.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview the production build |

## Database schema

The full schema — tables, indexes, RLS policies, and activity triggers — lives in [`supabase/schema.sql`](supabase/schema.sql).

| Table | Purpose |
| --- | --- |
| `tasks` | Cards: title, description, status, priority, due date, fractional position |
| `team_members` | Named teammates with avatar colors |
| `task_assignees` | Many-to-many card ↔ member |
| `labels` / `task_labels` | Custom labels and their card assignments |
| `comments` | Card comments |
| `task_activity` | Trigger-written audit trail (read-only for clients) |

Every table carries a `user_id` (the anonymous auth user) with RLS policies scoped to `auth.uid()`.
