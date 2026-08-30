/* ── API Response Types ─────────────────────────────────────────── */

export interface Resource {
  id: string;
  type: 'course' | 'project' | 'assessment';
  title: string;
  url: string;
  est_hours: number;
  media_type: string;
  skills_taught: string[];
}

export interface PathNode {
  id: string;
  position: number;
  milestone: string;
  reason: string;
  status: string;
  resource: Resource;
}

export interface PathOut {
  id: string;
  learner_id: string;
  goal: string;
  status: string;
  version: number;
  created_at: string;
  nodes: PathNode[];
}

export interface LearnerOut {
  id: string;
  name: string;
  goal: string;
  interests: string[];
  experience_level: string;
  learning_style: string;
  time_budget: number;
  created_at: string;
}

export interface GoalResponse {
  domain: string;
  skill_targets: string[];
  weekly_hours: number;
}

export interface DashboardData {
  progress_percent: number;
  milestones_total: number;
  milestones_done: number;
  known_skills: string[];
  next_actions: string[];
}

export interface ChatResponse {
  answer: string;
}

/* ── Request Bodies ─────────────────────────────────────────────── */

export interface CreateLearnerBody {
  name: string;
  interests: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  learning_style: 'visual' | 'reading' | 'hands_on' | 'mixed';
  time_budget: number;
}

export interface GoalBody {
  goal: string;
}

export interface FeedbackBody {
  rating: number;
  comment: string;
}

export interface ChatBody {
  learner_id: string;
  question: string;
}
