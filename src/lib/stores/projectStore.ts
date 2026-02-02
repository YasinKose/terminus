import { writable, get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Workspace, PaneNode, TerminalLeaf, SplitContainer, SplitDirection } from '../types/workspace';
import { migrateProjects } from './migration';

// Re-export types for convenience
export type { Project, Workspace, PaneNode, TerminalLeaf, SplitContainer, SplitDirection };

function createProjectStore() {
  // Load initial state from localStorage and migrate if needed
  const savedProjects = localStorage.getItem('terminus_projects');
  let initialProjects: Project[] = [];

  if (savedProjects) {
    try {
      const parsed = JSON.parse(savedProjects);
      initialProjects = migrateProjects(parsed);
      // Save migrated projects back to localStorage
      localStorage.setItem('terminus_projects', JSON.stringify(initialProjects));
    } catch (e) {
      console.error('Failed to parse projects from localStorage:', e);
      initialProjects = [];
    }
  }

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

  // Helper function to find a node in the tree by ID
  function findNode(root: PaneNode, id: string): PaneNode | null {
    if (root.id === id) return root;
    if (root.type === 'split') {
      for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  // Helper function to find parent of a node
  function findParent(root: PaneNode, id: string): SplitContainer | null {
    if (root.type === 'split') {
      for (const child of root.children) {
        if (child.id === id) return root;
        const found = findParent(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  // Helper function to collect all terminal IDs from a tree
  function collectTerminalIds(node: PaneNode): string[] {
    if (node.type === 'terminal') {
      return [node.id];
    }
    return node.children.flatMap(child => collectTerminalIds(child));
  }

  // Helper function to replace a node in the tree
  function replaceNode(root: PaneNode, targetId: string, newNode: PaneNode): PaneNode {
    if (root.id === targetId) return newNode;
    if (root.type === 'split') {
      return {
        ...root,
        children: root.children.map(child => replaceNode(child, targetId, newNode))
      };
    }
    return root;
  }

  // Helper function to remove a node from the tree
  function removeNode(root: PaneNode, targetId: string): PaneNode | null {
    if (root.id === targetId) return null;
    if (root.type === 'split') {
      const newChildren = root.children
        .map(child => removeNode(child, targetId))
        .filter((child): child is PaneNode => child !== null);

      if (newChildren.length === 0) return null;
      if (newChildren.length === 1) return newChildren[0]; // Collapse single-child container

      // Recalculate sizes proportionally
      const totalSize = root.sizes.reduce((sum, size, i) => {
        const childExists = root.children[i] &&
          (root.children[i].id !== targetId);
        return childExists ? sum + size : sum;
      }, 0);

      const newSizes = root.sizes
        .filter((_, i) => root.children[i]?.id !== targetId)
        .map(size => (size / totalSize) * 100);

      return {
        ...root,
        children: newChildren,
        sizes: newSizes
      };
    }
    return root;
  }

  return {
    subscribe,
    activeProjectId,

    addProject: (name: string, path: string) => {
      const terminalId = uuidv4();
      const workspaceId = uuidv4();

      const newProject: Project = {
        id: uuidv4(),
        name,
        path,
        workspaces: [{
          id: workspaceId,
          name: 'Workspace 1',
          root: {
            type: 'terminal',
            id: terminalId,
            title: 'Terminal 1'
          },
          activeTerminalId: terminalId
        }],
        activeWorkspaceId: workspaceId
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

    // Workspace methods
    createWorkspace: (projectId: string, name?: string) => {
      let newWorkspaceId: string = "";
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const terminalId = uuidv4();
            const workspaceId = uuidv4();
            newWorkspaceId = workspaceId;
            const workspaceCount = p.workspaces.length + 1;

            const newWorkspace: Workspace = {
              id: workspaceId,
              name: name || `Workspace ${workspaceCount}`,
              root: {
                type: 'terminal',
                id: terminalId,
                title: 'Terminal 1'
              },
              activeTerminalId: terminalId
            };

            return {
              ...p,
              workspaces: [...p.workspaces, newWorkspace],
              activeWorkspaceId: workspaceId
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
      return newWorkspaceId;
    },

    deleteWorkspace: (projectId: string, workspaceId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const newWorkspaces = p.workspaces.filter(w => w.id !== workspaceId);
            if (newWorkspaces.length === 0) {
              // Don't allow deleting the last workspace, create a new one
              const terminalId = uuidv4();
              const newWorkspaceId = uuidv4();
              newWorkspaces.push({
                id: newWorkspaceId,
                name: 'Workspace 1',
                root: {
                  type: 'terminal',
                  id: terminalId,
                  title: 'Terminal 1'
                },
                activeTerminalId: terminalId
              });
            }

            let newActiveId = p.activeWorkspaceId;
            if (p.activeWorkspaceId === workspaceId) {
              newActiveId = newWorkspaces[newWorkspaces.length - 1].id;
            }

            return {
              ...p,
              workspaces: newWorkspaces,
              activeWorkspaceId: newActiveId
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    setActiveWorkspace: (projectId: string, workspaceId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return { ...p, activeWorkspaceId: workspaceId };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    renameWorkspace: (projectId: string, workspaceId: string, newName: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w =>
                w.id === workspaceId ? { ...w, name: newName } : w
              )
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    reorderWorkspaces: (projectId: string, fromIndex: number, toIndex: number) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const newWorkspaces = [...p.workspaces];
            const [moved] = newWorkspaces.splice(fromIndex, 1);
            newWorkspaces.splice(toIndex, 0, moved);
            return {
              ...p,
              workspaces: newWorkspaces
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    // Pane methods
    splitPane: (projectId: string, workspaceId: string, paneId: string, direction: SplitDirection) => {
      let newTerminalId: string = "";
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                if (w.id === workspaceId) {
                  const parent = findParent(w.root, paneId);
                  newTerminalId = uuidv4();
                  const newTerminal: TerminalLeaf = {
                    type: 'terminal',
                    id: newTerminalId,
                    title: 'Terminal'
                  };

                  let newRoot: PaneNode;
                  if (parent && parent.direction === direction) {
                    // Directions match: Add as sibling to the target pane
                    const targetIndex = parent.children.findIndex(c => c.id === paneId);
                    const newChildren = [...parent.children];
                    newChildren.splice(targetIndex + 1, 0, newTerminal);

                    // Recalculate sizes equally
                    const equalSize = 100 / newChildren.length;
                    const newSizes = newChildren.map(() => equalSize);

                    const updatedParent: SplitContainer = {
                      ...parent,
                      children: newChildren,
                      sizes: newSizes
                    };

                    newRoot = replaceNode(w.root, parent.id, updatedParent);
                  } else {
                    // Directions differ or no parent: Create new nested SplitContainer
                    const targetNode = findNode(w.root, paneId);
                    if (!targetNode) return w;

                    const newContainer: SplitContainer = {
                      type: 'split',
                      id: uuidv4(),
                      direction,
                      children: [targetNode, newTerminal],
                      sizes: [50, 50]
                    };
                    newRoot = replaceNode(w.root, paneId, newContainer);
                  }

                  return {
                    ...w,
                    root: newRoot,
                    activeTerminalId: newTerminalId
                  };
                }
                return w;
              })
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
      return newTerminalId;
    },

    closePane: (projectId: string, workspaceId: string, paneId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                if (w.id === workspaceId) {
                  // If this is the root and only terminal, don't close it
                  if (w.root.id === paneId && w.root.type === 'terminal') {
                    return w;
                  }

                  const newRoot = removeNode(w.root, paneId);
                  if (!newRoot) return w; // Shouldn't happen

                  // Update active terminal if needed
                  let newActiveId = w.activeTerminalId;
                  if (w.activeTerminalId === paneId) {
                    const allTerminals = collectTerminalIds(newRoot);
                    newActiveId = allTerminals[0] || null;
                  }

                  return {
                    ...w,
                    root: newRoot,
                    activeTerminalId: newActiveId
                  };
                }
                return w;
              })
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    resizePanes: (projectId: string, workspaceId: string, containerId: string, sizes: number[]) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                if (w.id === workspaceId) {
                  const updateSizes = (node: PaneNode): PaneNode => {
                    if (node.type === 'split') {
                      if (node.id === containerId) {
                        return { ...node, sizes };
                      }
                      return {
                        ...node,
                        children: node.children.map(child => updateSizes(child))
                      };
                    }
                    return node;
                  };

                  return {
                    ...w,
                    root: updateSizes(w.root)
                  };
                }
                return w;
              })
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    setActiveTerminal: (projectId: string, workspaceId: string, terminalId: string) => {
      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w =>
                w.id === workspaceId ? { ...w, activeTerminalId: terminalId } : w
              )
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    moveTerminal: (projectId: string, sourceWorkspaceId: string, targetWorkspaceId: string, terminalId: string) => {
      if (sourceWorkspaceId === targetWorkspaceId) return;

      update(projects => {
        const updated = projects.map(p => {
          if (p.id === projectId) {
            const sourceWorkspace = p.workspaces.find(w => w.id === sourceWorkspaceId);
            if (!sourceWorkspace) return p;

            const terminalNode = findNode(sourceWorkspace.root, terminalId);
            if (!terminalNode || terminalNode.type !== 'terminal') return p;

            // Capture terminal data before removal
            const terminalToMove = { ...terminalNode };

            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                // Source Workspace Logic
                if (w.id === sourceWorkspaceId) {
                  let newRoot = removeNode(w.root, terminalId);

                  // Don't leave workspace empty - create default if needed
                  if (!newRoot) {
                    const newId = uuidv4();
                    newRoot = {
                      type: 'terminal',
                      id: newId,
                      title: 'Terminal 1'
                    };
                  }

                  // Update active terminal if needed
                  let newActiveId = w.activeTerminalId;
                  if (w.activeTerminalId === terminalId) {
                    const allTerminals = collectTerminalIds(newRoot);
                    newActiveId = allTerminals[0] || null;
                  }

                  return { ...w, root: newRoot, activeTerminalId: newActiveId };
                }

                // Target Workspace Logic
                if (w.id === targetWorkspaceId) {
                  let newRoot: PaneNode;
                  const activeId = w.activeTerminalId;

                  if (activeId) {
                    const parent = findParent(w.root, activeId);
                    // Default to horizontal insertion if possible
                    const direction: SplitDirection = 'horizontal';

                    if (parent && parent.direction === direction) {
                      // Insert as sibling (N-way split logic)
                      const targetIndex = parent.children.findIndex(c => c.id === activeId);
                      const newChildren = [...parent.children];
                      newChildren.splice(targetIndex + 1, 0, terminalToMove);

                      const equalSize = 100 / newChildren.length;
                      const newSizes = newChildren.map(() => equalSize);

                      const updatedParent = {
                        ...parent,
                        children: newChildren,
                        sizes: newSizes
                      };

                      newRoot = replaceNode(w.root, parent.id, updatedParent);
                    } else {
                      // Insert as new split
                      const targetNode = findNode(w.root, activeId);
                      if (!targetNode) {
                        newRoot = terminalToMove; // Should not happen if activeId exists
                      } else {
                        newRoot = replaceNode(w.root, activeId, {
                          type: 'split',
                          id: uuidv4(),
                          direction,
                          children: [targetNode, terminalToMove],
                          sizes: [50, 50]
                        });
                      }
                    }
                  } else {
                    // Empty workspace case
                    newRoot = terminalToMove;
                  }

                  return { ...w, root: newRoot, activeTerminalId: terminalId };
                }

                return w;
              })
            };
          }
          return p;
        });
        saveState(updated);
        return updated;
      });
    },

    // Helper to get all terminal IDs from a workspace
    getWorkspaceTerminalIds: (projectId: string, workspaceId: string): string[] => {
      const projects = get(projectStore);
      const project = projects.find(p => p.id === projectId);
      if (!project) return [];
      const workspace = project.workspaces.find(w => w.id === workspaceId);
      if (!workspace) return [];
      return collectTerminalIds(workspace.root);
    },

    // Swap two terminals (for center drop zone)
    swapTerminals: (
      targetProjectId: string,
      targetWorkspaceId: string,
      targetTerminalId: string,
      sourceProjectId: string,
      sourceWorkspaceId: string,
      sourceTerminalId: string
    ) => {
      // Same workspace swap
      if (targetWorkspaceId === sourceWorkspaceId && targetProjectId === sourceProjectId) {
        update(projects => {
          const updated = projects.map(p => {
            if (p.id === targetProjectId) {
              return {
                ...p,
                workspaces: p.workspaces.map(w => {
                  if (w.id === targetWorkspaceId) {
                    // Swap nodes in tree
                    const swapNodes = (node: PaneNode): PaneNode => {
                      if (node.id === targetTerminalId) {
                        const sourceNode = findNode(w.root, sourceTerminalId);
                        return sourceNode ? { ...sourceNode, id: targetTerminalId } : node;
                      }
                      if (node.id === sourceTerminalId) {
                        const targetNode = findNode(w.root, targetTerminalId);
                        return targetNode ? { ...targetNode, id: sourceTerminalId } : node;
                      }
                      if (node.type === 'split') {
                        return {
                          ...node,
                          children: node.children.map(child => swapNodes(child))
                        };
                      }
                      return node;
                    };
                    return { ...w, root: swapNodes(w.root) };
                  }
                  return w;
                })
              };
            }
            return p;
          });
          saveState(updated);
          return updated;
        });
      }
      // Cross-workspace swap not implemented for simplicity
    },

    // Insert terminal at specific position (for directional drop zones)
    insertTerminalAtPosition: (
      targetProjectId: string,
      targetWorkspaceId: string,
      targetTerminalId: string,
      sourceProjectId: string,
      sourceWorkspaceId: string,
      sourceTerminalId: string,
      direction: SplitDirection,
      insertBefore: boolean
    ) => {
      update(projects => {
        let terminalToMove: TerminalLeaf | null = null;

        // First pass: extract terminal from source
        const afterExtract = projects.map(p => {
          if (p.id === sourceProjectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                if (w.id === sourceWorkspaceId) {
                  const node = findNode(w.root, sourceTerminalId);
                  if (node && node.type === 'terminal') {
                    terminalToMove = { ...node };
                  }

                  let newRoot = removeNode(w.root, sourceTerminalId);

                  // Don't leave workspace empty
                  if (!newRoot) {
                    const newId = uuidv4();
                    newRoot = {
                      type: 'terminal',
                      id: newId,
                      title: 'Terminal 1'
                    };
                  }

                  // Update active terminal if needed
                  let newActiveId = w.activeTerminalId;
                  if (w.activeTerminalId === sourceTerminalId) {
                    const allTerminals = collectTerminalIds(newRoot);
                    newActiveId = allTerminals[0] || null;
                  }

                  return { ...w, root: newRoot, activeTerminalId: newActiveId };
                }
                return w;
              })
            };
          }
          return p;
        });

        if (!terminalToMove) return projects;

        // Second pass: insert terminal at target
        const updated = afterExtract.map(p => {
          if (p.id === targetProjectId) {
            return {
              ...p,
              workspaces: p.workspaces.map(w => {
                if (w.id === targetWorkspaceId) {
                  const parent = findParent(w.root, targetTerminalId);

                  let newRoot: PaneNode;

                  if (parent && parent.direction === direction) {
                    // Same direction: add as sibling
                    const targetIndex = parent.children.findIndex(c => c.id === targetTerminalId);
                    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
                    const newChildren = [...parent.children];
                    newChildren.splice(insertIndex, 0, terminalToMove!);

                    const equalSize = 100 / newChildren.length;
                    const newSizes = newChildren.map(() => equalSize);

                    const updatedParent: SplitContainer = {
                      ...parent,
                      children: newChildren,
                      sizes: newSizes
                    };

                    newRoot = replaceNode(w.root, parent.id, updatedParent);
                  } else {
                    // Different direction: create new split container
                    const targetNode = findNode(w.root, targetTerminalId);
                    if (!targetNode) return w;

                    const children = insertBefore
                      ? [terminalToMove!, targetNode]
                      : [targetNode, terminalToMove!];

                    const newContainer: SplitContainer = {
                      type: 'split',
                      id: uuidv4(),
                      direction,
                      children,
                      sizes: [50, 50]
                    };

                    newRoot = replaceNode(w.root, targetTerminalId, newContainer);
                  }

                  return {
                    ...w,
                    root: newRoot,
                    activeTerminalId: terminalToMove!.id
                  };
                }
                return w;
              })
            };
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
