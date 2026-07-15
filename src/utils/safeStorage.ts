const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access blocked, using memory fallback:", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage write blocked, using memory fallback:", e);
      memoryStorage[key] = value;
    }
  }
};
