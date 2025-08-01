const bowser = chrome ?? browser;

for (const el of document.querySelectorAll("[data-i18n]")) {
	el.textContent = bowser.i18n.getMessage(el.dataset.i18n);
}

const isOverrideNewTabUrlCheckbox = document.querySelector(
	'[name="isOverrideNewTabUrl"]',
);

bowser.storage.sync
	.get("isOverrideNewTabUrl")
	.then(
		(res) => (isOverrideNewTabUrlCheckbox.checked = res.isOverrideNewTabUrl),
	);
isOverrideNewTabUrlCheckbox.addEventListener("input", (e) =>
	bowser.storage.sync.set({ isOverrideNewTabUrl: e.target.checked }),
);
