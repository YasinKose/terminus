import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import DetachedGitView from './DetachedGitView.svelte'

const params = new URLSearchParams(window.location.search)
const isGitView = params.get('view') === 'git'
const target = document.getElementById('app')!

const app = isGitView
  ? mount(DetachedGitView, {
      target,
      props: {
        workspaceId: params.get('workspaceId') || '',
        projectId: params.get('projectId') || ''
      }
    })
  : mount(App, { target })

export default app
