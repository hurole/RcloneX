import { useState, useEffect } from 'react';

interface User {
  name: string;
  email?: string;
  avatar?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 从 localStorage 获取用户信息，或者设置默认用户
    const savedUser = localStorage.getItem('rclone-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // 如果解析失败，使用默认用户
        setUser({ name: 'Admin' });
      }
    } else {
      // 默认用户信息
      setUser({ name: 'Admin' });
    }
  }, []);

  const updateUser = (userData: Partial<User>) => {
    const updatedUser = { ...user, ...userData } as User;
    setUser(updatedUser);
    localStorage.setItem('rclone-user', JSON.stringify(updatedUser));
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem('rclone-user');
  };

  return {
    user,
    updateUser,
    clearUser,
    isLoggedIn: !!user,
  };
}
