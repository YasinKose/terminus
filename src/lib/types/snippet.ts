export interface Snippet {
  id: string;
  name: string;
  command: string;
  description?: string;
  category: string;
  isFavorite: boolean;
  scope: 'global' | 'project';
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SnippetCategory {
  id: string;
  name: string;
  icon: string;
}

export interface SnippetFormData {
  name: string;
  command: string;
  description?: string;
  category: string;
  scope: 'global' | 'project';
  projectId?: string;
  isFavorite: boolean;
}
