import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'data-folder-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/data/')) {
            const filePath = path.resolve(__dirname, '..', req.url.slice(1));
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              res.writeHead(200, {
                'Content-Type': filePath.endsWith('.json') ? 'application/json' : 'text/csv',
                'Access-Control-Allow-Origin': '*'
              });
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          next();
        });
      },
      closeBundle() {
        const src = path.resolve(__dirname, '../data');
        const dest = path.resolve(__dirname, 'dist/data');
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
          console.log(`Copied ${src} to ${dest}`);
        }
      }
    }
  ],
  server: {
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../data')
      ]
    },
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, '')
      }
    }
  }
})
