export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: 'teacher' | 'student' | 'org_admin'
          full_name: string
          username: string | null
          organization_id: string | null
        }
        Insert: {
          id: string
          email: string
          role: 'teacher' | 'student' | 'org_admin'
          full_name: string
          username?: string | null
          organization_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: 'teacher' | 'student' | 'org_admin'
          full_name?: string
          username?: string | null
          organization_id?: string | null
        }
      }
      topics: {
        Row: {
          id: string
          component: '01' | '02'
          title: string
          order_number: number
        }
        Insert: {
          id?: string
          component: '01' | '02'
          title: string
          order_number: number
        }
        Update: {
          id?: string
          component?: '01' | '02'
          title?: string
          order_number?: number
        }
      }
      subtopics: {
        Row: {
          id: string
          topic_id: string
          title: string
          content_json: Json
          order_number: number
        }
        Insert: {
          id?: string
          topic_id: string
          title: string
          content_json: Json
          order_number: number
        }
        Update: {
          id?: string
          topic_id?: string
          title?: string
          content_json?: Json
          order_number?: number
        }
      }
      released_subtopics: {
        Row: {
          id: string
          subtopic_id: string
          teacher_id: string
          student_id: string | null
          released_at: string
        }
        Insert: {
          id?: string
          subtopic_id: string
          teacher_id: string
          student_id?: string | null
          released_at?: string
        }
        Update: {
          id?: string
          subtopic_id?: string
          teacher_id?: string
          student_id?: string | null
          released_at?: string
        }
      }
      question_sets: {
        Row: {
          id: string
          subtopic_id: string
          teacher_id: string
          questions_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          subtopic_id: string
          teacher_id: string
          questions_json: Json
          created_at?: string
        }
        Update: {
          id?: string
          subtopic_id?: string
          teacher_id?: string
          questions_json?: Json
          created_at?: string
        }
      }
      student_answers: {
        Row: {
          id: string
          question_set_id: string
          student_id: string
          answers_json: Json
          scores_json: Json
          feedback_json: Json
          submitted_at: string
          total_score: number
        }
        Insert: {
          id?: string
          question_set_id: string
          student_id: string
          answers_json: Json
          scores_json: Json
          feedback_json: Json
          submitted_at?: string
          total_score: number
        }
        Update: {
          id?: string
          question_set_id?: string
          student_id?: string
          answers_json?: Json
          scores_json?: Json
          feedback_json?: Json
          submitted_at?: string
          total_score?: number
        }
      }
      subjects: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          price_pence: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          price_pence: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          price_pence?: number
          created_at?: string
        }
      }
      org_purchases: {
        Row: {
          id: string
          org_id: string
          subject_id: string
          purchased_at: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          id?: string
          org_id: string
          subject_id: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          subject_id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
        }
      }
      subject_teacher_access: {
        Row: {
          id: string
          teacher_id: string
          subject_id: string
          granted_by: string
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          subject_id: string
          granted_by: string
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          subject_id?: string
          granted_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
