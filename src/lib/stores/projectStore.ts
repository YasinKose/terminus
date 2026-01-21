import { writable, get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

export interface TerminalTab {
  id: string;
  title: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  tabs: TerminalTab[];
  activeTabId: string | null;
}

function createProjectStore() {
  // Load initial state from localStorage
  const savedProjects = localStorage.getItem('terminus_projects');
  const initialProjects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];

  const savedActiveId = localStorage.getItem('terminus_active_project');

  const { subscribe, set, update } = writable<Project[]>(initialProjects);
  const activeProjectId = writable<string | null>(savedActiveId || (initialProjects.length > 0 ? initialProjects[0].id : null));

  // Helper to save state
  function saveState(projects: Project[]) {
    localStorage.setItem('terminus_projects', JSON.stringify(projects));
  }

  // Subscribe to changes to save active ID
  activeProjectId.subscribe(id => {
    if (id) localStorage.setItem('terminus_active_project', id);
    else localStorage.removeItem('terminus_active_project');
  });

  return {
    subscribe,
    activeProjectId,

    addProject: (name: string, path: string) => {
      const newProject: Project = {
        id: uuidv4(),
        name,
        path,
        tabs: [],
        activeTabId: null
      };

      update(projects => {
        // Prevent duplicates
        if (projects.find(p => p.path === path)) return projects;
        const updated = [...projects, newProject];
        saveState(updated);
        return updated;
      });

      activeProjectId.set(newProject.id);
      return newProject.id;
    },

    removeProject: (id: string) => {
        update(projects => {
            const updated = projects.filter(p => p.id !== id);
            saveState(updated);
            return updated;
        });
        const current = get(activeProjectId);
        if (current === id) {
            const all = get(projectStore);
            activeProjectId.set(all.length > 0 ? all[0].id : null);
        }
    },

    setActiveProject: (id: string) => {
      activeProjectId.set(id);
    },

    createTab: (projectId: string) => {
      let newTabId: string = "";
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const tab: TerminalTab = {
              id: uuidv4(),
              title: 'Terminal'
            };
            newTabId = tab.id;
            return {
              ...p,
              tabs: [...p.tabs, tab],
              activeTabId: tab.id
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
      return newTabId;
    },

    closeTab: (projectId: string, tabId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const newTabs = p.tabs.filter(t => t.id !== tabId);
            let newActive = p.activeTabId;
            if (p.activeTabId === tabId) {
                newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
            }
            return {
              ...p,
              tabs: newTabs,
              activeTabId: newActive
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    setActiveTab: (projectId: string, tabId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return { ...p, activeTabId: tabId };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    }
  };
}

export const projectStore = createProjectStore();
