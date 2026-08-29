import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } from 'electron';
import { join } from 'path';
import { createServer } from 'net';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';
import ffmpegStatic from 'ffmpeg-static';
// @ts-ignore
import ffprobeStatic from 'ffprobe-static';
import dotenv from 'dotenv';
import { autoUpdater } from 'electron-updater';

const store = new Store() as any;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 2886; // User requested port 2886

// Load personal .env.local if available (packaged or dev)
try {
  dotenv.config({ path: join(process.resourcesPath, '.env.local') });
} catch {
  // Ignore if it doesn't exist
}

// Find a free port starting from preferred port
async function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(startPort, () => {
      const port = (server.address() as any).port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

// Get OS-appropriate app data path
function getAppDataPath(): string {
  return app.getPath('userData');
}

// Start the Next.js server (only in production/packaged mode)
async function startServer(port: number) {
  if (!app.isPackaged) return;

  const appDataPath = getAppDataPath();
  const serverPath = join(process.resourcesPath, 'server.js');
  const nodeExecutable = process.execPath;
  const args = [serverPath];

  serverProcess = spawn(nodeExecutable, args, {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: port.toString(),
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      VIDLOCK_DATA_PATH: appDataPath,
      FFMPEG_PATH: ffmpegStatic || 'ffmpeg',
      FFPROBE_PATH: ffprobeStatic.path || 'ffprobe',
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout?.on('data', (data) => {
    console.log('[Server]', data.toString().trim());
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error('[Server Error]', data.toString().trim());
  });

  // Wait for server to be ready
  return new Promise<void>((resolve) => {
    serverProcess!.stdout?.on('data', (data) => {
      if (data.toString().includes('VidLock ready')) {
        resolve();
      }
    });
    setTimeout(resolve, 10000);
  });
}

async function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  await splashWindow.loadFile('electron/splash.html');
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

async function createWindow() {
  const windowBounds = store.get('windowBounds', {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined
  }) as any;

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'VidLock',
    icon: join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
  });

  mainWindow.setMenu(null);

  const saveBounds = () => {
    if (mainWindow && !mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
  });

  await mainWindow.loadURL(`http://localhost:${serverPort}`);

  // App will now fully close when clicking 'X' because we removed the preventDefault logic

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = join(__dirname, '../build/tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback if missing
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open VidLock',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: 'Open in Browser',
      click: () => {
        shell.openExternal(`http://localhost:${serverPort}`);
      }
    },
    { type: 'separator' },
    {
      label: 'Start on Login',
      type: 'checkbox',
      checked: store.get('startOnLogin', false) as boolean,
      click: (item) => {
        store.set('startOnLogin', item.checked);
        app.setLoginItemSettings({ openAtLogin: item.checked });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit VidLock',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip(`VidLock — port ${serverPort}`);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await createSplashWindow();

  if (app.isPackaged) {
    serverPort = await findFreePort(2886);
    console.log(`[Electron] Starting server on port ${serverPort}`);
    await startServer(serverPort);
    console.log('[Electron] Server ready');
    
    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    serverPort = 2886;
    console.log(`[Electron] Dev mode: connecting to localhost:${serverPort}`);
  }

  createTray();
  await createWindow();
  
  // Close splash screen once main window is ready
  if (splashWindow) {
    splashWindow.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  if (tray) {
    tray.destroy();
  }
  if (serverProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', serverProcess.pid!.toString(), '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
    }
  }
});

(app as any).isQuitting = false;

// IPC Handlers
ipcMain.on('setup-complete', () => {
  store.set('setupComplete', true);
});
ipcMain.handle('get-port', () => serverPort);
