export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: { id: string; name: string; code: string; created_by: string; created_at: string };
        Insert: { id?: string; name: string; code?: string; created_by: string; created_at?: string };
        Update: Partial<{ id: string; name: string; code: string; created_by: string; created_at: string }>;
        Relationships: [];
      };
      group_members: {
        Row: { id: string; group_id: string; user_id: string; display_name: string; role: "owner" | "admin" | "member"; created_at: string };
        Insert: { id?: string; group_id: string; user_id: string; display_name: string; role?: "owner" | "admin" | "member"; created_at?: string };
        Update: Partial<{ id: string; group_id: string; user_id: string; display_name: string; role: "owner" | "admin" | "member"; created_at: string }>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string; group_id: string; title: string; description: string | null; location: string | null; resource_url: string | null;
          start_time: string; urgency_tier: "INFO" | "WARNING" | "LOUD"; warning_minutes: number[]; recurrence_rule: string | null;
          status: "active" | "completed" | "cancelled"; created_by: string; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; group_id: string; title: string; description?: string | null; location?: string | null; resource_url?: string | null;
          start_time: string; urgency_tier: "INFO" | "WARNING" | "LOUD"; warning_minutes?: number[]; recurrence_rule?: string | null;
          status?: "active" | "completed" | "cancelled"; created_by: string; created_at?: string; updated_at?: string;
        };
        Update: Partial<{
          id: string; group_id: string; title: string; description: string | null; location: string | null; resource_url: string | null;
          start_time: string; urgency_tier: "INFO" | "WARNING" | "LOUD"; warning_minutes: number[]; recurrence_rule: string | null;
          status: "active" | "completed" | "cancelled"; created_by: string; created_at: string; updated_at: string;
        }>;
        Relationships: [];
      };
      event_acknowledgments: {
        Row: { id: string; event_id: string; user_id: string; acknowledged_at: string };
        Insert: { id?: string; event_id: string; user_id: string; acknowledged_at?: string };
        Update: Partial<{ id: string; event_id: string; user_id: string; acknowledged_at: string }>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; expiration_time: number | null; created_at: string; last_seen_at: string };
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth: string; expiration_time?: number | null; created_at?: string; last_seen_at?: string };
        Update: Partial<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string; expiration_time: number | null; created_at: string; last_seen_at: string }>;
        Relationships: [];
      };
      notification_deliveries: {
        Row: { id: string; event_id: string; user_id: string; kind: string; delivered_at: string };
        Insert: { id?: string; event_id: string; user_id: string; kind: string; delivered_at?: string };
        Update: Partial<{ id: string; event_id: string; user_id: string; kind: string; delivered_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      smaran_create_group: { Args: { group_name: string; owner_display_name?: string }; Returns: Database["public"]["Tables"]["groups"]["Row"] };
      smaran_join_group: { Args: { join_code: string; member_display_name: string }; Returns: Database["public"]["Tables"]["group_members"]["Row"] };
      smaran_claim_due_loud_notifications: { Args: { window_start: string; window_end: string }; Returns: Array<{ event_id: string; user_id: string; title: string; group_id: string; start_time: string }> };
      smaran_claim_due_notifications: { Args: { window_start: string; window_end: string }; Returns: Array<{ event_id: string; user_id: string; title: string; group_id: string; group_name: string; start_time: string; notification_kind: string }> };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
