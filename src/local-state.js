const prefix = 'pihub:borrower:demo:v1:';

export const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(prefix + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeLocal = (key, value) => {
  localStorage.setItem(prefix + key, JSON.stringify(value));
  return value;
};

export const resetLocal = key => localStorage.removeItem(prefix + key);

export const resetLocalWorkspace = () => {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  keys.forEach(key => localStorage.removeItem(key));
};
