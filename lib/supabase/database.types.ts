
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "achievements": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"org": string,"period": string,"position": number,"published": boolean,"slug": string,"summary": string,"title": string,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"org"?: string,"period"?: string,"position"?: number,"published"?: boolean,"slug": string,"summary"?: string,"title": string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"org"?: string,"period"?: string,"position"?: number,"published"?: boolean,"slug"?: string,"summary"?: string,"title"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"admins": {
                  Row: {
                    "created_at": string,"email": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clients": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"logo_media_id": string | null,"name": string,"position": number,"project_id": string | null,"published": boolean,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"logo_media_id"?: string | null,"name": string,"position"?: number,"project_id"?: string | null,"published"?: boolean,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"logo_media_id"?: string | null,"name"?: string,"position"?: number,"project_id"?: string | null,"published"?: boolean,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_logo_media_id_fkey"
      columns: ["logo_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"experiences": {
                  Row: {
                    "created_at": string,"end_date": string | null,"highlights": (string)[],"id": string,"org": string,"position": number,"published": boolean,"role": string,"slug": string,"stack": (string)[],"start_date": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date"?: string | null,"highlights"?: (string)[],"id"?: string,"org": string,"position"?: number,"published"?: boolean,"role": string,"slug": string,"stack"?: (string)[],"start_date": string,"summary"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string | null,"highlights"?: (string)[],"id"?: string,"org"?: string,"position"?: number,"published"?: boolean,"role"?: string,"slug"?: string,"stack"?: (string)[],"start_date"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"media": {
                  Row: {
                    "alt": string,"created_at": string,"duration_s": number | null,"focal_x": number | null,"focal_y": number | null,"height": number | null,"id": string,"kind": string,"lqip": string | null,"path": string,"position": number,"source": string,"updated_at": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string,"created_at"?: string,"duration_s"?: number | null,"focal_x"?: number | null,"focal_y"?: number | null,"height"?: number | null,"id"?: string,"kind": string,"lqip"?: string | null,"path": string,"position"?: number,"source"?: string,"updated_at"?: string,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string,"created_at"?: string,"duration_s"?: number | null,"focal_x"?: number | null,"focal_y"?: number | null,"height"?: number | null,"id"?: string,"kind"?: string,"lqip"?: string | null,"path"?: string,"position"?: number,"source"?: string,"updated_at"?: string,"width"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "archived": boolean,"body": string,"created_at": string,"email": string,"id": string,"ip_hash": string,"name": string,"read_at": string | null,"updated_at": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"body": string,"created_at"?: string,"email": string,"id"?: string,"ip_hash": string,"name": string,"read_at"?: string | null,"updated_at"?: string,"user_agent"?: string | null
                  }
                  Update: {
                    "archived"?: boolean,"body"?: string,"created_at"?: string,"email"?: string,"id"?: string,"ip_hash"?: string,"name"?: string,"read_at"?: string | null,"updated_at"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profile": {
                  Row: {
                    "availability": string,"bio": (string)[],"created_at": string,"email": string,"footer_tagline": string,"full_name": string,"headline": string,"id": number,"location": string,"metrics": NonNullable<Json>,"resume_path": string | null,"roles": (string)[],"short_name": string,"socials": NonNullable<Json>,"timezone": string,"updated_at": string,"wordmark_bottom": string,"wordmark_top": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: string,"bio"?: (string)[],"created_at"?: string,"email"?: string,"footer_tagline"?: string,"full_name": string,"headline"?: string,"id"?: number,"location"?: string,"metrics"?: NonNullable<Json>,"resume_path"?: string | null,"roles"?: (string)[],"short_name"?: string,"socials"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"wordmark_bottom"?: string,"wordmark_top"?: string
                  }
                  Update: {
                    "availability"?: string,"bio"?: (string)[],"created_at"?: string,"email"?: string,"footer_tagline"?: string,"full_name"?: string,"headline"?: string,"id"?: number,"location"?: string,"metrics"?: NonNullable<Json>,"resume_path"?: string | null,"roles"?: (string)[],"short_name"?: string,"socials"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"wordmark_bottom"?: string,"wordmark_top"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_media": {
                  Row: {
                    "caption": string,"created_at": string,"id": string,"media_id": string,"position": number,"profile_id": number,"slot": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string,"created_at"?: string,"id"?: string,"media_id": string,"position"?: number,"profile_id"?: number,"slot": string,"updated_at"?: string
                  }
                  Update: {
                    "caption"?: string,"created_at"?: string,"id"?: string,"media_id"?: string,"position"?: number,"profile_id"?: number,"slot"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_media_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_media_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profile"
      referencedColumns: ["id"]
    }
                  ]
                },"project_media": {
                  Row: {
                    "behavior": string,"caption": string,"col_end": number,"col_start": number,"created_at": string,"depth": number,"format": string,"frame": string,"id": string,"is_cover": boolean,"media_id": string,"mobile_span": number,"placement": string,"position": number,"project_id": string,"ratio": number,"row_index": number,"shift": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "behavior"?: string,"caption"?: string,"col_end"?: number,"col_start"?: number,"created_at"?: string,"depth"?: number,"format"?: string,"frame"?: string,"id"?: string,"is_cover"?: boolean,"media_id": string,"mobile_span"?: number,"placement"?: string,"position"?: number,"project_id": string,"ratio"?: number,"row_index"?: number,"shift"?: number,"updated_at"?: string
                  }
                  Update: {
                    "behavior"?: string,"caption"?: string,"col_end"?: number,"col_start"?: number,"created_at"?: string,"depth"?: number,"format"?: string,"frame"?: string,"id"?: string,"is_cover"?: boolean,"media_id"?: string,"mobile_span"?: number,"placement"?: string,"position"?: number,"project_id"?: string,"ratio"?: number,"row_index"?: number,"shift"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_media_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_media_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "accent": string | null,"body": string,"client": string | null,"cover_media_id": string | null,"created_at": string,"device": string,"facts": NonNullable<Json>,"featured": boolean,"film_media_id": string | null,"id": string,"kind": string,"live_url": string | null,"loop_media_id": string | null,"name": string,"position": number,"published": boolean,"repo_url": string | null,"role": string,"seo_description": string | null,"seo_title": string | null,"slug": string,"stack": (string)[],"summary": string,"updated_at": string,"year": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent"?: string | null,"body"?: string,"client"?: string | null,"cover_media_id"?: string | null,"created_at"?: string,"device"?: string,"facts"?: NonNullable<Json>,"featured"?: boolean,"film_media_id"?: string | null,"id"?: string,"kind"?: string,"live_url"?: string | null,"loop_media_id"?: string | null,"name": string,"position"?: number,"published"?: boolean,"repo_url"?: string | null,"role"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"slug": string,"stack"?: (string)[],"summary"?: string,"updated_at"?: string,"year"?: string
                  }
                  Update: {
                    "accent"?: string | null,"body"?: string,"client"?: string | null,"cover_media_id"?: string | null,"created_at"?: string,"device"?: string,"facts"?: NonNullable<Json>,"featured"?: boolean,"film_media_id"?: string | null,"id"?: string,"kind"?: string,"live_url"?: string | null,"loop_media_id"?: string | null,"name"?: string,"position"?: number,"published"?: boolean,"repo_url"?: string | null,"role"?: string,"seo_description"?: string | null,"seo_title"?: string | null,"slug"?: string,"stack"?: (string)[],"summary"?: string,"updated_at"?: string,"year"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_cover_media_id_fkey"
      columns: ["cover_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_film_media_id_fkey"
      columns: ["film_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_loop_media_id_fkey"
      columns: ["loop_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"reel_chapters": {
                  Row: {
                    "created_at": string,"end_s": number,"id": string,"label": string,"position": number,"project_id": string | null,"reel_id": string,"start_s": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_s": number,"id"?: string,"label"?: string,"position"?: number,"project_id"?: string | null,"reel_id": string,"start_s": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"end_s"?: number,"id"?: string,"label"?: string,"position"?: number,"project_id"?: string | null,"reel_id"?: string,"start_s"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reel_chapters_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reel_chapters_reel_id_fkey"
      columns: ["reel_id"]
isOneToOne: false
      referencedRelation: "reels"
      referencedColumns: ["id"]
    }
                  ]
                },"reels": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"key": string,"position": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"key": string,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"key"?: string,"position"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"skills": {
                  Row: {
                    "category": string,"created_at": string,"id": string,"marquee_row": number,"name": string,"position": number,"published": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"id"?: string,"marquee_row"?: number,"name": string,"position"?: number,"published"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"id"?: string,"marquee_row"?: number,"name"?: string,"position"?: number,"published"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"testimonials": {
                  Row: {
                    "author_name": string,"author_org": string,"author_role": string,"avatar_media_id": string | null,"created_at": string,"id": string,"position": number,"project_id": string | null,"published": boolean,"quote": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"author_org"?: string,"author_role"?: string,"avatar_media_id"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"project_id"?: string | null,"published"?: boolean,"quote": string,"updated_at"?: string
                  }
                  Update: {
                    "author_name"?: string,"author_org"?: string,"author_role"?: string,"avatar_media_id"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"project_id"?: string | null,"published"?: boolean,"quote"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "testimonials_avatar_media_id_fkey"
      columns: ["avatar_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "testimonials_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"replace_project_media":
{ Args: { "p_frames": Json,"p_project": string }; Returns: {
              "behavior": string,
"caption": string,
"col_end": number,
"col_start": number,
"created_at": string,
"depth": number,
"format": string,
"frame": string,
"id": string,
"is_cover": boolean,
"media_id": string,
"mobile_span": number,
"placement": string,
"position": number,
"project_id": string,
"ratio": number,
"row_index": number,
"shift": number,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "project_media"
        isOneToOne: false
        isSetofReturn: true
      } },
"submit_message":
{ Args: { "p_body": string,"p_email": string,"p_ip_hash": string,"p_name": string,"p_user_agent"?: string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
