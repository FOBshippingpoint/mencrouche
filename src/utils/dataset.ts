export interface Dataset {
  getItem<T>(key: string, defaultValue?: T): T | undefined;
  getOrSetItem<T>(key: string, defaultValue: T): T;
  setItem(key: string, value: unknown): void;
  derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T): void;
  removeItem(key: string): void;
  on<T>(
    key: string,
    callback: (oldValue: T | undefined, newValue: T | undefined) => void,
  ): void;
  toJson(): string;
  fromJson(json: string): void;
  fromObject(object: Record<string, unknown>): void;
}

export function createDataset(): Dataset {
  const storage = new Map<string, unknown>();
  const listeners = new Map<
    string,
    ((oldValue: unknown, newValue: unknown) => void)[]
  >();

  return {
    getItem<T>(key: string, defaultValue?: T): T | undefined {
      const value = storage.get(key);
      return (value !== undefined ? value : defaultValue) as T | undefined;
    },

    getOrSetItem<T>(key: string, defaultValue: T): T {
      if (storage.has(key)) {
        return storage.get(key) as T;
      } else {
        this.setItem(key, defaultValue);
        return defaultValue;
      }
    },

    setItem(key: string, value: unknown) {
      const oldValue = storage.get(key);
      if (oldValue !== value) {
        storage.set(key, value);
        const callbacks = listeners.get(key);
        if (callbacks) {
          callbacks.forEach((callback) => callback(oldValue, value));
        }
      }
    },

    derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T) {
      const oldValue = this.getItem<T>(key);
      const newValue = func(oldValue);
      this.setItem(key, newValue);
    },

    removeItem(key: string) {
      storage.delete(key);
    },

    on<T>(
      key: string,
      callback: (oldValue: T | undefined, newValue: T | undefined) => void,
    ) {
      if (!listeners.has(key)) {
        listeners.set(key, []);
      }
      listeners
        .get(key)!
        .push(callback as (oldValue: unknown, newValue: unknown) => void);
    },

    toJson() {
      return JSON.stringify(Object.fromEntries(storage.entries()));
    },

    fromJson(json: string) {
      const obj = JSON.parse(json);
      storage.clear();
      for (const [key, value] of Object.entries(obj)) {
        this.setItem(key, value);
      }
    },

    fromObject(object: Record<string, unknown>) {
      for (const [key, value] of Object.entries(object)) {
        this.setItem(key, value);
      }
    },
  };
}
