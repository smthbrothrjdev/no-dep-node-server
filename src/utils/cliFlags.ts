export type CliFlags = {
	metrics: boolean;
	metricsThreshold: number;
	metricsSample: number;
}

export function parseFlags(argv = process.argv.slice(2)): CliFlags {
	const flags: CliFlags = {
		metrics: argv.includes('--metrics'),
		metricsThreshold: numFromArg(argv, '--metrics-threshold', 50),
		metricsSample: numFromArg(argv, '--metrics-sample', 1000),
	};
	return flags;
}

function numFromArg(argv: string[], name: string, def: number) {
	const p = argv.find(a => a.startsWith(name + '='));
	if (!p) return def
	const v = Number(p.split('=')[1]);
	return Number.isFinite(v) ? v : def;
}
