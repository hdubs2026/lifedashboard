import { NextRequest, NextResponse } from 'next/server';
import { jobberQuery } from '@/lib/jobber-api';

// Probe Jobber schema to find correct filter field names
const PROBE_QUERY = `
  query Probe {
    invoices(first: 1) {
      nodes {
        id
        amounts { invoiceBalance depositAmount paymentsTotal }
        issuedDate
        createdAt
      }
    }
    jobs(first: 1) {
      nodes {
        id
        jobStatus
        endAt
        startAt
        createdAt
      }
    }
    quotes(first: 1) {
      nodes {
        id
        quoteStatus
        createdAt
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await jobberQuery(PROBE_QUERY);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
