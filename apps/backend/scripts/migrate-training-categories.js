/**
 * One-off: backfill Training.trainingCategoryId when categoryId is a numeric string
 * matching an existing TrainingCategory row. Prints verification counts.
 *
 * Dry-run by default. Set APPLY=1 to write updates.
 *
 * Usage (from apps/backend): node scripts/migrate-training-categories.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const apply = process.env.APPLY === '1';

  const total = await prisma.training.count();
  const withCat = await prisma.training.count({
    where: { trainingCategoryId: { not: null } },
  });

  const candidates = await prisma.training.findMany({
    where: {
      trainingCategoryId: null,
      categoryId: { not: null },
    },
    select: { id: true, categoryId: true, name: true },
  });

  console.log('--- Training category migration report ---');
  console.log(JSON.stringify({ total, withTrainingCategoryId: withCat, candidates: candidates.length }, null, 2));

  let matched = 0;
  let updated = 0;
  const unmatched = [];

  for (const row of candidates) {
    const raw = row.categoryId;
    const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(n) || String(n) !== String(raw).trim()) {
      unmatched.push({ id: row.id, categoryId: raw, reason: 'not_numeric_id' });
      continue;
    }
    const tc = await prisma.trainingCategory.findUnique({
      where: { id: n },
      select: { id: true },
    });
    if (!tc) {
      unmatched.push({ id: row.id, categoryId: raw, reason: 'no_training_category' });
      continue;
    }
    matched += 1;
    if (apply) {
      await prisma.training.update({
        where: { id: row.id },
        data: { trainingCategoryId: n },
      });
      updated += 1;
    }
  }

  console.log(
    apply
      ? `Applied updates: ${updated} (matched ${matched})`
      : `Dry-run: would update ${matched} rows. Set APPLY=1 to execute.`,
  );
  if (unmatched.length) {
    console.log(`Unmatched samples (max 20):`, unmatched.slice(0, 20));
  }

  const after = await prisma.training.count({
    where: { trainingCategoryId: { not: null } },
  });
  console.log(`trainings with trainingCategoryId after: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
