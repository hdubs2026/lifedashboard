import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { jobberQuery } from '@/lib/jobber-api';

// Jobber GraphQL response types
interface InvoiceNode { amounts: { invoicedAmount: number } }
interface QuoteNode { status: string }
interface JobNode { completedAt: string | null }

interface SyncData {
  invoicesMtd: { nodes: InvoiceNode[] };
  invoicesToday: { nodes: InvoiceNode[] };
  jobsMtd: { totalCount: number };
  jobsToday: { totalCount: number };
  quotesMtd: { nodes: QuoteNode[] };
  quotesToday: { nodes: QuoteNode[] };
  quotesOpen: { totalCount: number };
}

const SYNC_QUERY = `
  query JobberSync(
    $mtdStart: ISO8601DateTime!
    $todayStart: ISO8601DateTime!
    $todayEnd: ISO8601DateTime!
  ) {
    invoicesMtd: invoices(filter: { issuedDate: { gte: $mtdStart, lte: $todayEnd } }) {
      nodes { amounts { invoicedAmount } }
    }
    invoicesToday: invoices(filter: { issuedDate: { gte: $todayStart, lte: $todayEnd } }) {
      nodes { amounts { invoicedAmount } }
    }
    jobsMtd: jobs(filter: { jobStatus: COMPLETED, endAt: { gte: $mtdStart, lte: $todayEnd } }) {
      totalCount
    }
    jobsToday: jobs(filter: { jobStatus: COMPLETED, endAt: { gte: $todayStart, lte: $todayEnd } }) {
      totalCount
    }
    quotesMtd: quotes(filter: { createdAt: { gte: $mtdStart, lte: $todayEnd } }) {
      nodes { status }
    }
    quotesToday: quotes(filter: { createdAt: { gte: $todayStart, lte: $todayEnd } }) {
      nodes { status }
    }
    quotesOpen: quotes(filter: { status: { eq: AWAITING_RESPONSE } }) {
      totalCount
    }
  }
`;

export async function GET(request: NextRequest) {
  // Allow cron (no auth header) or manual calls with webhook secret
  const secret = request.headers.get('x-webhook-secret');
  const isCron = request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const mtdStart = `${today.slice(0, 7)}-01T00:00:00Z`;
    const todayStart = `${today}T00:00:00Z`;
    const todayEnd = `${today}T23:59:59Z`;

    const data = await jobberQuery<SyncData>(SYNC_QUERY, { mtdStart, todayStart, todayEnd });

    const sumInvoiced = (nodes: InvoiceNode[]) =>
      nodes.reduce((s, n) => s + (n.amounts?.invoicedAmount ?? 0), 0);

    const revenue_mtd = sumInvoiced(data.invoicesMtd.nodes);
    const revenue_today = sumInvoiced(data.invoicesToday.nodes);
    const jobs_completed_mtd = data.jobsMtd.totalCount;
    const jobs_completed_today = data.jobsToday.totalCount;

    const countStatus = (nodes: QuoteNode[], status: string) =>
      nodes.filter((q) => q.status === status).length;

    const estimates_sent_today = data.quotesToday.nodes.length;
    const estimates_accepted_today = countStatus(data.quotesToday.nodes, 'CONVERTED');
    const estimates_accepted_mtd = countStatus(data.quotesMtd.nodes, 'CONVERTED');
    const estimates_sent_mtd = data.quotesMtd.nodes.length;
    const open_estimates = data.quotesOpen.totalCount;

    const supabase = createServerClient();
    const { error } = await supabase.from('jobber_daily').upsert(
      {
        date: today,
        revenue_today,
        revenue_mtd,
        jobs_completed_today,
        jobs_completed_mtd,
        estimates_sent_today,
        estimates_accepted_today,
        estimates_accepted_mtd,
        open_estimates,
      },
      { onConflict: 'date' }
    );

    if (error) throw error;

    console.log(`Jobber sync complete for ${today}:`, {
      revenue_mtd,
      jobs_completed_mtd,
      estimates_sent_mtd,
      estimates_accepted_mtd,
    });

    return NextResponse.json({ ok: true, date: today, revenue_mtd, jobs_completed_mtd });
  } catch (err) {
    console.error('Jobber sync error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
