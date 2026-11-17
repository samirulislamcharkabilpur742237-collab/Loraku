import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { initDatabase, UPLOADS_DIR } from './server/db.ts';
import { adminRouter } from './server/routes/admin.ts';
import { publicRouter } from './server/routes/public.ts';

dotenv.config();

async function startServer() {
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // Serve owner-uploaded assets (logo, UPI QR, custom product photos)
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Direct download route for the clean source-code ZIP archive (no secrets or runtime DB)
  app.get('/download/loraku-dry-fruits-project.zip', (_req, res) => {
    const zipPath = path.resolve(process.cwd(), 'loraku-dry-fruits-project.zip');
    if (!fs.existsSync(zipPath)) {
      res.status(404).json({ error: 'Project ZIP archive has not been generated yet.' });
      return;
    }
    res.download(zipPath, 'loraku-dry-fruits-project.zip');
  });

  // API Routes
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  if (!isProd) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Production build not found. Run npm run build.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LORAKU DRY FRUITS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
