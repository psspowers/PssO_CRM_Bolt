/*
  # Create CRM Users Table
  
  1. New Tables
    - `crm_users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, not null)
      - `name` (text)
      - `role` (text, enum: admin/internal/external)
      - `avatar` (text)
      - `badges` (text array)
      - `reports_to` (uuid, self-reference for hierarchy)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on `crm_users` table
    - Add policy for public read access
    - Add policy for users to update their own record
    - Add policy for users to insert their own record
    
  3. Indexes
    - Add index on reports_to for hierarchy queries
*/

CREATE TABLE IF NOT EXISTS public.crm_users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  name text,
  role text DEFAULT 'external' CHECK (role IN ('admin', 'internal', 'external')),
  avatar text,
  badges text[] DEFAULT '{}',
  reports_to uuid REFERENCES public.crm_users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read access" ON public.crm_users 
  FOR SELECT 
  USING (true);

CREATE POLICY "Update own" ON public.crm_users 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Insert own" ON public.crm_users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_crm_users_reports_to 
  ON public.crm_users(reports_to);
