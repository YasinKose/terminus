import { invoke } from '@tauri-apps/api/core';
import { snippetStore } from '../stores/snippetStore';
import { get } from 'svelte/store';
import type { Snippet } from '../types/snippet';

export interface MakefileTarget {
  name: string;
  description: string | null;
  command: string;
}

// Storage key for tracking which projects have been scanned
const SCANNED_PROJECTS_KEY = 'terminus_makefile_scanned';

function getScannedProjects(): Record<string, number> {
  const stored = localStorage.getItem(SCANNED_PROJECTS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

function markProjectScanned(projectId: string) {
  const scanned = getScannedProjects();
  scanned[projectId] = Date.now();
  localStorage.setItem(SCANNED_PROJECTS_KEY, JSON.stringify(scanned));
}

/**
 * Scan a directory for Makefile and extract targets
 */
export async function scanMakefile(directory: string): Promise<MakefileTarget[]> {
  try {
    const targets = await invoke<MakefileTarget[]>('scan_makefile', { directory });
    return targets;
  } catch (error) {
    console.error('Failed to scan Makefile:', error);
    return [];
  }
}

/**
 * Add Makefile targets as project-scoped snippets
 * Returns the number of new snippets added
 */
export async function addMakefileSnippets(
  projectId: string,
  projectPath: string,
  force: boolean = false
): Promise<number> {
  // Check if already scanned (unless forced)
  if (!force) {
    const scanned = getScannedProjects();
    if (scanned[projectId]) {
      return 0;
    }
  }

  const targets = await scanMakefile(projectPath);

  if (targets.length === 0) {
    return 0;
  }

  // Get existing snippets to avoid duplicates
  const existingSnippets = get(snippetStore);
  const existingCommands = new Set(
    existingSnippets
      .filter(s => s.scope === 'project' && s.projectId === projectId)
      .map(s => s.command)
  );

  let addedCount = 0;

  for (const target of targets) {
    // Skip if this command already exists for this project
    if (existingCommands.has(target.command)) {
      continue;
    }

    snippetStore.addSnippet({
      name: `make ${target.name}`,
      command: target.command,
      description: target.description || `Makefile target: ${target.name}`,
      category: 'make',
      scope: 'project',
      projectId: projectId,
      isFavorite: false
    });

    addedCount++;
  }

  // Mark project as scanned
  markProjectScanned(projectId);

  return addedCount;
}

/**
 * Remove all Makefile-generated snippets for a project
 */
export function removeMakefileSnippets(projectId: string): number {
  const snippets = get(snippetStore);
  const toRemove = snippets.filter(
    s => s.scope === 'project' &&
         s.projectId === projectId &&
         s.command.startsWith('make ')
  );

  for (const snippet of toRemove) {
    snippetStore.deleteSnippet(snippet.id);
  }

  return toRemove.length;
}

/**
 * Rescan Makefile for a project (removes old, adds new)
 */
export async function rescanMakefileSnippets(
  projectId: string,
  projectPath: string
): Promise<{ removed: number; added: number }> {
  const removed = removeMakefileSnippets(projectId);
  const added = await addMakefileSnippets(projectId, projectPath, true);
  return { removed, added };
}
