/**
 * @module dataset
 *
 * This module provides a key-value paired data interaction API.
 * With ergonomic design, serialization, and event supports.
 */
export interface Dataset {
	getItem<T extends unknown = unknown>(key: string): T | undefined;
	getItem<T>(key: string, defaultValue: T): T;
	getOrSetItem<T>(key: string, defaultValue: T): T;
	setItem<T>(key: string, value: T): void;
	derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T): void;
	removeItem(key: string): void;
	on<T = unknown>(
		key: string,
		callback: (oldValue: T | undefined, newValue: T | undefined) => void,
	): () => void;
	once<T = unknown>(
		key: string,
		callback: (oldValue: T | undefined, newValue: T | undefined) => void,
	): () => void;
	off<T = unknown>(
		key: string,
		callback: (oldValue: T | undefined, newValue: T | undefined) => void,
	): void;
	toJson(): string;
	toObject(): Record<string, unknown>;
	fromJson(json: string): void;
	fromObject(object: Record<string, unknown>): void;
}

export class DatasetChangeEvent<T> extends Event {
	public readonly key: string;
	public readonly oldValue: T | undefined;
	public readonly newValue: T | undefined;

	constructor(key: string, oldValue: T | undefined, newValue: T | undefined) {
		super(`dataset:${key}`);
		this.key = key;
		this.oldValue = oldValue;
		this.newValue = newValue;
	}
}

export function createDataset(): Dataset {
	const storage = new Map<string, unknown>();
	const eventTarget = new EventTarget();
	const listenerMap = new WeakMap<Function, (event: Event) => void>();

	return {
		getItem<T>(key: string, defaultValue?: T): T | undefined {
			const value = storage.get(key) as T;
			return value !== undefined ? value : defaultValue;
		},

		getOrSetItem<T>(key: string, defaultValue: T): T {
			if (storage.has(key)) {
				return storage.get(key) as T;
			} else {
				this.setItem(key, defaultValue);
				return defaultValue;
			}
		},

		setItem<T>(key: string, value: T) {
			const oldValue = storage.get(key) as T | undefined;
			if (oldValue !== value) {
				storage.set(key, value);
				const event = new DatasetChangeEvent<T>(key, oldValue, value);
				eventTarget.dispatchEvent(event);
			}
		},

		derivedSetItem<T>(key: string, func: (oldValue: T | undefined) => T) {
			const oldValue = this.getItem<T>(key);
			const newValue = func(oldValue);
			this.setItem(key, newValue);
		},

		removeItem(key: string) {
			const oldValue = storage.get(key);
			storage.delete(key);

			const event = new DatasetChangeEvent(key, oldValue, undefined);
			eventTarget.dispatchEvent(event);
		},

		on<T>(
			key: string,
			callback: (oldValue: T | undefined, newValue: T | undefined) => void,
		): () => void {
			const listener = (e: Event) => {
				const de = e as DatasetChangeEvent<T>;
				callback(de.oldValue, de.newValue);
			};
			listenerMap.set(callback, listener);
			eventTarget.addEventListener(`dataset:${key}`, listener);
			return () => {
				this.off(key, callback);
			};
		},

		once<T>(
			key: string,
			callback: (oldValue: T | undefined, newValue: T | undefined) => void,
		): () => void {
			const listener = (e: Event) => {
				const de = e as DatasetChangeEvent<T>;
				callback(de.oldValue, de.newValue);
				listenerMap.delete(callback);
			};
			listenerMap.set(callback, listener);
			eventTarget.addEventListener(`dataset:${key}`, listener, { once: true });
			return () => {
				this.off(key, callback);
			};
		},

		off<T>(
			key: string,
			callback: (oldValue: T | undefined, newValue: T | undefined) => void,
		) {
			const listener = listenerMap.get(callback);
			if (listener) {
				eventTarget.removeEventListener(`dataset:${key}`, listener);
				listenerMap.delete(callback);
			}
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
				existingKeys.delete(key);
				if (oldValue !== newValue) {
					this.setItem(key, newValue);
				}
			}
			for (const key of existingKeys) {
				this.removeItem(key);
			}
		},
	};
}
