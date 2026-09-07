const memoryState = new Map();

export const readLocal = (key, fallback) => (
  memoryState.has(key) ? memoryState.get(key) : fallback
);

export const writeLocal = (key, value) => {
  memoryState.set(key, value);
  return value;
};

export const resetLocal = key => memoryState.delete(key);

export const resetLocalWorkspace = () => memoryState.clear();
