import solid from 'solid-start/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import suidPlugin from '@suid/vite-plugin';
import eslint from 'vite-plugin-eslint'

export default defineConfig({
  plugins: [
    solid(),
    solidPlugin(),
    suidPlugin(),
    eslint()
  ],
  extends: ['eslint:recommended', 'plugin:solid/recommended'],
  build: {
    target: 'esnext',
  },
});
