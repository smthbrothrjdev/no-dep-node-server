import { performance } from 'node:perf_hooks'

export type MetricsOpts = {
	sampleMs?: number;
	thresholdMs?: number;
};

export function enableMetrics({ sampleMs = 1000, thresholdMs = 50 }: MetricsOpts = {}) {
	let reqCount = 0;
	const incr = () => { reqCount++; };

	const tickTimer = setInterval(() => {
		const seen = reqCount;
		reqCount = 0;
		console.log(`req/s ~ ${seen}`);

	}, 1000);

	const lagTimer = setInterval(() => {
		const t0 = performance.now();
		setImmediate(() => {
			const lag = performance.now() - t0;
			if (lag > thresholdMs) {
				console.log(`event-loop lag: ${lag.toFixed(1)} ms`);
			}
		});
	}, sampleMs);

	const disable = () => {
		clearInterval(tickTimer);
		clearInterval(lagTimer);
	};

	return { incr, disable };
}
