export type EventResult = {
	triggerEvent: string;
	supply?: unknown;
};

export type EventHandler<T = unknown> = (
	argument: T,
) => Promise<EventResult | void> | EventResult | void;

type EventRegistry = Record<string, EventHandler[]>;

const busRegistry: Record<string, EventRegistry> = {};

async function fire(
	name: string,
	event: string,
	argument?: unknown,
): Promise<void> {
	const eventRegistry = busRegistry[name] ?? {};
	const handlers = eventRegistry[event] ?? [];

	const promises = handlers.map(async (handler) => {
		const result = await handler(argument);
		if (result) {
			await fire(name, result.triggerEvent, result.supply);
		}
	});

	await Promise.allSettled(promises);
}

interface EventBus {
	when(event: string): {
		do(handler: EventHandler): void;
	};
	trigger(event: string, argument?: unknown): Promise<void>;
}

export function bus(name: string): EventBus {
	if (!busRegistry[name]) {
		busRegistry[name] = {};
	}

	const eventRegistry = busRegistry[name];

	return {
		when(event: string) {
			return {
				do(handler: EventHandler) {
					if (!eventRegistry[event]) {
						eventRegistry[event] = [];
					}
					eventRegistry[event].push(handler);
				},
			};
		},

		async trigger(event: string, argument?: unknown): Promise<void> {
			await fire(name, event, argument);
		},
	};
}
