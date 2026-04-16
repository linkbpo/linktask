export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: string; name: string; slug: string; created_at: string }
        Insert: { id?: string; name: string; slug: string; created_at?: string }
        Update: { name?: string; slug?: string }
      }
      projects: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          status: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate: number
          sponsor_id: string | null
          pm_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate?: number
          sponsor_id?: string | null
          pm_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          status?: 'active' | 'paused' | 'completed' | 'cancelled'
          current_gate?: number
          sponsor_id?: string | null
          pm_id?: string | null
        }
      }
      gates: {
        Row: {
          id: string
          project_id: string
          number: number
          title: string
          status: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
          approved_by: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          number: number
          title: string
          status?: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
        }
        Update: {
          status?: 'locked' | 'open' | 'pending_approval' | 'approved' | 'blocked'
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      gate_items: {
        Row: {
          id: string
          gate_id: string
          label: string
          checked: boolean
          evidence_url: string | null
          order: number
        }
        Insert: {
          id?: string
          gate_id: string
          label: string
          checked?: boolean
          evidence_url?: string | null
          order: number
        }
        Update: {
          checked?: boolean
          evidence_url?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          gate_id: string
          project_id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gate_id: string
          project_id: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id?: string | null
          due_date?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          assignee_id?: string | null
          due_date?: string | null
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'R' | 'A' | 'C' | 'I'
          gate_number: number | null
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'R' | 'A' | 'C' | 'I'
          gate_number?: number | null
        }
        Update: { role?: 'R' | 'A' | 'C' | 'I' }
      }
      impediments: {
        Row: {
          id: string
          project_id: string
          gate_id: string | null
          task_id: string | null
          description: string
          owner_id: string | null
          status: 'open' | 'resolved'
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          gate_id?: string | null
          task_id?: string | null
          description: string
          owner_id?: string | null
          status?: 'open' | 'resolved'
        }
        Update: { status?: 'open' | 'resolved'; resolved_at?: string | null }
      }
    }
  }
}
