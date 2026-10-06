export type UrgencyTier = "INFO" | "WARNING" | "LOUD";
export type GroupRole = "owner" | "admin" | "member";
export type EventStatus = "active" | "completed" | "cancelled";

export interface Group {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  role: GroupRole;
  created_at: string;
}

export interface EventItem {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  location: string | null;
  resource_url: string | null;
  start_time: string;
  urgency_tier: UrgencyTier;
  warning_minutes: number[];
  recurrence_rule: string | null;
  status: EventStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventAcknowledgment {
  id: string;
  event_id: string;
  user_id: string;
  acknowledged_at: string;
}

export interface GroupState {
  group: Group;
  membership: GroupMember;
}
