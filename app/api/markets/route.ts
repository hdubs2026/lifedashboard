import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const TICKERS = ['^GSPC', '^IXIC', '^DJI', 'BTC-USD'];

const LABELS: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW',
  'BTC-USD': 'BTC',
};

export interface MarketQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      TICKERS.map((t) => yahooFinance.quote(t))
    );

    const quotes: MarketQuote[] = results
      .map((r, i) => {
        if (r.status !== 'fulfilled') return null;
        const q = r.value as { regularMarketPrice?: number; regularMarketChange?: number; regularMarketChangePercent?: number };
        return {
          symbol: TICKERS[i],
          label: LABELS[TICKERS[i]] ?? TICKERS[i],
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
        };
      })
      .filter((q): q is MarketQuote => q !== null);

    return NextResponse.json({ quotes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('GET /api/markets error:', err);
    return NextResponse.json({ quotes: [] });
  }
}
