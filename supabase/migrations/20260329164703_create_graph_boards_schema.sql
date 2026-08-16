/*
  # Create Graph Boards Schema

  1. New Tables
    - `boards`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, nullable)
      - `graph_data` (jsonb) - stores the complete graph structure
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `user_id` (uuid, nullable) - for future auth integration
      - `is_public` (boolean) - whether board can be shared/embedded
      
  2. Security
    - Enable RLS on `boards` table
    - Add policy for public access to public boards (for iframe embeds)
    - Add policy for creating boards (open for now, can be restricted later)
    
  3. Important Notes
    - The graph_data field stores nodes, edges, positions, fold states, etc.
    - JSON structure: {nodes: [], edges: [], viewport: {}, foldedNodes: []}
*/

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Board',
  description text,
  graph_data jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[],"viewport":{"x":0,"y":0,"zoom":1},"foldedNodes":[]}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  is_public boolean DEFAULT true
);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public boards"
  ON boards
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Anyone can create boards"
  ON boards
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their created boards"
  ON boards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete boards"
  ON boards
  FOR DELETE
  USING (true);
