# Evergreen Dashboard

Personal operating system for Hunter Warren. Single dark-mode browser tab — health, business, finance, faith, and golf in one place.

## Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Supabase** (Postgres + Auth via magic link)
- **Tailwind CSS**
- **Anthropic API** (claude-sonnet-4-5) for daily AI task generation
- **Notion API** for task sync
- **Vercel** for deployment

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd evergreen-dashboard
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL editor, run the contents of `supabase/migrations/001_initial_schema.sql`
3. In Auth → Settings, enable magic link (OTP) and set your site URL

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `NOTION_API_KEY` | [notion.so/my-integrations](https://notion.so/my-integrations) |
| `NOTION_TASKS_DATABASE_ID` | Notion database URL (the 32-char ID after the workspace name) |
| `WEBHOOK_SECRET` | Any random string (used to authenticate Zapier webhooks) |
| `WHOOP_ACCESS_TOKEN` | See WHOOP setup below |

### 4. WHOOP Integration

WHOOP uses OAuth. To get a long-lived access token:

1. Create a WHOOP developer app at [developer.whoop.com](https://developer.whoop.com)
2. Complete the OAuth flow to get an access token
3. Set `WHOOP_ACCESS_TOKEN` in your `.env.local`

The dashboard calls `/api/whoop` on each page load, which fetches your latest recovery, sleep, and strain data from the WHOOP API and upserts it into `whoop_daily`. If no token is set, all WHOOP values display as `--`.

### 5. Notion Tasks Database

Your Notion database must have these exact properties:

| Property | Type | Values |
|---|---|---|
| Name | Title | — |
| Done | Checkbox | — |
| Priority | Select | High, Medium, Low |
| Category | Select | Tap Ins, Personal, Golf, Faith, Finance, Health, Evergreen, Smart Pro |
| Date | Date | — |

Connect your Notion integration to the database (Share → Invite integration).

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Enter your email to receive a magic link.

---

## Zapier — Jobber Webhook

To push Jobber data to the dashboard:

1. **Trigger**: Jobber — New/Updated Invoice (or Job Completed)
2. **Action**: Webhooks by Zapier — POST to `https://your-vercel-url.vercel.app/api/webhook/jobber`
3. **Headers**: `x-webhook-secret: <your WEBHOOK_SECRET>`
4. **Body** (JSON):
```json
{
  "revenue_today": 1200.00,
  "revenue_mtd": 18500.00,
  "jobs_completed_today": 3,
  "jobs_completed_mtd": 47,
  "estimates_sent_today": 2,
  "open_estimates": 5,
  "avg_response_time_hours": 1.5,
  "date": "2026-05-09"
}
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy — auto-deploys on push to `main`
5. Update your Zapier webhook URL to the production Vercel URL

---

## Daily Flow

1. Open the dashboard in the morning → morning modal fires (if no entry for today)
2. Fill in finance balances, habit toggles, optional golf round, reflection
3. Submit → AI tasks generate automatically (5–8 tasks based on your WHOOP data + business metrics)
4. Work through the day using the task list
5. Check off Faith & Habit items as you complete them
