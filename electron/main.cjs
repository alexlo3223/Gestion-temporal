// App de escritorio: arranca server.cjs en un puerto libre y lo muestra en una ventana.
// Nube: si existe <userData>/config.json con {"url": "https://tu-web"}, abre esa web en vez del servidor local.
const { app, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function cloudUrl() {
  try {
    const { url } = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8'));
    return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
  } catch {
    return null; // sin config: modo local
  }
}

function localUrl() {
  // el asar es de solo lectura: los datos van a la carpeta del usuario (%APPDATA%\Gestor tiempo)
  process.env.DATA_FILE = path.join(app.getPath('userData'), 'gestor-datos.json');
  const server = require('../server.cjs');
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
}

app.whenReady().then(async () => {
  const url = cloudUrl() ?? (await localUrl());
  const win = new BrowserWindow({ width: 1280, height: 820, backgroundColor: '#131313', autoHideMenuBar: true, title: 'Gestor tiempo' });
  win.webContents.setWindowOpenHandler(({ url: link }) => {
    shell.openExternal(link); // enlaces externos al navegador, no dentro de la app
    return { action: 'deny' };
  });
  win.loadURL(url);
});

app.on('window-all-closed', () => app.quit());
