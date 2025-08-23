import { net } from '@/shared/utils/net';

export const connect = () => {
  return net.post({ url: '/rc/noop' });
};
