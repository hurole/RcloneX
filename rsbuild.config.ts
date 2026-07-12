import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import pkg from './package.json';

export default defineConfig({
  source: {
    define: {
      'process.env.APP_VERSION': JSON.stringify(pkg.version),
      'process.env.GITHUB_PAGES': JSON.stringify(!!process.env.GITHUB_PAGES),
    },
  },
  output: {
    assetPrefix: process.env.GITHUB_PAGES ? '/RcloneX/' : '/',
    sourceMap: {
      js: 'source-map',
    },
  },
  html: {
    template: './public/index.html',
    favicon: './src/assets/appIcon.png',
    meta: {
      description: 'A fast、beautify UI of Rclone ',
    },
  },
  resolve: {
    alias: {
      '@': './src',
      '@pages': './src/pages',
      '@components': './src/components',
      '@utils': './src/shared/utils',
    },
  },
  plugins: [pluginReact()],
});
