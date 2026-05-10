import type { MonthlyJobberData } from './types';

interface DailyRow {
  date: string;
  revenue_mtd: number | null;
  jobs_completed_mtd: number | null;
  estimates_sent_mtd: number | null;
  estimates_accepted_mtd: number | null;
}

export function aggregateMonthlyJobber(rows: DailyRow[]): MonthlyJobberData[] {
  const monthMap = new Map<string, {
    revenue: number;
    jobs: number;
    estimatesSent: number;
    estimatesAccepted: number;
  }>();

  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const existing = monthMap.get(key) ?? { revenue: 0, jobs: 0, estimatesSent: 0, estimatesAccepted: 0 };
    monthMap.set(key, {
      // All MTD values are cumulative — take the highest seen value (= end-of-month total)
      revenue: Math.max(existing.revenue, row.revenue_mtd ?? 0),
      jobs: Math.max(existing.jobs, row.jobs_completed_mtd ?? 0),
      // Use MTD counts so conversion reflects full-month cohort, not same-day approvals
      estimatesSent: Math.max(existing.estimatesSent, row.estimates_sent_mtd ?? 0),
      estimatesAccepted: Math.max(existing.estimatesAccepted, row.estimates_accepted_mtd ?? 0),
    });
  }

  const keys = Array.from(monthMap.keys()).sort();

  return keys.map((key, i) => {
    const d = monthMap.get(key)!;
    const prev = i > 0 ? monthMap.get(keys[i - 1]) : null;
    const momGrowth = prev && prev.revenue > 0
      ? ((d.revenue - prev.revenue) / prev.revenue) * 100
      : null;
    const conversionRate = d.estimatesSent > 0
      ? (d.estimatesAccepted / d.estimatesSent) * 100
      : null;
    const [year, month] = key.split('-');
    const label = new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    return {
      month: label,
      monthKey: key,
      revenue: d.revenue,
      jobs: d.jobs,
      estimatesSent: d.estimatesSent,
      estimatesAccepted: d.estimatesAccepted,
      conversionRate,
      momGrowth,
    };
  });
}
