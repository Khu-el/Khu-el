// Row shapes for the member-portal Supabase project, as captured from the live
// catalog on 2026-10-03 plus migration 20261003030000_member_portal_hardening.
// Column names are the database's own; keep them in sync with
// supabase/migrations when the schema changes.

export type StaffRole = 'support' | 'editor' | 'admin' | 'owner';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberPreferences {
  user_id: string;
  email_updates: boolean;
  push_updates: boolean;
  product_updates: boolean;
  analytics_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningTrack {
  id: string;
  title: string;
  pillar: string;
  summary: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export const MODULE_CONTENT_TYPES = ['lesson', 'video', 'document', 'exercise', 'assessment'] as const;
export type ModuleContentType = (typeof MODULE_CONTENT_TYPES)[number];

export interface LearningModule {
  id: string;
  track_id: string;
  title: string;
  summary: string | null;
  content_type: ModuleContentType;
  content_url: string | null;
  body: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningProgress {
  id: string;
  user_id: string;
  track_id: string;
  module_id: string;
  progress_percent: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const RESOURCE_TYPES = ['article', 'video', 'document', 'tool', 'template', 'course', 'link'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface Resource {
  id: string;
  title: string;
  resource_type: ResourceType;
  summary: string | null;
  content_url: string | null;
  track_id: string | null;
  tags: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SavedResource {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
}

export const DESTINATION_TYPES = ['learning_track', 'resource', 'service', 'community', 'external'] as const;
export type DestinationType = (typeof DESTINATION_TYPES)[number];

export interface OpportunityPathway {
  id: string;
  title: string;
  summary: string | null;
  keywords: string[];
  destination_type: DestinationType;
  destination_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpportunityBlueprint {
  id: string;
  user_id: string;
  goal: string;
  pathway_key: string | null;
  pathway_snapshot: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const PLAN_STATUSES = ['active', 'completed', 'archived'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface ActionPlan {
  id: string;
  user_id: string;
  goal: string;
  title: string;
  pathway_key: string | null;
  status: PlanStatus;
  start_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface ActionPlanWeek {
  id: string;
  plan_id: string;
  user_id: string;
  week_number: 1 | 2 | 3 | 4;
  title: string;
  action_text: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const SUPPORT_STATUSES = ['submitted', 'in_review', 'in_progress', 'resolved', 'closed'] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_CATEGORIES = ['general', 'account', 'learning', 'technical', 'feedback'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface SupportRequest {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  contact_email: string | null;
  status: SupportStatus;
  staff_note: string | null;
  external_ref: string | null;
  requester_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  kind: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface IntegrationStatus {
  integration_key: string;
  display_name: string;
  state: string;
  public_note: string | null;
  updated_at: string;
}

export interface SignupInvite {
  email: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
  status: 'pending' | 'used' | 'revoked' | 'expired';
}
