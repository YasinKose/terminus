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

export const DEFAULT_CATEGORIES: SnippetCategory[] = [
  { id: 'build', name: 'Build', icon: 'Hammer' },
  { id: 'deploy', name: 'Deploy', icon: 'Rocket' },
  { id: 'git', name: 'Git', icon: 'GitBranch' },
  { id: 'test', name: 'Test', icon: 'FlaskConical' },
  { id: 'docker', name: 'Docker', icon: 'Container' },
  { id: 'other', name: 'Diğer', icon: 'Terminal' }
];
