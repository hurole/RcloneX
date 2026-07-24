import Home from '@pages/home';
import Login from '@pages/login';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import Config from './config';
import Dashboard from './dashboard';
import Explorer from './explorer';
import Logs from './logs';
import Mounts from './mounts';
import Schedules from './schedules';
import Tasks from './tasks';
import type { FC } from 'react';

const App: FC = () => {
  return (
    <div>
      <BrowserRouter basename={process.env.GITHUB_PAGES ? '/RcloneX' : '/'}>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route index path="dashboard" element={<Dashboard />} />
            <Route path="configs" element={<Config />} />
            <Route path="explorer" element={<Explorer />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="schedules" element={<Schedules />} />
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
