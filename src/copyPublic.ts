import { promises as fs } from 'fs';
import { join, dirname } from 'path';

async function copyDir(src: string, dest: string) {
	await fs.mkdir(dest, { recursive: true });
	for (const entry of await fs.readdir(src, { withFileTypes: true })) {
		const srcPath = join(src, entry.name);
		const destPath = join(dest, entry.name);
		if (entry.isDirectory()) {
			await copyDir(srcPath, destPath);
		} else {
			await fs.copyFile(srcPath, destPath);
		}
	}
}

async function main() {
	const projectRoot = dirname(__dirname);
	const srcDir = join(projectRoot, 'src', 'public');
	const outDir = join(projectRoot, 'dist', 'public');
	try {
		await copyDir(srcDir, outDir);
		console.log('✅ Public folder copied to dist/public');
	} catch (err) {
		console.error('❌ Failed to copy public folder:', err);
		process.exit(1);
	}
}

main();

