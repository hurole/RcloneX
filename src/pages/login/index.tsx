import { connect } from '@/services';
import { setLocal } from '@/utils/local';
import { useRequest } from 'alova/client';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';

const Login: FC = () => {
  const { t } = useTranslation();
  const [remote, setRemote] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const { send } = useRequest(connect, {
    immediate: false,
  });

  const onBtnClick = async () => {
    setLocal(remote, user, password);
    const data = await send();
    console.log('onClick', data);
  };

  return (
    <div className="contain-layout h-screen bg-amber-100 flex justify-center items-center">
      <div className="bg-white py-10 px-12 rounded-2xl w-100">
        <legend className="text-3xl font-bold">{t('connectAuth')}</legend>
        <label className="input input-lg text-lg mt-10">
          <input
            value={remote}
            type="text"
            placeholder={t('remoteAddress')}
            onChange={(event) => setRemote(event.target.value)}
          />
        </label>
        <label className="input input-lg block mt-6">
          <input
            value={user}
            type="text"
            placeholder={t('user')}
            onChange={(event) => setUser(event.target.value)}
          />
        </label>
        <label className="input input-lg block mt-6">
          <input
            value={password}
            type="password"
            placeholder={t('password')}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button
          className="btn w-full h-14 btn-primary text-lg mt-6 text text"
          onClick={onBtnClick}
        >
          {t('connect')}
        </button>
      </div>
    </div>
  );
};

export default Login;
