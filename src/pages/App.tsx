import Home from '@pages/home';
import Login from '@pages/login';
import type { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import Config from './config';
import Dashboard from './dashboard';
import Explorer from './explorer';
import Logs from './logs';
import Mounts from './mounts';
import Tasks from './tasks';

const App: FC = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index path="dashboard" element={<Dashboard />} />
            <Route path="configs" element={<Config />} />
            <Route path="explorer" element={<Explorer />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="mounts" element={<Mounts />} />
            <Route path="logs" element={<Logs />} />
          </Route>
          <Route path="login" element={<Login />} />
          <Route path="*" element={<div>404</div>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default App;
