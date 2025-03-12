import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const Login: FC = () => {
  const { t, i18n } = useTranslation();
  console.log(i18n.language);
  return (
    <div>
      <button className="btn">按钮</button>
      <span>{t('hello')}</span>
    </div>
  );
};

export default Login;
