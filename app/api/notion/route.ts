import { NextResponse } from 'next/server';
import { fetchNotionTasks } from '@/lib/notion';
import type { Task } from '@/lib/types';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await fetchNotionTasks(today);
    return NextResponse.json({ tasks: tasks as Task[] });
  } catch (err) {
    console.error('GET /api/notion error:', err);
    // Don't 500 — return empty so dashboard still loads
    return NextResponse.json({ tasks: [] });
  }
}
