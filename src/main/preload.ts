import { contextBridge, ipcRenderer } from 'electron';
import { AppAction } from '../shared/types.js';

contextBridge.exposeInMainWorld('api', {
  dispatch: (action: AppAction) => ipcRenderer.invoke('dispatch-action', action),
});
