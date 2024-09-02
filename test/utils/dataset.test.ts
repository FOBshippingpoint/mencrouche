import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDataset, type Dataset } from "../../src/utils/dataset.js";

describe("createDataset", () => {
  let dataset: Dataset;

  beforeEach(() => {
    dataset = createDataset();
  });

  it("should get and set items correctly", () => {
    dataset.setItem("key", "value");
    expect(dataset.getItem("key")).toBe("value");
  });

  it("should return undefined for non-existent items", () => {
    expect(dataset.getItem("nonExistentKey")).toBeUndefined();
  });

  it("should return default value for non-existent items when provided", () => {
    expect(dataset.getItem("nonExistentKey", "defaultValue")).toBe(
      "defaultValue",
    );
  });

  it("should handle different types of values", () => {
    dataset.setItem("numberKey", 42);
    dataset.setItem("objectKey", { foo: "bar" });
    dataset.setItem("arrayKey", [1, 2, 3]);

    expect(dataset.getItem("numberKey")).toBe(42);
    expect(dataset.getItem("objectKey")).toEqual({ foo: "bar" });
    expect(dataset.getItem("arrayKey")).toEqual([1, 2, 3]);
  });

  it("should get or set item correctly", () => {
    expect(dataset.getItem("newKey")).toBeUndefined();
    expect(dataset.getOrSetItem("newKey", "defaultValue")).toBe("defaultValue");
    expect(dataset.getOrSetItem("newKey", "anotherValue")).toBe("defaultValue");
  });

  it("should remove items correctly", () => {
    dataset.setItem("removeMe", "value");
    dataset.removeItem("removeMe");
    expect(dataset.getItem("removeMe")).toBeUndefined();
  });

  it("should update derived items correctly", () => {
    dataset.setItem("cuisine", "apple");
    dataset.derivedSetItem<string>("cuisine", (oldValue) => oldValue + " pie");
    expect(dataset.getItem("cuisine")).toBe("apple pie");
  });

  it("should trigger listeners on value change", () => {
    const listener = vi.fn();
    dataset.on("listenerKey", listener);

    dataset.setItem("listenerKey", "initialValue");
    expect(listener).toHaveBeenCalledWith(
      undefined, // oldValue
      "initialValue", // newValue
    );

    dataset.setItem("listenerKey", "newValue");
    expect(listener).toHaveBeenCalledWith(
      "initialValue", // oldValue
      "newValue", // newValue
    );
  });

  it("should not trigger listeners if value hasn't changed", () => {
    const listener = vi.fn();
    dataset.on("listenerKey", listener);

    dataset.setItem("listenerKey", "sameValue");
    dataset.setItem("listenerKey", "sameValue");

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should create independent instances", () => {
    const dataset1 = createDataset();
    const dataset2 = createDataset();

    dataset1.setItem("key", "value1");
    dataset2.setItem("key", "value2");

    expect(dataset1.getItem("key")).toBe("value1");
    expect(dataset2.getItem("key")).toBe("value2");
  });

  describe("Serialize / Deserialize", () => {
    it("should convert dataset to JSON correctly", () => {
      dataset.setItem("key1", "value1");
      dataset.setItem("key2", 42);
      dataset.setItem("key3", { nested: "object" });

      const json = dataset.toJson();
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({
        key1: "value1",
        key2: 42,
        key3: { nested: "object" },
      });
    });

    it("should load dataset from JSON correctly", () => {
      const json = JSON.stringify({
        key1: "value1",
        key2: 42,
        key3: { nested: "object" },
      });

      dataset.fromJson(json);

      expect(dataset.getItem("key1")).toBe("value1");
      expect(dataset.getItem("key2")).toBe(42);
      expect(dataset.getItem("key3")).toEqual({ nested: "object" });
    });

    it("should load dataset from object correctly", () => {
      const obj = {
        key1: "value1",
        key2: 42,
        key3: { nested: "object" },
      };

      dataset.fromObject(obj);

      expect(dataset.getItem("key1")).toBe("value1");
      expect(dataset.getItem("key2")).toBe(42);
      expect(dataset.getItem("key3")).toEqual({ nested: "object" });
    });

    it("should overwrite existing values when loading from JSON", () => {
      dataset.setItem("key1", "oldValue");
      dataset.setItem("key2", 100);

      const json = JSON.stringify({
        key1: "newValue",
      });

      dataset.fromJson(json);

      expect(dataset.getItem("key1")).toBe("newValue");
      expect(dataset.getItem("key2")).toBe(100);
    });

    it("should overwrite existing values when loading from object", () => {
      dataset.setItem("key1", "oldValue");
      dataset.setItem("key2", 100);

      const obj = {
        key1: "newValue",
      };

      dataset.fromObject(obj);

      expect(dataset.getItem("key1")).toBe("newValue");
      expect(dataset.getItem("key2")).toBe(100);
    });

    it("should handle empty JSON string", () => {
      expect(() => dataset.fromJson("{}")).not.toThrow();
      expect(dataset.toJson()).toBe("{}");
    });

    it("should handle empty object", () => {
      expect(() => dataset.fromObject({})).not.toThrow();
      expect(dataset.toJson()).toBe("{}");
    });

    it("should maintain data types when converting to and from JSON", () => {
      const originalData = {
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { a: 1, b: 2 },
      };

      dataset.fromObject(originalData);
      const json = dataset.toJson();
      const newDataset = createDataset();
      newDataset.fromJson(json);

      for (const [key, value] of Object.entries(originalData)) {
        expect(newDataset.getItem(key)).toEqual(value);
      }
    });
  });
});
