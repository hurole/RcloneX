import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import ReactHook from 'alova/react';

const net = createAlova({
  requestAdapter: adapterFetch(),
  responded: (response) => response.json(),
  statesHook: ReactHook,
  beforeRequest(method) {
    const rc = localStorage.getItem('rclone-rc');
    const token = localStorage.getItem('rclone-token');
    if (rc == null || token == null) {
      location.href = '/login';
      return;
    }
    method.baseURL = rc;
    method.config.headers.Authorization = `Basic ${token}`;
  },
});

export { net };
