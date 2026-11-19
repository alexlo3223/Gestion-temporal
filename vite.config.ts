import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Con CDN_URL (p. ej. https://cdn.ejemplo.com/) los archivos de /assets se piden a esa CDN; sin ella, del propio servidor.
  // Llevan el hash del contenido en el nombre, así que la CDN puede guardarlos para siempre.
  base: process.env.CDN_URL || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Ruta canónica del disco (la misma forma que Vite usa al resolver archivos). En Windows, una ruta con la unidad en otra
    // capitalización (c: / C:) hace que Vite trate como módulos distintos los de "@/..." y los relativos, y React se duplica.
    alias: { '@': realpathSync.native(resolve('src')) },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
