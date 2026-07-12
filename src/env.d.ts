/// <reference types="@rsbuild/core/types" />

import * as React from 'react';

declare namespace NodeJS {
  interface ProcessEnv {
    APP_VERSION: string;
  }
}

declare module 'next-themes' {
  interface ThemeProviderProps {
    children?: React.ReactNode;
  }
}
