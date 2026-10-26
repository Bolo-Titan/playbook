import { defineConfig } from 'vite';

export default defineConfig({
  // Unterordner auf GitHub Pages: https://<NUTZER>.github.io/<REPO>/
  // Heißt das Repository anders als "playbook", hier anpassen.
  base: '/playbook/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
