import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAnthropicClient } from '@/lib/anthropic';
import type { AiTaskResponse, Task } from '@/lib/types';

export async function POST() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch all context in parallel
    const [whoopResult, jobberResult, entryResult, tasksResult, golfResult] =
      await Promise.allSettled([
        supabase.from('whoop_daily').select('*').eq('date', today).maybeSingle(),
        supabase.from('jobber_daily').select('*').eq('date', today).maybeSingle(),
        supabase.from('daily_entries').select('*').eq('date', today).maybeSingle(),
        supabase
          .from('tasks')
          .select('*')
          .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
          .order('created_at', { ascending: false }),
        supabase
          .from('golf_rounds')
          .select('*')
          .order('date', { ascending: false })
          .limit(3),
      ]);

    const whoop = whoopResult.status === 'fulfilled' ? whoopResult.value.data : null;
    const jobber = jobberResult.status === 'fulfilled' ? jobberResult.value.data : null;
    const entry = entryResult.status === 'fulfilled' ? entryResult.value.data : null;
    const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value.data ?? []) : [];
    const golfRounds = golfResult.status === 'fulfilled' ? (golfResult.value.data ?? []) : [];

    // Compute task completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    // Build habits list
    const habitsDone: string[] = [];
    if (entry?.prayer_done) habitsDone.push('Prayer');
    if (entry?.bible_done) habitsDone.push('Bible');
    if (entry?.workout_done) habitsDone.push('Workout');
    if (entry?.journal_done) habitsDone.push('Journal');

    const userPrompt = `Today's data:
- Recovery: ${whoop?.recovery_score ?? 'N/A'}% | HRV: ${whoop?.hrv ?? 'N/A'}ms | Strain: ${whoop?.strain_score ?? 'N/A'} | Sleep: ${whoop?.sleep_hours ?? 'N/A'}hrs
- Revenue MTD: $${jobber?.revenue_mtd ?? 'N/A'} | Jobs today: ${jobber?.jobs_completed_today ?? 'N/A'} | Open estimates: ${jobber?.open_estimates ?? 'N/A'}
- Habits done today: ${habitsDone.length > 0 ? habitsDone.join(', ') : 'None'}
- Task completion rate last 7 days: ${completionRate}%
- Recent golf: ${golfRounds.length > 0 ? golfRounds.map((r) => `${r.score} at ${r.course}`).join(', ') : 'No recent rounds'}

Generate exactly ${completionRate < 60 ? '5' : '7'} tasks for today. Rules:
${(whoop?.recovery_score ?? 100) < 50 ? '- Recovery is low: avoid high-intensity physical tasks' : ''}
${(jobber?.open_estimates ?? 0) > 3 ? '- Open estimates > 3: include a follow-up on open estimates' : ''}
${completionRate < 60 ? '- Completion rate is low: use fewer tasks, High priority only' : ''}
- Each task: title (under 10 words), category (must be exactly one of: Tap Ins, Personal, Golf, Faith, Finance, Health, Evergreen, Smart Pro), priority (High, Medium, or Low — exact casing)
- Return ONLY a valid JSON array. No preamble. No explanation.
Format: [{"title": "...", "category": "...", "priority": "..."}]`;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system:
        'You are a personal advisor for Hunter Warren. He is a finance student at Clemson, manager of Evergreen Landscaping & Design (targeting 100 recurring maintenance contracts), and a young entrepreneur. He values efficiency, faith, and long-term thinking. He does not want fluff.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    let aiTasks: AiTaskResponse[] = [];
    try {
      // Strip any markdown code fences if present
      const cleaned = rawText.replace(/```(?:json)?\n?/g, '').trim();
      aiTasks = JSON.parse(cleaned) as AiTaskResponse[];
    } catch {
      console.error('Failed to parse AI response:', rawText);
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    // Write tasks to DB
    const taskRows = aiTasks.map((t) => ({
      date: today,
      title: t.title,
      source: 'ai_agent',
      priority: t.priority,
      category: t.category,
      completed: false,
    }));

    // Delete today's ai_agent tasks first (regenerate)
    await supabase.from('tasks').delete().eq('date', today).eq('source', 'ai_agent');

    const { data: inserted, error: insertError } = await supabase
      .from('tasks')
      .insert(taskRows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ tasks: (inserted ?? []) as Task[] });
  } catch (err) {
    console.error('POST /api/tasks/generate error:', err);
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 });
  }
}
