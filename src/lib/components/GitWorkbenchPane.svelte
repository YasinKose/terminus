<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    RefreshCw,
    ExternalLink,
    PanelLeftClose,
    PanelTopClose,
    GitBranch,
    GitCommit as CommitIcon,
    FileCode2,
    Upload,
    AlertTriangle,
    GitPullRequest,
    CircleDot,
    Layers,
    Tag,
    ArchiveRestore,
    FolderGit2,
    Plus
  } from 'lucide-svelte';
  import type {
    GitBranchSet,
    GitCommandResult,
    GitCommit,
    GitFileStatus,
    GitRemote,
    GitStashEntry,
    GitTagEntry,
    GhAuthStatus,
    GhIssue,
    GhPullRequest
  } from '$lib/types/git';
  import {
    ghAuthStatus,
    ghIssueCreate,
    ghIssueList,
    ghPrCreate,
    ghPrList,
    gitCheckoutBranch,
    gitCherryPick,
    gitCommit,
    gitCreateBranch,
    gitDeleteBranch,
    gitDiff,
    gitFetch,
    gitListBranches,
    gitListRemotes,
    gitLog,
    gitPull,
    gitPush,
    gitRebaseAbort,
    gitRebaseContinue,
    gitRebaseStart,
    gitReset,
    gitRevert,
    gitStashApply,
    gitStashDrop,
    gitStashList,
    gitStashSave,
    gitStage,
    gitStageAll,
    gitStatus,
    gitTagCreate,
    gitTagDelete,
    gitTagList,
    gitUnstage,
    gitUnstageAll
  } from '$lib/utils/gitApi';

  export let workspaceId: string;
  export let projectId: string;
  export let projectPath: string;
  export let detached = false;

  type WorkbenchTab =
    | 'changes'
    | 'history'
    | 'branches'
    | 'remotes'
    | 'stash'
    | 'tags'
    | 'pull-requests'
    | 'issues'
    | 'advanced';

  const tabs: Array<{ id: WorkbenchTab; label: string }> = [
    { id: 'changes', label: 'Changes' },
    { id: 'history', label: 'History' },
    { id: 'branches', label: 'Branches' },
    { id: 'remotes', label: 'Remotes' },
    { id: 'stash', label: 'Stash' },
    { id: 'tags', label: 'Tags' },
    { id: 'pull-requests', label: 'PRs' },
    { id: 'issues', label: 'Issues' },
    { id: 'advanced', label: 'Advanced' }
  ];

  const dispatch = createEventDispatcher<{
    close: void;
    detach: void;
    dock: void;
  }>();

  let activeTab: WorkbenchTab = 'changes';
  let loading = false;
  let operationLoading = false;
  let errorMessage = '';
  let successMessage = '';

  let statuses: GitFileStatus[] = [];
  let selectedStagedPaths: Set<string> = new Set();
  let selectedUnstagedPaths: Set<string> = new Set();
  let selectedDiffPath = '';
  let selectedDiffStaged = false;
  let diffContent = '';

  let commits: GitCommit[] = [];
  let branches: GitBranchSet = { local: [], remote: [] };
  let remotes: GitRemote[] = [];
  let stashEntries: GitStashEntry[] = [];
  let tagEntries: GitTagEntry[] = [];
  let ghStatus: GhAuthStatus = { authenticated: false, details: '' };
  let pullRequests: GhPullRequest[] = [];
  let issues: GhIssue[] = [];

  let commitMessage = '';
  let newBranchName = '';
  let checkoutBranchName = '';
  let checkoutFromRef = '';
  let remoteName = 'origin';
  let remoteBranch = '';
  let setUpstream = false;
  let forcePush = false;

  let stashMessage = '';
  let stashRef = '';
  let stashPop = false;
  let tagName = '';
  let tagTarget = '';

  let prTitle = '';
  let prBody = '';
  let prBase = '';
  let prHead = '';
  let prDraft = false;

  let issueTitle = '';
  let issueBody = '';

  let rebaseUpstream = '';
  let cherryPickCommit = '';
  let resetMode: 'soft' | 'mixed' | 'hard' = 'mixed';
  let resetTarget = 'HEAD';
  let revertCommit = '';
  let revertNoCommit = false;

  $: stagedChanges = statuses.filter(file => file.staged);
  $: unstagedChanges = statuses.filter(file => file.unstaged || file.untracked);

  function clearFlashMessages(): void {
    successMessage = '';
    errorMessage = '';
  }

  function setSuccess(message: string): void {
    successMessage = message;
    errorMessage = '';
  }

  function setError(message: string): void {
    errorMessage = message;
    successMessage = '';
  }

  function openDiff(path: string, staged: boolean): void {
    selectedDiffPath = path;
    selectedDiffStaged = staged;
    void loadDiff();
  }

  async function loadDiff(): Promise<void> {
    if (!selectedDiffPath) {
      diffContent = '';
      return;
    }

    try {
      diffContent = await gitDiff(projectPath, selectedDiffPath, selectedDiffStaged);
    } catch (error) {
      setError(String(error));
      diffContent = '';
    }
  }

  async function loadStatus(): Promise<void> {
    statuses = await gitStatus(projectPath);
    if (selectedDiffPath) {
      const stillExists = statuses.some(file => file.path === selectedDiffPath);
      if (!stillExists) {
        selectedDiffPath = '';
        diffContent = '';
      }
    }
  }

  async function loadCoreData(): Promise<void> {
    const [nextStatus, nextCommits, nextBranches, nextRemotes] = await Promise.all([
      gitStatus(projectPath),
      gitLog(projectPath, 120),
      gitListBranches(projectPath),
      gitListRemotes(projectPath)
    ]);

    statuses = nextStatus;
    commits = nextCommits;
    branches = nextBranches;
    remotes = nextRemotes;

    if (!remoteBranch) {
      const currentBranch = branches.local.find(branch => branch.isCurrent);
      remoteBranch = currentBranch?.name || '';
    }

    if (!checkoutBranchName) {
      checkoutBranchName = branches.local.find(branch => branch.isCurrent)?.name || '';
    }
  }

  async function loadGitHubData(): Promise<void> {
    ghStatus = await ghAuthStatus(projectPath);
    if (!ghStatus.authenticated) {
      pullRequests = [];
      issues = [];
      return;
    }

    const [prs, nextIssues] = await Promise.all([
      ghPrList(projectPath, 40),
      ghIssueList(projectPath, 40)
    ]);

    pullRequests = prs;
    issues = nextIssues;
  }

  async function refreshAll(): Promise<void> {
    loading = true;
    clearFlashMessages();

    try {
      await Promise.all([
        loadCoreData(),
        gitStashList(projectPath).then(data => stashEntries = data),
        gitTagList(projectPath).then(data => tagEntries = data),
        loadGitHubData()
      ]);
      if (selectedDiffPath) {
        await loadDiff();
      }
    } catch (error) {
      setError(String(error));
    } finally {
      loading = false;
    }
  }

  async function runOperation(label: string, operation: () => Promise<GitCommandResult | void>): Promise<void> {
    operationLoading = true;
    clearFlashMessages();

    try {
      const result = await operation();
      if (result && result.stderr.trim()) {
        setSuccess(`${label} completed with notes: ${result.stderr.trim()}`);
      } else {
        setSuccess(`${label} completed.`);
      }
      await refreshAll();
    } catch (error) {
      setError(String(error));
    } finally {
      operationLoading = false;
    }
  }

  function toggleStagedSelection(path: string): void {
    const next = new Set(selectedStagedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    selectedStagedPaths = next;
  }

  function toggleUnstagedSelection(path: string): void {
    const next = new Set(selectedUnstagedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    selectedUnstagedPaths = next;
  }

  async function stageSelected(): Promise<void> {
    const paths = Array.from(selectedUnstagedPaths);
    if (paths.length === 0) {
      setError('Select at least one unstaged file to stage.');
      return;
    }

    await runOperation('Stage selected files', async () => await gitStage(projectPath, paths));
    selectedUnstagedPaths = new Set();
  }

  async function unstageSelected(): Promise<void> {
    const paths = Array.from(selectedStagedPaths);
    if (paths.length === 0) {
      setError('Select at least one staged file to unstage.');
      return;
    }

    await runOperation('Unstage selected files', async () => await gitUnstage(projectPath, paths));
    selectedStagedPaths = new Set();
  }

  async function submitCommit(): Promise<void> {
    if (!commitMessage.trim()) {
      setError('Commit message is required.');
      return;
    }

    await runOperation('Commit', async () => await gitCommit(projectPath, commitMessage.trim()));
    commitMessage = '';
  }

  async function createBranch(): Promise<void> {
    if (!newBranchName.trim()) {
      setError('Branch name is required.');
      return;
    }

    await runOperation('Create branch', async () => await gitCreateBranch(projectPath, newBranchName.trim(), checkoutFromRef || undefined));
    newBranchName = '';
  }

  async function checkoutBranch(): Promise<void> {
    if (!checkoutBranchName.trim()) {
      setError('Branch name is required for checkout.');
      return;
    }

    await runOperation('Checkout branch', async () => await gitCheckoutBranch(projectPath, checkoutBranchName.trim()));
  }

  async function switchBranch(name: string): Promise<void> {
    await runOperation(`Checkout ${name}`, async () => await gitCheckoutBranch(projectPath, name));
  }

  async function deleteBranch(name: string): Promise<void> {
    const confirmed = window.confirm(`Delete branch \"${name}\"?`);
    if (!confirmed) return;

    await runOperation(`Delete branch ${name}`, async () => await gitDeleteBranch(projectPath, name, false));
  }

  async function doFetch(): Promise<void> {
    await runOperation('Fetch', async () => await gitFetch(projectPath, remoteName || undefined));
  }

  async function doPull(): Promise<void> {
    await runOperation('Pull', async () => await gitPull(projectPath, remoteName || undefined, remoteBranch || undefined));
  }

  async function doPush(): Promise<void> {
    await runOperation('Push', async () => await gitPush(projectPath, remoteName || undefined, remoteBranch || undefined, setUpstream, forcePush));
  }

  async function saveStash(): Promise<void> {
    await runOperation('Stash save', async () => await gitStashSave(projectPath, stashMessage || undefined));
    stashMessage = '';
  }

  async function applyStash(): Promise<void> {
    if (!stashRef.trim()) {
      setError('Stash reference is required. Example: stash@{0}');
      return;
    }

    await runOperation('Stash apply', async () => await gitStashApply(projectPath, stashRef.trim(), stashPop));
  }

  async function dropStash(ref: string): Promise<void> {
    const confirmed = window.confirm(`Drop stash \"${ref}\"?`);
    if (!confirmed) return;

    await runOperation(`Drop ${ref}`, async () => await gitStashDrop(projectPath, ref));
  }

  async function createTag(): Promise<void> {
    if (!tagName.trim()) {
      setError('Tag name is required.');
      return;
    }

    await runOperation('Create tag', async () => await gitTagCreate(projectPath, tagName.trim(), tagTarget || undefined));
    tagName = '';
  }

  async function deleteTag(name: string): Promise<void> {
    const confirmed = window.confirm(`Delete tag \"${name}\"?`);
    if (!confirmed) return;

    await runOperation(`Delete tag ${name}`, async () => await gitTagDelete(projectPath, name));
  }

  async function createPullRequest(): Promise<void> {
    if (!prTitle.trim()) {
      setError('PR title is required.');
      return;
    }

    await runOperation('Create pull request', async () => await ghPrCreate(
      projectPath,
      prTitle.trim(),
      prBody,
      prBase || undefined,
      prHead || undefined,
      prDraft
    ));

    prTitle = '';
    prBody = '';
  }

  async function createIssue(): Promise<void> {
    if (!issueTitle.trim()) {
      setError('Issue title is required.');
      return;
    }

    await runOperation('Create issue', async () => await ghIssueCreate(projectPath, issueTitle.trim(), issueBody));

    issueTitle = '';
    issueBody = '';
  }

  async function runRebaseStart(): Promise<void> {
    if (!rebaseUpstream.trim()) {
      setError('Upstream branch is required.');
      return;
    }

    const confirmed = window.confirm(`Start rebase onto \"${rebaseUpstream.trim()}\"?`);
    if (!confirmed) return;

    await runOperation('Rebase start', async () => await gitRebaseStart(projectPath, rebaseUpstream.trim()));
  }

  async function runCherryPick(): Promise<void> {
    if (!cherryPickCommit.trim()) {
      setError('Commit hash is required for cherry-pick.');
      return;
    }

    const confirmed = window.confirm(`Cherry-pick \"${cherryPickCommit.trim()}\"?`);
    if (!confirmed) return;

    await runOperation('Cherry-pick', async () => await gitCherryPick(projectPath, cherryPickCommit.trim()));
  }

  async function runReset(): Promise<void> {
    const target = resetTarget.trim() || 'HEAD';
    const confirmed = window.confirm(`Run git reset --${resetMode} ${target}?`);
    if (!confirmed) return;

    await runOperation(`Reset (${resetMode})`, async () => await gitReset(projectPath, resetMode, target));
  }

  async function runRevert(): Promise<void> {
    if (!revertCommit.trim()) {
      setError('Commit hash is required for revert.');
      return;
    }

    const confirmed = window.confirm(`Revert commit \"${revertCommit.trim()}\"?`);
    if (!confirmed) return;

    await runOperation('Revert commit', async () => await gitRevert(projectPath, revertCommit.trim(), revertNoCommit));
  }

  onMount(() => {
    void refreshAll();
  });
</script>

<div class="git-pane-shell">
  <header class="git-pane-header">
    <div class="left">
      <FolderGit2 size={15} />
      <span>GitHub Workbench</span>
      <span class="workspace-chip">{projectId.slice(0, 8)} · {workspaceId.slice(0, 8)}</span>
    </div>

    <div class="right">
      <button class="toolbar-btn" on:click={() => refreshAll()} disabled={loading || operationLoading}>
        <RefreshCw size={14} />
        <span>Refresh</span>
      </button>

      {#if detached}
        <button class="toolbar-btn" on:click={() => dispatch('dock')}>
          <PanelLeftClose size={14} />
          <span>Dock</span>
        </button>
      {:else}
        <button class="toolbar-btn" on:click={() => dispatch('detach')}>
          <ExternalLink size={14} />
          <span>Detach</span>
        </button>
        <button class="toolbar-btn danger" on:click={() => dispatch('close')}>
          <PanelTopClose size={14} />
          <span>Close</span>
        </button>
      {/if}
    </div>
  </header>

  <nav class="git-tab-bar" aria-label="Git Workbench Tabs">
    {#each tabs as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab.id}
        on:click={() => activeTab = tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </nav>

  {#if successMessage}
    <div class="flash success">{successMessage}</div>
  {/if}
  {#if errorMessage}
    <div class="flash error">{errorMessage}</div>
  {/if}

  <section class="git-content">
    {#if activeTab === 'changes'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <FileCode2 size={14} />
            <span>Unstaged ({unstagedChanges.length})</span>
            <div class="spacer"></div>
            <button class="small-btn" on:click={stageSelected} disabled={operationLoading}>Stage Selected</button>
            <button class="small-btn" on:click={() => runOperation('Stage all', async () => await gitStageAll(projectPath))} disabled={operationLoading}>Stage All</button>
          </div>

          <div class="file-list">
            {#each unstagedChanges as file}
              <button class="file-row" on:click={() => openDiff(file.path, false)}>
                <input type="checkbox" checked={selectedUnstagedPaths.has(file.path)} on:click|stopPropagation={() => toggleUnstagedSelection(file.path)} />
                <span class="file-status">{file.indexStatus}{file.worktreeStatus}</span>
                <span class="file-path">{file.path}</span>
              </button>
            {:else}
              <div class="empty">No unstaged files.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <FileCode2 size={14} />
            <span>Staged ({stagedChanges.length})</span>
            <div class="spacer"></div>
            <button class="small-btn" on:click={unstageSelected} disabled={operationLoading}>Unstage Selected</button>
            <button class="small-btn" on:click={() => runOperation('Unstage all', async () => await gitUnstageAll(projectPath))} disabled={operationLoading}>Unstage All</button>
          </div>

          <div class="file-list">
            {#each stagedChanges as file}
              <button class="file-row" on:click={() => openDiff(file.path, true)}>
                <input type="checkbox" checked={selectedStagedPaths.has(file.path)} on:click|stopPropagation={() => toggleStagedSelection(file.path)} />
                <span class="file-status">{file.indexStatus}{file.worktreeStatus}</span>
                <span class="file-path">{file.path}</span>
              </button>
            {:else}
              <div class="empty">No staged files.</div>
            {/each}
          </div>
        </div>
      </div>

      <div class="panel diff-panel">
        <div class="panel-header">
          <CommitIcon size={14} />
          <span>Diff {selectedDiffPath ? `- ${selectedDiffPath}` : ''}</span>
        </div>
        <pre class="diff-content">{diffContent || 'Select a file to view diff.'}</pre>
      </div>

      <div class="panel commit-panel">
        <div class="panel-header">
          <CommitIcon size={14} />
          <span>Commit</span>
        </div>

        <div class="commit-actions">
          <textarea bind:value={commitMessage} placeholder="Commit message" rows="3"></textarea>
          <button class="primary-btn" on:click={submitCommit} disabled={operationLoading || !commitMessage.trim()}>
            Create Commit
          </button>
        </div>
      </div>
    {/if}

    {#if activeTab === 'history'}
      <div class="panel grow">
        <div class="panel-header">
          <CommitIcon size={14} />
          <span>History ({commits.length})</span>
        </div>
        <div class="history-list">
          {#each commits as commit}
            <article class="history-item">
              <header>
                <span class="hash">{commit.shortHash}</span>
                <span class="subject">{commit.subject}</span>
              </header>
              <div class="meta">{commit.authorName} · {commit.authoredAt}</div>
              {#if commit.body}
                <p class="body">{commit.body}</p>
              {/if}
            </article>
          {:else}
            <div class="empty">No commits found.</div>
          {/each}
        </div>
      </div>
    {/if}

    {#if activeTab === 'branches'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <GitBranch size={14} />
            <span>Local Branches</span>
          </div>
          <div class="branch-list">
            {#each branches.local as branch}
              <div class="branch-row">
                <button class="branch-name" on:click={() => switchBranch(branch.name)}>
                  <span class:current={branch.isCurrent}>{branch.name}</span>
                  {#if branch.isCurrent}<span class="pill">current</span>{/if}
                </button>
                <button class="small-btn danger" on:click={() => deleteBranch(branch.name)} disabled={branch.isCurrent}>Delete</button>
              </div>
            {:else}
              <div class="empty">No local branches.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Plus size={14} />
            <span>Branch Actions</span>
          </div>

          <div class="form-block">
            <label for="new-branch-name">Create new branch</label>
            <input id="new-branch-name" bind:value={newBranchName} placeholder="feature/my-branch" />
            <input id="checkout-from-ref" bind:value={checkoutFromRef} placeholder="from ref (optional)" />
            <button class="primary-btn" on:click={createBranch} disabled={operationLoading}>Create Branch</button>
          </div>

          <div class="form-block">
            <label for="checkout-branch-name">Checkout branch</label>
            <input id="checkout-branch-name" bind:value={checkoutBranchName} placeholder="branch name" />
            <button class="primary-btn" on:click={checkoutBranch} disabled={operationLoading}>Checkout</button>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'remotes'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <Layers size={14} />
            <span>Remotes</span>
          </div>
          <div class="remote-list">
            {#each remotes as remote}
              <article class="remote-item">
                <header>{remote.name}</header>
                <div class="meta">fetch: {remote.fetchUrl || '-'}</div>
                <div class="meta">push: {remote.pushUrl || '-'}</div>
              </article>
            {:else}
              <div class="empty">No remotes configured.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Upload size={14} />
            <span>Remote Operations</span>
          </div>

          <div class="form-block">
            <label for="remote-name">Remote</label>
            <input id="remote-name" bind:value={remoteName} placeholder="origin" />
            <label for="remote-branch">Branch</label>
            <input id="remote-branch" bind:value={remoteBranch} placeholder="main" />

            <div class="inline-actions">
              <button class="small-btn" on:click={doFetch} disabled={operationLoading}>Fetch</button>
              <button class="small-btn" on:click={doPull} disabled={operationLoading}>Pull</button>
              <button class="small-btn" on:click={doPush} disabled={operationLoading}>Push</button>
            </div>

            <label class="checkbox"><input type="checkbox" bind:checked={setUpstream} /> Set upstream</label>
            <label class="checkbox"><input type="checkbox" bind:checked={forcePush} /> Force push (--force-with-lease)</label>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'stash'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <ArchiveRestore size={14} />
            <span>Stash Entries</span>
          </div>

          <div class="stash-list">
            {#each stashEntries as entry}
              <div class="stash-item">
                <div class="stash-main">
                  <strong>{entry.reference}</strong>
                  <span>{entry.message}</span>
                </div>
                <div class="inline-actions">
                  <button class="small-btn" on:click={() => runOperation(`Apply ${entry.reference}`, async () => await gitStashApply(projectPath, entry.reference, false))}>Apply</button>
                  <button class="small-btn" on:click={() => runOperation(`Pop ${entry.reference}`, async () => await gitStashApply(projectPath, entry.reference, true))}>Pop</button>
                  <button class="small-btn danger" on:click={() => dropStash(entry.reference)}>Drop</button>
                </div>
              </div>
            {:else}
              <div class="empty">No stash entries.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Plus size={14} />
            <span>Stash Actions</span>
          </div>
          <div class="form-block">
            <label for="stash-message">Stash message</label>
            <input id="stash-message" bind:value={stashMessage} placeholder="WIP before refactor" />
            <button class="primary-btn" on:click={saveStash} disabled={operationLoading}>Create Stash</button>
          </div>

          <div class="form-block">
            <label for="stash-ref">Apply/Pop stash reference</label>
            <input id="stash-ref" bind:value={stashRef} placeholder="stash@{0}" />
            <label class="checkbox"><input type="checkbox" bind:checked={stashPop} /> Pop instead of apply</label>
            <button class="primary-btn" on:click={applyStash} disabled={operationLoading}>Run</button>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'tags'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <Tag size={14} />
            <span>Tags</span>
          </div>
          <div class="tag-list">
            {#each tagEntries as entry}
              <div class="tag-item">
                <div>
                  <strong>{entry.name}</strong>
                  <div class="meta">{entry.shortHash} · {entry.createdAt}</div>
                </div>
                <button class="small-btn danger" on:click={() => deleteTag(entry.name)}>Delete</button>
              </div>
            {:else}
              <div class="empty">No tags found.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Plus size={14} />
            <span>Create Tag</span>
          </div>

          <div class="form-block">
            <label for="tag-name">Tag name</label>
            <input id="tag-name" bind:value={tagName} placeholder="v1.2.0" />
            <label for="tag-target">Target (optional)</label>
            <input id="tag-target" bind:value={tagTarget} placeholder="HEAD" />
            <button class="primary-btn" on:click={createTag} disabled={operationLoading}>Create Tag</button>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'pull-requests'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <GitPullRequest size={14} />
            <span>Pull Requests</span>
            <div class="spacer"></div>
            <span class="auth-pill" class:ok={ghStatus.authenticated}>{ghStatus.authenticated ? 'Authenticated' : 'Auth Required'}</span>
          </div>

          <div class="auth-details">{ghStatus.details}</div>

          <div class="pr-list">
            {#each pullRequests as pr}
              <a class="pr-item" href={pr.url} target="_blank" rel="noreferrer">
                <span class="number">#{pr.number}</span>
                <span class="title">{pr.title}</span>
                <span class="meta">{pr.state} · {pr.headRefName} → {pr.baseRefName}</span>
              </a>
            {:else}
              <div class="empty">No pull requests available.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Plus size={14} />
            <span>Create Pull Request</span>
          </div>

          <div class="form-block">
            <input bind:value={prTitle} placeholder="PR title" />
            <textarea bind:value={prBody} rows="4" placeholder="PR description"></textarea>
            <input bind:value={prBase} placeholder="base branch (optional)" />
            <input bind:value={prHead} placeholder="head branch (optional)" />
            <label class="checkbox"><input type="checkbox" bind:checked={prDraft} /> Draft</label>
            <button class="primary-btn" on:click={createPullRequest} disabled={operationLoading || !ghStatus.authenticated}>Create PR</button>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'issues'}
      <div class="split-grid">
        <div class="panel">
          <div class="panel-header">
            <CircleDot size={14} />
            <span>Issues</span>
          </div>

          <div class="issue-list">
            {#each issues as issue}
              <a class="issue-item" href={issue.url} target="_blank" rel="noreferrer">
                <span class="number">#{issue.number}</span>
                <span class="title">{issue.title}</span>
                <span class="meta">{issue.state} · {issue.author?.login || 'unknown'}</span>
              </a>
            {:else}
              <div class="empty">No issues available.</div>
            {/each}
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <Plus size={14} />
            <span>Create Issue</span>
          </div>

          <div class="form-block">
            <input bind:value={issueTitle} placeholder="Issue title" />
            <textarea bind:value={issueBody} rows="4" placeholder="Issue description"></textarea>
            <button class="primary-btn" on:click={createIssue} disabled={operationLoading || !ghStatus.authenticated}>Create Issue</button>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTab === 'advanced'}
      <div class="panel grow">
        <div class="panel-header">
          <AlertTriangle size={14} />
          <span>Risky Operations (confirm required)</span>
        </div>

        <div class="advanced-grid">
          <div class="form-block warning">
            <label for="rebase-upstream">Rebase start (upstream)</label>
            <input id="rebase-upstream" bind:value={rebaseUpstream} placeholder="origin/main" />
            <div class="inline-actions">
              <button class="small-btn" on:click={runRebaseStart}>Start</button>
              <button class="small-btn" on:click={() => runOperation('Rebase continue', async () => await gitRebaseContinue(projectPath))}>Continue</button>
              <button class="small-btn danger" on:click={() => runOperation('Rebase abort', async () => await gitRebaseAbort(projectPath))}>Abort</button>
            </div>
          </div>

          <div class="form-block warning">
            <label for="cherry-pick-commit">Cherry-pick commit</label>
            <input id="cherry-pick-commit" bind:value={cherryPickCommit} placeholder="abc1234" />
            <button class="small-btn" on:click={runCherryPick}>Cherry-pick</button>
          </div>

          <div class="form-block warning">
            <label for="reset-mode">Reset</label>
            <select id="reset-mode" bind:value={resetMode}>
              <option value="soft">soft</option>
              <option value="mixed">mixed</option>
              <option value="hard">hard</option>
            </select>
            <input id="reset-target" bind:value={resetTarget} placeholder="HEAD" />
            <button class="small-btn danger" on:click={runReset}>Run reset</button>
          </div>

          <div class="form-block warning">
            <label for="revert-commit">Revert commit</label>
            <input id="revert-commit" bind:value={revertCommit} placeholder="commit hash" />
            <label class="checkbox"><input type="checkbox" bind:checked={revertNoCommit} /> --no-commit</label>
            <button class="small-btn" on:click={runRevert}>Revert</button>
          </div>
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .git-pane-shell {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--terminal-pane-bg, #09090b) 86%, #000 14%);
    color: var(--text-primary, #e4e4e7);
    overflow: hidden;
  }

  .git-pane-header {
    height: 36px;
    min-height: 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
    border-bottom: 1px solid var(--terminal-toolbar-border-color, #27272a);
    background: var(--terminal-toolbar-bg, #111115);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary, #d4d4d8);
  }

  .workspace-chip {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ui-accent, #6366f1) 18%, #000 82%);
    color: var(--ui-accent, #818cf8);
  }

  .right {
    display: flex;
    gap: 8px;
  }

  .toolbar-btn,
  .small-btn,
  .primary-btn {
    border: 1px solid var(--terminal-toolbar-btn-border, #3f3f46);
    background: var(--terminal-toolbar-btn-bg, #18181b);
    color: var(--text-secondary, #d4d4d8);
    border-radius: 6px;
    font-size: 11px;
    height: 26px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .toolbar-btn:hover,
  .small-btn:hover,
  .primary-btn:hover {
    border-color: var(--terminal-toolbar-btn-hover-border, #818cf8);
    color: var(--text-primary, #fff);
  }

  .primary-btn {
    background: color-mix(in srgb, var(--ui-accent, #6366f1) 22%, #111827 78%);
    color: #f8fafc;
  }

  .toolbar-btn:disabled,
  .small-btn:disabled,
  .primary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .danger {
    border-color: color-mix(in srgb, #ef4444 40%, var(--terminal-toolbar-btn-border, #3f3f46));
  }

  .git-tab-bar {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--panel-border, #27272a);
    overflow-x: auto;
  }

  .tab-btn {
    border: 1px solid var(--panel-border, #27272a);
    background: color-mix(in srgb, var(--panel-bg, #18181b) 84%, #000 16%);
    color: var(--text-secondary, #a1a1aa);
    border-radius: 999px;
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
    white-space: nowrap;
  }

  .tab-btn.active {
    color: var(--ui-accent, #a78bfa);
    border-color: color-mix(in srgb, var(--ui-accent, #818cf8) 40%, #52525b 60%);
    background: color-mix(in srgb, var(--ui-accent, #818cf8) 18%, transparent);
  }

  .flash {
    margin: 8px 10px 0;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .flash.success {
    background: color-mix(in srgb, #16a34a 18%, transparent);
    border: 1px solid color-mix(in srgb, #16a34a 35%, #27272a);
    color: #bbf7d0;
  }

  .flash.error {
    background: color-mix(in srgb, #dc2626 18%, transparent);
    border: 1px solid color-mix(in srgb, #dc2626 35%, #27272a);
    color: #fecaca;
  }

  .git-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .split-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .panel {
    border: 1px solid var(--panel-border, #27272a);
    border-radius: 10px;
    background: color-mix(in srgb, var(--panel-bg, #18181b) 86%, #000 14%);
    min-height: 120px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel.grow {
    flex: 1;
    min-height: 0;
  }

  .panel-header {
    height: 34px;
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border-bottom: 1px solid var(--panel-border, #27272a);
    font-size: 12px;
    color: var(--text-secondary, #c4c4cc);
  }

  .spacer {
    flex: 1;
  }

  .file-list,
  .branch-list,
  .remote-list,
  .stash-list,
  .tag-list,
  .pr-list,
  .issue-list,
  .history-list {
    min-height: 0;
    overflow: auto;
  }

  .file-row,
  .branch-row,
  .stash-item,
  .tag-item,
  .history-item,
  .remote-item,
  .pr-item,
  .issue-item {
    border-bottom: 1px solid color-mix(in srgb, var(--panel-border, #27272a) 78%, transparent);
    padding: 8px 10px;
    font-size: 12px;
  }

  .file-row {
    width: 100%;
    display: grid;
    grid-template-columns: 20px 34px 1fr;
    gap: 8px;
    align-items: center;
    background: transparent;
    color: inherit;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--panel-border, #27272a) 78%, transparent);
    cursor: pointer;
    text-align: left;
  }

  .file-row:hover,
  .pr-item:hover,
  .issue-item:hover,
  .branch-name:hover {
    background: color-mix(in srgb, var(--interactive-hover-bg, #27272a) 72%, transparent);
  }

  .file-status {
    color: var(--ui-accent, #818cf8);
    font-family: 'JetBrains Mono', monospace;
  }

  .file-path {
    color: var(--text-primary, #e4e4e7);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .diff-panel {
    min-height: 180px;
    max-height: 300px;
  }

  .diff-content {
    margin: 0;
    flex: 1;
    overflow: auto;
    padding: 10px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: #d4d4d8;
    background: color-mix(in srgb, #000 58%, var(--panel-bg, #18181b));
  }

  .commit-actions,
  .form-block {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-block.warning {
    border: 1px dashed color-mix(in srgb, #f97316 50%, var(--panel-border, #27272a));
    border-radius: 10px;
    background: color-mix(in srgb, #f97316 12%, transparent);
  }

  .advanced-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
    padding: 10px;
  }

  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid var(--panel-border, #3f3f46);
    border-radius: 8px;
    background: color-mix(in srgb, var(--panel-bg, #111115) 74%, #000 26%);
    color: var(--text-primary, #e4e4e7);
    font-size: 12px;
    padding: 8px 10px;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
  }

  label {
    color: var(--text-secondary, #a1a1aa);
    font-size: 11px;
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .checkbox input {
    width: auto;
    padding: 0;
  }

  .history-item header,
  .stash-main {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .hash,
  .number,
  .pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    border-radius: 999px;
    padding: 1px 6px;
    background: color-mix(in srgb, var(--ui-accent, #818cf8) 16%, #000 84%);
    color: var(--ui-accent, #818cf8);
  }

  .pill {
    font-size: 9px;
  }

  .subject,
  .title {
    color: var(--text-primary, #f4f4f5);
  }

  .meta,
  .body,
  .auth-details {
    color: var(--text-muted, #9ca3af);
    font-size: 11px;
  }

  .branch-row,
  .tag-item,
  .stash-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .branch-name {
    border: 0;
    background: transparent;
    color: var(--text-primary, #e4e4e7);
    padding: 4px 6px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .branch-name .current {
    color: #86efac;
  }

  .pr-item,
  .issue-item {
    display: grid;
    gap: 4px;
    text-decoration: none;
    color: inherit;
  }

  .auth-pill {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 10px;
    background: color-mix(in srgb, #dc2626 16%, #000 84%);
    color: #fca5a5;
  }

  .auth-pill.ok {
    background: color-mix(in srgb, #16a34a 20%, #000 80%);
    color: #bbf7d0;
  }

  .empty {
    padding: 16px;
    color: var(--text-muted, #71717a);
    font-size: 12px;
  }

  @media (max-width: 1024px) {
    .split-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
