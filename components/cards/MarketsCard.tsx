'use client';

import { useState, useEffect } from 'react';
import type { MarketQuote } from '@/app/api/markets/route';

function fmt(n: number, symbol: string): string {
  if (symbol === 'BTC-USD') return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 10000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function QuoteRow({ q }: { q: MarketQuote }) {
  const up = q.change >= 0;
  const color = up ? '#00ff87' : '#ff4444';
  const sign = up ? '+' : '';

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
      <span
        className="text-[#666] uppercase tracking-widest"
        style={{ fontSize: 10, fontFamily: 'Geist, sans-serif', width: 64 }}
      >
        {q.label}
      </span>
      <span
        className="text-white tabular-nums"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 13 }}
      >
        {fmt(q.price, q.symbol)}
      </span>
      <span
        className="tabular-nums text-right"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color, width: 56 }}
      >
        {sign}{q.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}

export default function MarketsCard() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/markets');
        const data = await res.json() as { quotes: MarketQuote[] };
        setQuotes(data.quotes ?? []);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // silent
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[#444] uppercase tracking-widest"
          style={{ fontSize: 10, fontFamily: 'Geist, sans-serif' }}
        >
          Markets
        </p>
        {lastUpdated && (
          <span className="text-[#333]" style={{ fontSize: 9, fontFamily: 'DM Mono, monospace' }}>
            {lastUpdated}
          </span>
        )}
      </div>

      <div className="flex-1">
        {quotes.length === 0 ? (
          <p className="text-[#333] text-sm" style={{ fontFamily: 'Geist, sans-serif' }}>
            Loading...
          </p>
        ) : (
          quotes.map((q) => <QuoteRow key={q.symbol} q={q} />)
        )}
      </div>
    </div>
  );
}
