"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var dataset_js_1 = require("../../src/utils/dataset.js");
(0, vitest_1.describe)("createDataset", function () {
	var dataset;
	(0, vitest_1.beforeEach)(function () {
		dataset = (0, dataset_js_1.createDataset)();
	});
	(0, vitest_1.it)("should get and set items correctly", function () {
		dataset.setItem("key", "value");
		(0, vitest_1.expect)(dataset.getItem("key")).toBe("value");
	});
	(0, vitest_1.it)(
		"should return undefined for non-existent items",
		function () {
			(0, vitest_1.expect)(dataset.getItem("nonExistentKey")).toBeUndefined();
		},
	);
	(0, vitest_1.it)(
		"should return default value for non-existent items when provided",
		function () {
			(0, vitest_1.expect)(
				dataset.getItem("nonExistentKey", "defaultValue"),
			).toBe("defaultValue");
		},
	);
	(0, vitest_1.it)("should handle different types of values", function () {
		dataset.setItem("numberKey", 42);
		dataset.setItem("objectKey", { foo: "bar" });
		dataset.setItem("arrayKey", [1, 2, 3]);
		(0, vitest_1.expect)(dataset.getItem("numberKey")).toBe(42);
		(0, vitest_1.expect)(dataset.getItem("objectKey")).toEqual({ foo: "bar" });
		(0, vitest_1.expect)(dataset.getItem("arrayKey")).toEqual([1, 2, 3]);
	});
	(0, vitest_1.it)("should get or set item correctly", function () {
		(0, vitest_1.expect)(dataset.getItem("newKey")).toBeUndefined();
		(0, vitest_1.expect)(dataset.getOrSetItem("newKey", "defaultValue")).toBe(
			"defaultValue",
		);
		(0, vitest_1.expect)(dataset.getOrSetItem("newKey", "anotherValue")).toBe(
			"defaultValue",
		);
	});
	(0, vitest_1.it)("should remove items correctly", function () {
		dataset.setItem("removeMe", "value");
		dataset.removeItem("removeMe");
		(0, vitest_1.expect)(dataset.getItem("removeMe")).toBeUndefined();
	});
	(0, vitest_1.it)("should update derived items correctly", function () {
		dataset.setItem("cuisine", "apple");
		dataset.derivedSetItem("cuisine", function (oldValue) {
			return oldValue + " pie";
		});
		(0, vitest_1.expect)(dataset.getItem("cuisine")).toBe("apple pie");
	});
	(0, vitest_1.it)("should trigger listeners on value change", function () {
		var listener = vitest_1.vi.fn();
		dataset.on("listenerKey", listener);
		dataset.setItem("listenerKey", "initialValue");
		(0, vitest_1.expect)(listener).toHaveBeenCalledWith(
			undefined, // oldValue
			"initialValue",
		);
		dataset.setItem("listenerKey", "newValue");
		(0, vitest_1.expect)(listener).toHaveBeenCalledWith(
			"initialValue", // oldValue
			"newValue",
		);
	});
	(0, vitest_1.it)(
		"should not trigger listeners if value hasn't changed",
		function () {
			var listener = vitest_1.vi.fn();
			dataset.on("listenerKey", listener);
			dataset.setItem("listenerKey", "sameValue");
			dataset.setItem("listenerKey", "sameValue");
			(0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
		},
	);
	(0, vitest_1.it)(
		"should stop calling listener after it's removed",
		function () {
			var listener = vitest_1.vi.fn();
			dataset.on("listenerKey", listener);
			dataset.setItem("listenerKey", "firstValue");
			(0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
			// Remove the listener
			dataset.off("listenerKey", listener);
			dataset.setItem("listenerKey", "secondValue");
			(0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1); // Still just one call
		},
	);
	(0, vitest_1.it)(
		"should support using unsubscribe function returned by on()",
		function () {
			var listener = vitest_1.vi.fn();
			var unsubscribe = dataset.on("listenerKey", listener);
			dataset.setItem("listenerKey", "firstValue");
			(0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1);
			// Unsubscribe using the returned function
			unsubscribe();
			dataset.setItem("listenerKey", "secondValue");
			(0, vitest_1.expect)(listener).toHaveBeenCalledTimes(1); // Still just one call
		},
	);
	(0, vitest_1.it)("should create independent instances", function () {
		var dataset1 = (0, dataset_js_1.createDataset)();
		var dataset2 = (0, dataset_js_1.createDataset)();
		dataset1.setItem("key", "value1");
		dataset2.setItem("key", "value2");
		(0, vitest_1.expect)(dataset1.getItem("key")).toBe("value1");
		(0, vitest_1.expect)(dataset2.getItem("key")).toBe("value2");
	});
	(0, vitest_1.it)(
		"should support multiple listeners for the same key",
		function () {
			var listener1 = vitest_1.vi.fn();
			var listener2 = vitest_1.vi.fn();
			dataset.on("sharedKey", listener1);
			dataset.on("sharedKey", listener2);
			dataset.setItem("sharedKey", "value");
			(0, vitest_1.expect)(listener1).toHaveBeenCalledWith(undefined, "value");
			(0, vitest_1.expect)(listener2).toHaveBeenCalledWith(undefined, "value");
		},
	);
	(0, vitest_1.it)("should only remove the specified listener", function () {
		var listener1 = vitest_1.vi.fn();
		var listener2 = vitest_1.vi.fn();
		dataset.on("sharedKey", listener1);
		dataset.on("sharedKey", listener2);
		dataset.off("sharedKey", listener1);
		dataset.setItem("sharedKey", "value");
		(0, vitest_1.expect)(listener1).not.toHaveBeenCalled();
		(0, vitest_1.expect)(listener2).toHaveBeenCalledWith(undefined, "value");
	});
	(0, vitest_1.describe)("Serialize / Deserialize", function () {
		(0, vitest_1.it)("should convert dataset to JSON correctly", function () {
			dataset.setItem("key1", "value1");
			dataset.setItem("key2", 42);
			dataset.setItem("key3", { nested: "object" });
			var json = dataset.toJson();
			var parsed = JSON.parse(json);
			(0, vitest_1.expect)(parsed).toEqual({
				key1: "value1",
				key2: 42,
				key3: { nested: "object" },
			});
		});
		(0, vitest_1.it)("should load dataset from JSON correctly", function () {
			var json = JSON.stringify({
				key1: "value1",
				key2: 42,
				key3: { nested: "object" },
			});
			dataset.fromJson(json);
			(0, vitest_1.expect)(dataset.getItem("key1")).toBe("value1");
			(0, vitest_1.expect)(dataset.getItem("key2")).toBe(42);
			(0, vitest_1.expect)(dataset.getItem("key3")).toEqual({
				nested: "object",
			});
		});
		(0, vitest_1.it)("should load dataset from object correctly", function () {
			var obj = {
				key1: "value1",
				key2: 42,
				key3: { nested: "object" },
			};
			dataset.fromObject(obj);
			(0, vitest_1.expect)(dataset.getItem("key1")).toBe("value1");
			(0, vitest_1.expect)(dataset.getItem("key2")).toBe(42);
			(0, vitest_1.expect)(dataset.getItem("key3")).toEqual({
				nested: "object",
			});
		});
		(0, vitest_1.it)(
			"should overwrite existing values when loading from JSON",
			function () {
				dataset.setItem("key1", "oldValue");
				dataset.setItem("key2", 100);
				var json = JSON.stringify({
					key1: "newValue",
				});
				dataset.fromJson(json);
				(0, vitest_1.expect)(dataset.getItem("key1")).toBe("newValue");
				(0, vitest_1.expect)(dataset.getItem("key2")).toBeUndefined();
			},
		);
		(0, vitest_1.it)(
			"should overwrite existing values when loading from object",
			function () {
				dataset.setItem("key1", "oldValue");
				dataset.setItem("key2", 100);
				var obj = {
					key1: "newValue",
				};
				dataset.fromObject(obj);
				(0, vitest_1.expect)(dataset.getItem("key1")).toBe("newValue");
				(0, vitest_1.expect)(dataset.getItem("key2")).toBeUndefined();
			},
		);
		(0, vitest_1.it)("should handle empty JSON string", function () {
			(0, vitest_1.expect)(function () {
				return dataset.fromJson("{}");
			}).not.toThrow();
			(0, vitest_1.expect)(dataset.toJson()).toBe("{}");
		});
		(0, vitest_1.it)("should handle empty object", function () {
			(0, vitest_1.expect)(function () {
				return dataset.fromObject({});
			}).not.toThrow();
			(0, vitest_1.expect)(dataset.toJson()).toBe("{}");
		});
		(0, vitest_1.it)(
			"should maintain data types when converting to and from JSON",
			function () {
				var originalData = {
					string: "hello",
					number: 42,
					boolean: true,
					null: null,
					array: [1, 2, 3],
					object: { a: 1, b: 2 },
				};
				dataset.fromObject(originalData);
				var json = dataset.toJson();
				var newDataset = (0, dataset_js_1.createDataset)();
				newDataset.fromJson(json);
				for (
					var _i = 0, _a = Object.entries(originalData);
					_i < _a.length;
					_i++
				) {
					var _b = _a[_i],
						key = _b[0],
						value = _b[1];
					(0, vitest_1.expect)(newDataset.getItem(key)).toEqual(value);
				}
			},
		);
	});
});
