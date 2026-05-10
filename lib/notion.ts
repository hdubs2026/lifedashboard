import { Client } from '@notionhq/client';
import type { Task, TaskCategory } from './types';

let client: Client | null = null;

function getNotionClient(): Client {
  if (!client) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('Missing NOTION_API_KEY environment variable');
    }
    client = new Client({ auth: apiKey });
  }
  return client;
}

const VALID_CATEGORIES: TaskCategory[] = [
  'Tap Ins', 'Personal', 'Golf', 'Faith', 'Finance', 'Health', 'Evergreen', 'Smart Pro',
];

function normalizeCategory(raw: string | null | undefined): TaskCategory {
  if (!raw) return 'Personal';
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.toLowerCase()
  );
  return match ?? 'Personal';
}

function normalizePriority(raw: string | null | undefined): 'High' | 'Medium' | 'Low' {
  if (!raw) return 'Medium';
  const lower = raw.toLowerCase();
  if (lower === 'high') return 'High';
  if (lower === 'low') return 'Low';
  return 'Medium';
}

export async function fetchNotionTasks(today: string): Promise<Task[]> {
  const notion = getNotionClient();
  const databaseId = process.env.NOTION_TASKS_DATABASE_ID;

  if (!databaseId) {
    throw new Error('Missing NOTION_TASKS_DATABASE_ID environment variable');
  }

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'Done',
          checkbox: { equals: false },
        },
        {
          or: [
            {
              property: 'Date',
              date: { equals: today },
            },
            {
              property: 'Date',
              date: { is_empty: true },
            },
          ],
        },
      ],
    },
  });

  return response.results
    .filter((page) => 'properties' in page)
    .map((page) => {
      const props = (page as { id: string; properties: Record<string, unknown> }).properties;

      const nameObj = props['Name'] as { title?: Array<{ plain_text: string }> } | undefined;
      const title = nameObj?.title?.[0]?.plain_text ?? 'Untitled';

      const priorityObj = props['Priority'] as { select?: { name: string } } | undefined;
      const categoryObj = props['Category'] as { select?: { name: string } } | undefined;

      return {
        id: page.id,
        date: today,
        title,
        source: 'notion' as const,
        priority: normalizePriority(priorityObj?.select?.name),
        category: normalizeCategory(categoryObj?.select?.name),
        completed: false,
        created_at: new Date().toISOString(),
      };
    });
}
