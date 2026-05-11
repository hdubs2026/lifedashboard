import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { jobberQuery } from '@/lib/jobber-api';

interface InvoiceNode { amounts: { invoiceBalance: number; paymentsTotal: number } }
interface QuoteNode { quoteStatus: string }

interface MonthData {
  invoices: { nodes: InvoiceNode[] };
  jobs: { totalCount: number };
  quotesSent: { nodes: QuoteNode[] };
}

const MONTH_QUERY = `
  query JobberMonth(
    $start: ISO8601DateTime!
    $end: ISO8601DateTime!
  ) {
    invoices(filter: { issuedDate: { after: $start, before: $end } }) {
      nodes { amounts { invoiceBalance paymentsTotal } }
    }
    jobs(filter: { status: COMPLETE, endAt: { after: $start, before: $end } }) {
      totalCount
    }
    quotesSent: quotes(filter: { createdAt: { after: $start, before: $end } }) {
      nodes { quoteStatus }
    }
  }
`;

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthsBack = parseInt(request.nextUrl.searchParams.get('months') ?? '12');
  const supabase = createServerClient();
  const results: Array<{ month: string; revenue: number; jobs: number; sent: number; accepted: number }> = [];
  const errors: Array<{ month: string; error: string }> = [];

  const now = new Date();

  for (let i = monthsBack; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const start = `${monthKey}-01T00:00:00Z`;
    const lastDay = lastDayOfMonth(year, month);
    const end = `${lastDay}T23:59:59Z`;

    try {
      const data = await jobberQuery<MonthData>(MONTH_QUERY, { start, end });

      const revenue_mtd = data.invoices.nodes.reduce((s, n) => s + (n.amounts?.invoiceBalance ?? 0) + (n.amounts?.paymentsTotal ?? 0), 0);
      const jobs_completed_mtd = data.jobs.totalCount;
      const estimates_sent_mtd = data.quotesSent.nodes.length;
      const estimates_accepted_mtd = data.quotesSent.nodes.filter(
        (q) => q.quoteStatus === 'converted'
      ).length;

      await supabase.from('jobber_daily').upsert(
        {
          date: lastDay,
          revenue_today: null,
          revenue_mtd,
          jobs_completed_today: null,
          jobs_completed_mtd,
          estimates_sent_today: null,
          estimates_sent_mtd,
          estimates_accepted_today: null,
          estimates_accepted_mtd,
          open_estimates: null,
        },
        { onConflict: 'date' }
      );

      results.push({ month: monthKey, revenue: revenue_mtd, jobs: jobs_completed_mtd, sent: estimates_sent_mtd, accepted: estimates_accepted_mtd });
    } catch (err) {
      errors.push({ month: monthKey, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, imported: results.length, results, errors });
}
