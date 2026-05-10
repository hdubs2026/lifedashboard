import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@/lib/supabase';
import { getAnthropicClient } from '@/lib/anthropic';
import type { Task } from '@/lib/types';

async function fetchRecentEmails(): Promise<string[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return [];

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });
  const threeDaysAgo = Math.floor((Date.now() - 3 * 86400000) / 1000);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${threeDaysAgo} -category:promotions -category:social`,
    maxResults: 20,
  });

  const messages = listRes.data.messages ?? [];
  const snippets: string[] = [];

  await Promise.allSettled(
    messages.map(async (msg) => {
      if (!msg.id) return;
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      });
      const headers = detail.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';
      const from = headers.find((h) => h.name === 'From')?.value ?? '';
      const snippet = detail.data.snippet ?? '';
      if (subject) snippets.push(`From: ${from}\nSubject: ${subject}\nSnippet: ${snippet}`);
    })
  );

  return snippets;
}

export async function POST() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const emailSnippets = await fetchRecentEmails();

    if (emailSnippets.length === 0) {
      return NextResponse.json({ tasks: [], message: 'No email credentials configured or no emails found.' });
    }

    const emailBlock = emailSnippets.join('\n\n---\n\n');

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a personal assistant for Hunter Warren. Extract only concrete, actionable tasks from emails — things that require a response, decision, or follow-up. Ignore newsletters, promotions, and FYI messages. Return ONLY a valid JSON array, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Extract unfinished action items from these recent emails. For each, return a task object with title (under 10 words, starts with a verb), category (one of: Tap Ins, Personal, Golf, Faith, Finance, Health, Evergreen, Smart Pro), priority (High, Medium, or Low).\n\nEmails:\n${emailBlock}\n\nReturn format: [{"title": "...", "category": "...", "priority": "..."}]. If no action items found, return [].`,
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '[]';
    let extracted: Array<{ title: string; category: string; priority: string }> = [];
    try {
      const cleaned = rawText.replace(/```(?:json)?\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ tasks: [], message: 'Failed to parse AI response.' });
    }

    if (extracted.length === 0) {
      return NextResponse.json({ tasks: [], message: 'No action items found in recent emails.' });
    }

    const taskRows = extracted.map((t) => ({
      date: today,
      title: t.title,
      source: 'manual' as const,
      priority: t.priority,
      category: t.category,
      completed: false,
    }));

    const { data: inserted, error } = await supabase.from('tasks').insert(taskRows).select();
    if (error) throw error;

    return NextResponse.json({ tasks: (inserted ?? []) as Task[] });
  } catch (err) {
    console.error('POST /api/tasks/generate error:', err);
    return NextResponse.json({ error: 'Failed to extract tasks' }, { status: 500 });
  }
}
