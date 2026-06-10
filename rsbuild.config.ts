import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import pkg from './package.json';

export default defineConfig({
  source: {
    define: {
      'process.env.APP_VERSION': JSON.stringify(pkg.version),
    },
  },
  output: {
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
