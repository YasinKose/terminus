<script lang="ts">
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { Plus, X } from 'lucide-svelte';
  import { taskStore, type Task } from '../stores/taskStore';
  import { projectStore } from '../stores/projectStore';
  import { v4 as uuidv4 } from 'uuid';
  import { onMount } from 'svelte';

  const flipDurationMs = 200;

  // Use a derived value or reactive statement to get the active project
  const { activeProjectId } = projectStore;
  $: activeProject = $projectStore.find(p => p.id === $activeProjectId);

  // Load tasks when active project changes
  $: if (activeProject) {
    taskStore.init(activeProject.path);
  }

  function handleDndConsider(cid: string, e: CustomEvent<DndEvent<Task>>) {
    const colIdx = $taskStore.columns.findIndex(c => c.id === cid);
    $taskStore.columns[colIdx].tasks = e.detail.items;
    $taskStore.columns = [...$taskStore.columns];
  }

  function handleDndFinalize(cid: string, e: CustomEvent<DndEvent<Task>>) {
    if (!activeProject) return;

    const colIdx = $taskStore.columns.findIndex(c => c.id === cid);
    $taskStore.columns[colIdx].tasks = e.detail.items;
    $taskStore.columns = [...$taskStore.columns];
    taskStore.save(activeProject.path);
  }

  function addTask(colIdx: number) {
    if (!activeProject) return;

    const title = prompt("Task title:");
    if (!title) return;

    const newTask: Task = {
      id: uuidv4(),
      title,
    };

    $taskStore.columns[colIdx].tasks = [...$taskStore.columns[colIdx].tasks, newTask];
    taskStore.save(activeProject.path);
  }

  function deleteTask(colIdx: number, taskId: string) {
    if (!activeProject) return;
    if(!confirm("Delete task?")) return;

    $taskStore.columns[colIdx].tasks = $taskStore.columns[colIdx].tasks.filter(t => t.id !== taskId);
    $taskStore.columns = [...$taskStore.columns];
    taskStore.save(activeProject.path);
  }
</script>

<div class="h-full w-full overflow-x-auto bg-zinc-950/95 p-6 backdrop-blur-sm">
  {#if activeProject}
    <div class="flex h-full gap-4">
      {#each $taskStore.columns as column, idx (column.id)}
        <div class="flex h-full w-72 flex-col rounded-lg bg-zinc-900/50 border border-zinc-800">
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b border-zinc-800">
            <h3 class="font-medium text-zinc-300">{column.title}</h3>
            <span class="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{column.tasks.length}</span>
          </div>

          <!-- Tasks Container -->
          <div
            class="flex-1 overflow-y-auto p-2"
            use:dndzone={{items: column.tasks, flipDurationMs}}
            on:consider={(e) => handleDndConsider(column.id, e)}
            on:finalize={(e) => handleDndFinalize(column.id, e)}
          >
            {#each column.tasks as task (task.id)}
              <div animate:flip={{duration: flipDurationMs}} class="mb-2 p-3 bg-zinc-800/80 rounded border border-zinc-700/50 hover:border-zinc-600 cursor-grab active:cursor-grabbing group relative">
                 <div class="text-sm text-zinc-200">{task.title}</div>
                 <button
                   class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                   on:click={() => deleteTask(idx, task.id)}
                 >
                   <X class="w-3 h-3" />
                 </button>
              </div>
            {/each}
          </div>

          <!-- Footer -->
          <button
            class="m-2 flex items-center justify-center gap-2 rounded py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors border border-dashed border-zinc-800 hover:border-zinc-700"
            on:click={() => addTask(idx)}
          >
            <Plus class="w-4 h-4" />
            Add Task
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex items-center justify-center h-full text-zinc-500">
      Please select a project to view tasks
    </div>
  {/if}
</div>
