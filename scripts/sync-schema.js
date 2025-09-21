const fs = require('fs');
const path = require('path');

console.log('Syncing Prisma schema from packages/db...');

try {
	// Paths
	const sourceSchema = path.join(
		__dirname,
		'../../../packages/db/prisma/schema.prisma'
	);
	const targetSchema = path.join(__dirname, '../prisma/schema.prisma');

	// Check if source schema exists
	if (!fs.existsSync(sourceSchema)) {
		console.error('❌ Source schema not found:', sourceSchema);
		process.exit(1);
	}

	// Read source schema
	const sourceContent = fs.readFileSync(sourceSchema, 'utf8');

	// Write to target schema
	fs.writeFileSync(targetSchema, sourceContent);

	console.log('✅ Schema synced successfully!');
	console.log('📁 Source:', sourceSchema);
	console.log('📁 Target:', targetSchema);
} catch (error) {
	console.error('❌ Error syncing schema:', error.message);
	process.exit(1);
}
