import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { Task } from '@/lib/types';

// Called by the daily Claude Code cron after it extracts action items from email/texts
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const body = await request.json() as Array<{ title: string; category?: string; priority?: string }>;
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const taskRows = body.map((t) => ({
      date: today,
      title: t.title,
      source: 'manual' as const,
      priority: t.priority ?? 'Medium',
      category: t.category ?? 'Personal',
      completed: false,
    }));

    // Deduplicate: skip titles already added today
    const { data: existing } = await supabase
      .from('tasks')
      .select('title')
      .eq('date', today);

    const existingTitles = new Set((existing ?? []).map((t: { title: string }) => t.title.toLowerCase()));
    const newRows = taskRows.filter((r) => !existingTitles.has(r.title.toLowerCase()));

    if (newRows.length === 0) {
      return NextResponse.json({ tasks: [], message: 'All tasks already exist for today.' });
    }

    const { data: inserted, error } = await supabase.from('tasks').insert(newRows).select();
    if (error) throw error;

    return NextResponse.json({ tasks: (inserted ?? []) as Task[] });
  } catch (err) {
    console.error('POST /api/tasks/generate error:', err);
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 });
  }
}
