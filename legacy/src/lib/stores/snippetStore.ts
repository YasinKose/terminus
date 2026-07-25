import { writable, get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { Snippet } from '../types/snippet';

const STORAGE_KEY = 'terminus_snippets';

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function loadInitialSnippets(): Snippet[] {
  if (!hasLocalStorage()) {
    return [];
  }

  const savedSnippets = localStorage.getItem(STORAGE_KEY);
  if (!savedSnippets) {
    return [];
  }

  try {
    return JSON.parse(savedSnippets);
  } catch (error) {
    console.error('Failed to parse snippets from localStorage:', error);
    return [];
  }
}

function createSnippetStore() {
  const { subscribe, update } = writable<Snippet[]>(loadInitialSnippets());

  function saveState(snippets: Snippet[]) {
    if (!hasLocalStorage()) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  }

  return {
    subscribe,

    addSnippet: (snippetData: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now();
      const newSnippet: Snippet = {
        ...snippetData,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      };

      update(snippets => {
        const updated = [...snippets, newSnippet];
        saveState(updated);
        return updated;
      });

      return newSnippet.id;
    },

    updateSnippet: (id: string, updates: Partial<Omit<Snippet, 'id' | 'createdAt'>>) => {
      update(snippets => {
        const updated = snippets.map(s => {
          if (s.id === id) {
            return {
              ...s,
              ...updates,
              updatedAt: Date.now()
            };
          }
          return s;
        });
        saveState(updated);
        return updated;
      });
    },

    deleteSnippet: (id: string) => {
      update(snippets => {
        const updated = snippets.filter(s => s.id !== id);
        saveState(updated);
        return updated;
      });
    },

    toggleFavorite: (id: string) => {
      update(snippets => {
        const updated = snippets.map(s => {
          if (s.id === id) {
            return {
              ...s,
              isFavorite: !s.isFavorite,
              updatedAt: Date.now()
            };
          }
          return s;
        });
        saveState(updated);
        return updated;
      });
    },

    getGlobalSnippets: (): Snippet[] => {
      return get(snippetStore).filter(s => s.scope === 'global');
    },

    getProjectSnippets: (projectId: string): Snippet[] => {
      return get(snippetStore).filter(s => s.scope === 'project' && s.projectId === projectId);
    },

    getSnippetsByCategory: (category: string): Snippet[] => {
      return get(snippetStore).filter(s => s.category === category);
    },

    getFavorites: (): Snippet[] => {
      return get(snippetStore).filter(s => s.isFavorite);
    }
  };
}

export const snippetStore = createSnippetStore();
