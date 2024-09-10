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
  toObject(): Record<string, unknown>;
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
      const callbacks = listeners.get(key);
      if (callbacks) {
        callbacks.forEach((callback) => callback(storage.get(key), undefined));
      }
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
      return JSON.stringify(this.toObject());
    },

    toObject() {
      return Object.fromEntries(storage.entries());
    },

    fromJson(json: string) {
      const obj = JSON.parse(json);
      this.fromObject(obj);
    },

    fromObject(obj: Record<string, unknown>) {
      const existingKeys = new Set(storage.keys());

      for (const [key, newValue] of Object.entries(obj)) {
        const oldValue = storage.get(key);
        existingKeys.delete(key); // This key is present in both the current state and the new state.

        if (oldValue !== newValue) {
          this.setItem(key, newValue);
        }
      }

      // Any remaining keys in existingKeys are in the current state but not in the new JSON, so they should be removed.
      for (const key of existingKeys) {
        this.removeItem(key);
      }
    },
  };
}
