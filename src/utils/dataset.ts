function cast(value: string): unknown {
  if (value === "undefined") return undefined;
  if (!isNaN(Number(value))) return Number(value);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

interface Dataset {
  getItem<T>(key: string, defaultValue?: T): T | undefined;
  getOrSetItem<T>(key: string, defaultValue: T): T;
  setItem(key: string, value: unknown): void;
  derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T): void;
  removeItem(key: string): void;
  on<T>(
    key: string,
    callback: (oldValue: T | undefined, newValue: T | undefined) => void,
  ): void;
}

let singleton: Dataset | undefined;

export function initDataset(container: Element) {
  if (!singleton) {
    singleton = {
      getItem<T>(key: string, defaultValue?: T): T | undefined {
        const el = document.getElementById(key);
        if (el instanceof HTMLDataElement) {
          return (cast(el.value) as T) ?? defaultValue;
        } else {
          return defaultValue;
        }
      },
      getOrSetItem<T>(key: string, defaultValue: T): T {
        const el = document.getElementById(key);
        if (el) {
          return this.getItem(key) as T;
        } else {
          this.setItem(key, defaultValue);
          return defaultValue;
        }
      },
      setItem(key: string, value: unknown) {
        let _el = document.getElementById(key);
        if (!(_el instanceof HTMLDataElement)) {
          _el = document.createElement("data");
          _el.id = key;
          container.append(_el);
        }

        const el = _el as HTMLDataElement;

        let newValue: string;
        if (typeof value === "string") {
          newValue = value;
        } else {
          newValue = JSON.stringify(value);
        }
        if (el.value !== newValue) {
          el.value = newValue;
          el.dispatchEvent(
            new CustomEvent("valuechange", {
              detail: { oldValue: el.value, newValue },
              bubbles: true,
              cancelable: true,
            }),
          );
        }
      },
      derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T) {
        this.setItem(key, func(this.getItem<T>(key)));
      },
      removeItem(key: string) {
        document.getElementById(key)?.remove();
      },
      on<T>(
        key: string,
        callback: (oldValue: T | undefined, newValue: T | undefined) => void,
      ) {
        const el = document.getElementById(key);
        if (el) {
          el.addEventListener("valuechange", (e) => {
            callback(cast(e.detail.oldValue), cast(e.detail.newValue));
          });
        } else {
          throw new Error(
            `The data '${key}' is not initialized. Have you called 'dataset.setItem' yet?`,
          );
        }
      },
    };
  }
  return singleton;
}
