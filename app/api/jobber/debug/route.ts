import { NextRequest, NextResponse } from 'next/server';
import { jobberQuery } from '@/lib/jobber-api';

const PROBE_QUERY = `
  query Probe {
    __type(name: "QuoteFilterAttributes") {
      name
      inputFields { name type { name kind ofType { name kind } } }
    }
    __type2: __type(name: "QuoteStatusEnum") {
      name
      enumValues { name }
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
