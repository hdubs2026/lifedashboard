import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { jobberQuery } from '@/lib/jobber-api';

interface InvoiceNode { amounts: { invoiceBalance: number; paymentsTotal: number } }
interface QuoteNode { quoteStatus: string }

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
    invoicesMtd: invoices(filter: { issuedDate: { after: $mtdStart, before: $todayEnd } }) {
      nodes { amounts { invoiceBalance paymentsTotal } }
    }
    invoicesToday: invoices(filter: { issuedDate: { after: $todayStart, before: $todayEnd } }) {
      nodes { amounts { invoiceBalance paymentsTotal } }
    }
    jobsMtd: jobs(filter: { jobStatus: COMPLETE, endAt: { after: $mtdStart, before: $todayEnd } }) {
      totalCount
    }
    jobsToday: jobs(filter: { jobStatus: COMPLETE, endAt: { after: $todayStart, before: $todayEnd } }) {
      totalCount
    }
    quotesMtd: quotes(filter: { createdAt: { after: $mtdStart, before: $todayEnd } }) {
      nodes { quoteStatus }
    }
    quotesToday: quotes(filter: { createdAt: { after: $todayStart, before: $todayEnd } }) {
      nodes { quoteStatus }
    }
    quotesOpen: quotes(filter: { quoteStatus: AWAITING_RESPONSE }) {
      totalCount
    }
  }
`;

export async function GET(request: NextRequest) {
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

    // Total invoice value = balance still owed + already paid
    const sumBalance = (nodes: InvoiceNode[]) =>
      nodes.reduce((s, n) => s + (n.amounts?.invoiceBalance ?? 0) + (n.amounts?.paymentsTotal ?? 0), 0);

    const revenue_mtd = sumBalance(data.invoicesMtd.nodes);
    const revenue_today = sumBalance(data.invoicesToday.nodes);
    const jobs_completed_mtd = data.jobsMtd.totalCount;
    const jobs_completed_today = data.jobsToday.totalCount;

    const countStatus = (nodes: QuoteNode[], status: string) =>
      nodes.filter((q) => q.quoteStatus === status).length;

    const estimates_sent_today = data.quotesToday.nodes.length;
    const estimates_sent_mtd = data.quotesMtd.nodes.length;
    // MTD conversion: of all quotes sent this month, how many are currently converted
    // (regardless of when they were approved — fixes the always-0% issue)
    const estimates_accepted_today = countStatus(data.quotesToday.nodes, 'converted');
    const estimates_accepted_mtd = countStatus(data.quotesMtd.nodes, 'converted');
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
        estimates_sent_mtd,
        estimates_accepted_today,
        estimates_accepted_mtd,
        open_estimates,
      },
      { onConflict: 'date' }
    );

    if (error) throw error;

    console.log(`Jobber sync complete for ${today}:`, {
      revenue_mtd, jobs_completed_mtd, estimates_sent_mtd, estimates_accepted_mtd,
    });

    return NextResponse.json({ ok: true, date: today, revenue_mtd, jobs_completed_mtd, estimates_sent_mtd, estimates_accepted_mtd });
  } catch (err) {
    console.error('Jobber sync error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
