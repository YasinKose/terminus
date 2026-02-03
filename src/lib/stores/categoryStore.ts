import { writable, get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { SnippetCategory } from '../types/snippet';

const STORAGE_KEY = 'terminus_categories';

function createCategoryStore() {
  const savedCategories = localStorage.getItem(STORAGE_KEY);
  let initialCategories: SnippetCategory[] = [];

  if (savedCategories) {
    try {
      initialCategories = JSON.parse(savedCategories);
    } catch (e) {
      console.error('Failed to parse categories from localStorage:', e);
      initialCategories = [];
    }
  }

  const { subscribe, set, update } = writable<SnippetCategory[]>(initialCategories);

  function saveState(categories: SnippetCategory[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  return {
    subscribe,

    addCategory: (name: string, icon: string = 'Folder') => {
      const id = uuidv4();
      const newCategory: SnippetCategory = { id, name, icon };

      update(categories => {
        // Prevent duplicate names
        if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
          return categories;
        }
        const updated = [...categories, newCategory];
        saveState(updated);
        return updated;
      });

      return id;
    },

    updateCategory: (id: string, updates: Partial<Omit<SnippetCategory, 'id'>>) => {
      update(categories => {
        const updated = categories.map(c => {
          if (c.id === id) {
            return { ...c, ...updates };
          }
          return c;
        });
        saveState(updated);
        return updated;
      });
    },

    deleteCategory: (id: string) => {
      update(categories => {
        const updated = categories.filter(c => c.id !== id);
        saveState(updated);
        return updated;
      });
    },

    getCategoryById: (id: string): SnippetCategory | undefined => {
      return get(categoryStore).find(c => c.id === id);
    },

    getCategoryByName: (name: string): SnippetCategory | undefined => {
      return get(categoryStore).find(c => c.name.toLowerCase() === name.toLowerCase());
    },

    ensureCategory: (name: string, icon: string = 'Folder'): string => {
      const existing = get(categoryStore).find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        return existing.id;
      }
      return categoryStore.addCategory(name, icon);
    }
  };
}

export const categoryStore = createCategoryStore();
