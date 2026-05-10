import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { Task } from '@/lib/types';

export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', today)
      .in('source', ['ai_agent', 'manual'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ tasks: (data ?? []) as Task[] });
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json() as { title: string; category?: string; priority?: string };
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        date: today,
        title: body.title,
        source: 'manual',
        priority: body.priority ?? 'Medium',
        category: body.category ?? 'Personal',
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data as Task });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json() as { id: string; completed: boolean };

    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: body.completed })
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data as Task });
  } catch (err) {
    console.error('PATCH /api/tasks error:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
