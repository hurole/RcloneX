export const setLocal = (rc: string, user: string, pass: string) => {
  const token = btoa(`${user}:${pass}`);
  localStorage.setItem('rclone-rc', rc);
  localStorage.setItem('rclone-token', token);
};
