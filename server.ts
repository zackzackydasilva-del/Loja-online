import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { app, verifyAdminToken } from './src/server/apiApp.ts';
import { attachPresenceWebSocket } from './src/server/presenceHub.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const assetsDir = path.resolve(process.cwd(), 'src', 'assets', 'images');
    if (fs.existsSync(assetsDir)) {
      app.use('/src/assets/images', express.static(assetsDir));
    }
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  const httpServer = http.createServer(app);
  attachPresenceWebSocket(httpServer, verifyAdminToken);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Lunora server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
