import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import { getSetupStatus } from '../https';

const Auth = () => {
  useEffect(() => {
    document.title = "RestOS | Auth";
  }, []);
  const [isLogin, setIsLogin] = useState(true);
  const { data } = useQuery({ queryKey: ['setup'], queryFn: getSetupStatus });
  const needsOwner = data?.data?.data?.needsOwner;

  return (
    <>
      {isLogin || !needsOwner ? (
        <LoginForm onToggleForm={needsOwner ? () => setIsLogin(false) : undefined} />
      ) : (
        <RegisterForm onToggleForm={() => setIsLogin(true)} />
      )}
    </>
  );
};

export default Auth;
