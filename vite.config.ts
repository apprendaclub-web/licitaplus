import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import type { Plugin } from 'vite';

// Middleware para simular localmente a Serverless Function do Vercel
const localApiPlugin = (): Plugin => ({
  name: 'local-api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url?.startsWith('/api/analyze-edital')) {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (req.method === 'POST') {
          try {
            const buffers: Buffer[] = [];
            for await (const chunk of req) {
              buffers.push(chunk as Buffer);
            }
            const body = JSON.parse(Buffer.concat(buffers).toString());

            // Carrega dinamicamente a função para compilação sob demanda pelo Vite
            const { default: handler } = await import('./api/analyze-edital');

            // Mock simplificado do objeto response compatível com Vercel
            const mockRes = {
              statusCode: 200,
              status(code: number) {
                this.statusCode = code;
                return this;
              },
              json(data: any) {
                res.writeHead(this.statusCode, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify(data));
              },
              end(data?: any) {
                res.statusCode = this.statusCode;
                res.end(data);
              },
              setHeader(name: string, value: string) {
                res.setHeader(name, value);
              }
            } as any;

            const mockReq = {
              method: 'POST',
              body,
              headers: req.headers,
            } as any;

            await handler(mockReq, mockRes);
          } catch (err: any) {
            console.error('Erro na execução local da API:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
