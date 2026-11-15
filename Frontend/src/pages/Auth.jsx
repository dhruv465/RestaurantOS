import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import PinSignIn from '../components/Auth/PinSignIn';
import { getDevicePinUsers, getSetupStatus } from '../https';

const Auth = () => {
  useEffect(() => {
    document.title = "RestOS | Auth";
  }, []);
  const [isLogin, setIsLogin] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const { data } = useQuery({ queryKey: ['setup'], queryFn: getSetupStatus });
  const needsOwner = data?.data?.data?.needsOwner;
  // A device where someone signed in with a password before opens on the PIN screen (a 401 here = not trusted).
  const pins = useQuery({ queryKey: ['devicePinUsers'], queryFn: getDevicePinUsers, retry: false, staleTime: 0 });
  const pinUsers = pins.data?.data?.data || [];

  if (pins.isLoading) return null;
  if (!usePassword && pins.isSuccess && pinUsers.length > 0) {
    return (
      <PinSignIn
        users={pinUsers}
        onUsePassword={(forgotten) => {
          if (forgotten) pins.refetch();
          setUsePassword(true);
        }}
      />
    );
  }

  return (
    <>
      {isLogin || !needsOwner ? (
        <LoginForm
          onToggleForm={needsOwner ? () => setIsLogin(false) : undefined}
          onUsePin={pins.isSuccess && pinUsers.length > 0 ? () => setUsePassword(false) : undefined}
        />
      ) : (
        <RegisterForm onToggleForm={() => setIsLogin(true)} />
      )}
    </>
  );
};

export default Auth;
