import { describe, it, expect, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { bakeBean, soakBean } from "./bean";

const window = new Window({ url: "https://localhost:8080" });
const document = window.document;

describe("bakeBean", () => {
	it("should serialize data-* attributes into the dataset", () => {
		const element = document.createElement("div");
		element.dataset.userId = "123";
		element.dataset.role = "admin";

		const bean = bakeBean(element as any);
		expect(bean.dataset).toEqual({ userId: "123", role: "admin" });
	});

	it("should include specified extra attributes", () => {
		const element = document.createElement("a");
		element.setAttribute("href", "/profile");
		element.setAttribute("target", "_blank");

		const bean = bakeBean(element as any, "href", "target");
		expect(bean.href).toBe("/profile");
		expect(bean.target).toBe("_blank");
	});

	it("should include both dataset and extra attributes", () => {
		const element = document.createElement("button");
		element.dataset.action = "submit";
		element.setAttribute("type", "button");
		element.setAttribute("disabled", "true");

		const bean = bakeBean(element as any, "type", "disabled");
		expect(bean.dataset).toEqual({ action: "submit" });
		expect(bean.type).toBe("button");
		expect(bean.disabled).toBe("true");
	});

	it("should handle an element with no attributes", () => {
		const element = document.createElement("span");
		const bean = bakeBean(element as any);
		expect(bean.dataset).toEqual({});
	});

	it("should handle extra attributes that do not exist", () => {
		const element = document.createElement("p");
		const bean = bakeBean(element as any, "nonExistent");
		expect(bean.nonExistent).toBeUndefined();
		expect(bean.dataset).toEqual({});
	});
});

describe("soakBean", () => {
	let element: any;
	beforeEach(() => {
		element = document.createElement("div");
	});

	it("should apply dataset attributes to the element", () => {
		const bean = { dataset: { id: "456", status: "pending" } };
		soakBean(element, bean);
		expect(element.dataset.id).toBe("456");
		expect(element.dataset.status).toBe("pending");
	});

	it("should apply regular attributes to the element", () => {
		const bean = { id: "container", class: "main", title: "My Container" };
		soakBean(element, bean);
		expect(element.id).toBe("container");
		expect(element.className).toBe("main");
		expect(element.getAttribute("title")).toBe("My Container");
	});

	it("should handle boolean attributes", () => {
		const bean = { disabled: true, checked: false };
		soakBean(element, bean);
		expect(element.hasAttribute("disabled")).toBe(true);
		expect(element.hasAttribute("checked")).toBe(false);
	});

	it("should handle null and undefined values for attributes", () => {
		const bean = { id: "test", class: null, dataId: undefined };
		soakBean(element, bean);
		expect(element.id).toBe("test");
		expect(element.hasAttribute("class")).toBe(false);
		expect(element.dataset.dataId).toBeUndefined();
	});

	it("should handle a bean with only dataset attributes", () => {
		const bean = { dataset: { key: "value" } };
		soakBean(element, bean);
		expect(element.dataset.key).toBe("value");
	});

	it("should handle a bean with only regular attributes", () => {
		const bean = { role: "button", "aria-label": "Close" };
		soakBean(element, bean);
		expect(element.getAttribute("role")).toBe("button");
		expect(element.getAttribute("aria-label")).toBe("Close");
	});

	it("should handle a bean with no attributes", () => {
		const bean = {};
		soakBean(element, bean);
		expect(element.attributes.length).toBe(0);
		expect(Object.keys(element.dataset).length).toBe(0);
	});

	it("should correctly set className", () => {
		const bean = { className: "active primary" };
		soakBean(element, bean);
		expect(element.className).toBe("active primary");
	});

	it("should overwrite existing attributes", () => {
		element.id = "oldId";
		element.className = "oldClass";
		element.dataset.oldData = "oldValue";
		element.setAttribute("title", "Old Title");

		const bean = {
			id: "newId",
			class: "newClass",
			dataset: { newData: "newValue" },
			title: "New Title",
		};
		soakBean(element, bean);
		expect(element.id).toBe("newId");
		expect(element.className).toBe("newClass");
		expect(element.dataset.newData).toBe("newValue");
		expect(element.dataset.oldData).toBeUndefined();
		expect(element.getAttribute("title")).toBe("New Title");
	});
});
