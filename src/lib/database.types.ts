export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type TaskRow = {
  id: string
  user_id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
}

type TeamMemberRow = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

type LabelRow = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

type TaskAssigneeRow = {
  task_id: string
  member_id: string
  user_id: string
  created_at: string
}

type TaskLabelRow = {
  task_id: string
  label_id: string
  user_id: string
  created_at: string
}

type CommentRow = {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
}

type ActivityRow = {
  id: string
  task_id: string
  user_id: string
  event_type: string
  meta: Json
  created_at: string
}

type Insertable<Row, RequiredKeys extends keyof Row> = Pick<Row, RequiredKeys> &
  Partial<Omit<Row, RequiredKeys>>

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: TaskRow
        Insert: Insertable<TaskRow, 'title'>
        Update: Partial<TaskRow>
        Relationships: []
      }
      team_members: {
        Row: TeamMemberRow
        Insert: Insertable<TeamMemberRow, 'name' | 'color'>
        Update: Partial<TeamMemberRow>
        Relationships: []
      }
      labels: {
        Row: LabelRow
        Insert: Insertable<LabelRow, 'name' | 'color'>
        Update: Partial<LabelRow>
        Relationships: []
      }
      task_assignees: {
        Row: TaskAssigneeRow
        Insert: Insertable<TaskAssigneeRow, 'task_id' | 'member_id'>
        Update: Partial<TaskAssigneeRow>
        Relationships: []
      }
      task_labels: {
        Row: TaskLabelRow
        Insert: Insertable<TaskLabelRow, 'task_id' | 'label_id'>
        Update: Partial<TaskLabelRow>
        Relationships: []
      }
      comments: {
        Row: CommentRow
        Insert: Insertable<CommentRow, 'task_id' | 'body'>
        Update: Partial<CommentRow>
        Relationships: []
      }
      task_activity: {
        Row: ActivityRow
        Insert: Insertable<ActivityRow, 'task_id' | 'event_type'>
        Update: Partial<ActivityRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
