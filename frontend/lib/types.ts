// TypeScript interfaces for API entities

export interface CameraGroup {
  id: number;
  code: string;
  name: string;
  description: string;
  next_sequence: number;
  created_at: string;
  updated_at: string;
  camera_count?: number;
}

export interface Camera {
  id: number;
  group: number;
  compound_code: string;
  name: string;
  description: string;
  day_view_path: string;
  day_thumbnail_path: string;
  night_view_path: string;
  night_thumbnail_path: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisReport {
  id: number;
  camera: number;
  pros: string[];
  improvements: string[];
  recommended_analytics: string[];
  critical_notes: string[];
  analyzed_at: string;
}

export interface CriticalNote {
  id: number;
  camera: number;
  author: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  total_pages: number;
  page_size: number;
  results: T[];
}

export interface ApiError {
  errors?: { field: string; message: string }[];
  detail?: string;
}
