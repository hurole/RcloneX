import { net } from '@utils';

export const connect = () => {
  return net.Post('/rc/noop');
};
