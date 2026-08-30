import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  completeSetup: () => ipcRenderer.send('setup-complete'),
  getPort: () => ipcRenderer.invoke('get-port'),
  onUpdateProgress: (callback: any) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
});
