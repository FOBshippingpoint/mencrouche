"use strict";
var __extends =
	(this && this.__extends) ||
	(function () {
		var extendStatics = function (d, b) {
			extendStatics =
				Object.setPrototypeOf ||
				({ __proto__: [] } instanceof Array &&
					function (d, b) {
						d.__proto__ = b;
					}) ||
				function (d, b) {
					for (var p in b)
						if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
				};
			return extendStatics(d, b);
		};
		return function (d, b) {
			if (typeof b !== "function" && b !== null)
				throw new TypeError(
					"Class extends value " + String(b) + " is not a constructor or null",
				);
			extendStatics(d, b);
			function __() {
				this.constructor = d;
			}
			d.prototype =
				b === null
					? Object.create(b)
					: ((__.prototype = b.prototype), new __());
		};
	})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetChangeEvent = void 0;
exports.createDataset = createDataset;
var DatasetChangeEvent = /** @class */ (function (_super) {
	__extends(DatasetChangeEvent, _super);
	function DatasetChangeEvent(key, oldValue, newValue) {
		var _this = _super.call(this, "dataset:".concat(key)) || this;
		_this.key = key;
		_this.oldValue = oldValue;
		_this.newValue = newValue;
		return _this;
	}
	return DatasetChangeEvent;
})(Event);
exports.DatasetChangeEvent = DatasetChangeEvent;
function createDataset() {
	var storage = new Map();
	var eventTarget = new EventTarget();
	var listenerMap = new WeakMap();
	return {
		getItem: function (key, defaultValue) {
			var value = storage.get(key);
			return value !== undefined ? value : defaultValue;
		},
		getOrSetItem: function (key, defaultValue) {
			if (storage.has(key)) {
				return storage.get(key);
			} else {
				this.setItem(key, defaultValue);
				return defaultValue;
			}
		},
		setItem: function (key, value) {
			var oldValue = storage.get(key);
			if (oldValue !== value) {
				storage.set(key, value);
				var event_1 = new DatasetChangeEvent(key, oldValue, value);
				eventTarget.dispatchEvent(event_1);
			}
		},
		derivedSetItem: function (key, func) {
			var oldValue = this.getItem(key);
			var newValue = func(oldValue);
			this.setItem(key, newValue);
		},
		removeItem: function (key) {
			var oldValue = storage.get(key);
			storage.delete(key);
			var event = new DatasetChangeEvent(key, oldValue, undefined);
			eventTarget.dispatchEvent(event);
		},
		on: function (key, callback) {
			var _this = this;
			var listener = function (e) {
				var de = e;
				callback(de.oldValue, de.newValue);
			};
			listenerMap.set(callback, listener);
			eventTarget.addEventListener("dataset:".concat(key), listener);
			return function () {
				_this.off(key, callback);
			};
		},
		off: function (key, callback) {
			var listener = listenerMap.get(callback);
			if (listener) {
				eventTarget.removeEventListener("dataset:".concat(key), listener);
				listenerMap.delete(callback);
			}
		},
		toJson: function () {
			return JSON.stringify(this.toObject());
		},
		toObject: function () {
			return Object.fromEntries(storage.entries());
		},
		fromJson: function (json) {
			var obj = JSON.parse(json);
			this.fromObject(obj);
		},
		fromObject: function (obj) {
			var existingKeys = new Set(storage.keys());
			for (var _i = 0, _a = Object.entries(obj); _i < _a.length; _i++) {
				var _b = _a[_i],
					key = _b[0],
					newValue = _b[1];
				var oldValue = storage.get(key);
				existingKeys.delete(key);
				if (oldValue !== newValue) {
					this.setItem(key, newValue);
				}
			}
			for (
				var _c = 0, existingKeys_1 = existingKeys;
				_c < existingKeys_1.length;
				_c++
			) {
				var key = existingKeys_1[_c];
				this.removeItem(key);
			}
		},
	};
}
