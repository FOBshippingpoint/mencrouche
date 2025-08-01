(globalThis.chrome ?? globalThis.browser)?.storage.sync
	.get("isOverrideNewTabUrl")
	.then(
		(res) =>
			res.isOverrideNewTabUrl && location.replace("https://mencrouche.com"),
	);
