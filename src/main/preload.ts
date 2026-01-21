import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  version: process.versions.electron,
  test: () => 'Main process connection successful',
});
