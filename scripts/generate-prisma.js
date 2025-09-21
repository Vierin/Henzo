const { execSync } = require('child_process');
const path = require('path');

console.log('Syncing and generating Prisma client...');

try {
	// First, sync the schema from packages/db
	execSync('node scripts/sync-schema.js', {
		cwd: path.join(__dirname, '..'),
		stdio: 'inherit',
	});

	// Then generate Prisma client
	execSync('npx prisma generate', {
		cwd: path.join(__dirname, '..'),
		stdio: 'inherit',
	});

	console.log('✅ Prisma client generated successfully!');
} catch (error) {
	console.error('❌ Error generating Prisma client:', error.message);
	process.exit(1);
}
