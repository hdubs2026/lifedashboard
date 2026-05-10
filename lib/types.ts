export interface DailyEntry {
  id: string;
  date: string;
  checking_balance: number | null;
  savings_balance: number | null;
  roth_balance: number | null;
  prayer_done: boolean;
  bible_done: boolean;
  workout_done: boolean;
  journal_done: boolean;
  reflection: string | null;
  created_at: string;
}

export interface WhoopDaily {
  id: string;
  date: string;
  recovery_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  sleep_performance: number | null;
  sleep_hours: number | null;
  strain_score: number | null;
  created_at: string;
}

export interface JobberDaily {
  id: string;
  date: string;
  revenue_today: number | null;
  revenue_mtd: number | null;
  jobs_completed_today: number | null;
  jobs_completed_mtd: number | null;
  estimates_sent_today: number | null;
  open_estimates: number | null;
  avg_response_time_hours: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  date: string;
  title: string;
  source: 'ai_agent' | 'notion' | 'manual';
  priority: 'High' | 'Medium' | 'Low';
  category: TaskCategory;
  completed: boolean;
  created_at: string;
}

export type TaskCategory =
  | 'Tap Ins'
  | 'Personal'
  | 'Golf'
  | 'Faith'
  | 'Finance'
  | 'Health'
  | 'Evergreen'
  | 'Smart Pro';

export interface GolfRound {
  id: string;
  date: string;
  course: string | null;
  score: number | null;
  handicap_index: number | null;
  notes: string | null;
  created_at: string;
}

export interface DashboardData {
  whoop: WhoopDaily | null;
  jobber: JobberDaily | null;
  entry: DailyEntry | null;
  tasks: Task[];
  golfRounds: GolfRound[];
  streaks: HabitStreaks;
}

export interface HabitStreaks {
  prayer: number;
  bible: number;
  workout: number;
}

export interface AiTaskResponse {
  title: string;
  category: string;
  priority: string;
}
