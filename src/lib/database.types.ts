// Типы схемы БД, написаны вручную по supabase/migrations/*.sql.
// Важно: только `type`, не `interface` — иначе supabase-js выводит `never`.
// Postgres → TS: date = 'YYYY-MM-DD', time = 'HH:MM:SS', timestamptz = ISO-строка.

export type EventColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          event_date: string;
          all_day: boolean;
          start_time: string | null;
          end_time: string | null;
          timezone: string;
          color: EventColor;
          reminder_enabled: boolean;
          reminder_minutes_before: number | null;
          jarvis_comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          event_date: string;
          all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          timezone?: string;
          color?: EventColor;
          reminder_enabled?: boolean;
          reminder_minutes_before?: number | null;
          jarvis_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          event_date?: string;
          all_day?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          timezone?: string;
          color?: EventColor;
          reminder_enabled?: boolean;
          reminder_minutes_before?: number | null;
          jarvis_comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id?: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_event_fk";
            columns: ["event_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
