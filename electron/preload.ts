import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPort: () => ipcRenderer.invoke('get-port'),
  onUpdateProgress: (callback: any) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
});
