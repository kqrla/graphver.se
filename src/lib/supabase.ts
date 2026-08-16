import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Board {
  id: string;
  title: string;
  description?: string;
  graph_data: GraphData;
  created_at: string;
  updated_at: string;
  user_id?: string;
  is_public: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: Viewport;
  foldedNodes: string[];
  layoutDirection?: 'ltr' | 'ttb';
  layoutMode?: 'hierarchical' | 'adaptive';
  customFont?: string;
}

export interface GraphNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  depth: number;
  parentId?: string;
  children: string[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type?: 'line' | 'arrow' | 'double-arrow';
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
