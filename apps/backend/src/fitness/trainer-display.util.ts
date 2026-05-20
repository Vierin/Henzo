import type { PrismaClient } from '@prisma/client';

export type PublicTrainerDto = { id: string; name: string } | null;

export type StudioOwnerRef = {
  id: string;
  name: string | null;
  email: string;
} | null;

export type AssignedTrainerRef = {
  id: string;
  name: string | null;
} | null;

/** Display name for clients when session has no Trainer row or empty name. */
export function buildPublicTrainerPayload(
  trainer: AssignedTrainerRef,
  owner: StudioOwnerRef,
): PublicTrainerDto {
  if (trainer?.name && String(trainer.name).trim().length > 0) {
    return { id: trainer.id, name: String(trainer.name).trim() };
  }
  if (!owner) return null;

  const display =
    (owner.name && String(owner.name).trim()) ||
    (owner.email && String(owner.email).trim()) ||
    '';
  if (!display) return null;

  return {
    id: trainer?.id ?? owner.id,
    name: display,
  };
}

/**
 * Resolve trainerId for new sessions: explicit id, owner-linked Trainer, or create one.
 */
export async function resolveTrainerIdForSession(
  prisma: PrismaClient,
  studioId: string,
  owner: { id: string; name: string | null; email: string },
  explicitTrainerId?: string | null,
): Promise<string | null> {
  const trimmed = explicitTrainerId?.trim();
  if (trimmed) {
    const found = await prisma.trainer.findFirst({
      where: { id: trimmed, studioId },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  const email = owner.email.trim();
  if (email) {
    const byEmail = await prisma.trainer.findFirst({
      where: {
        studioId,
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  const ownerName = owner.name?.trim();
  if (ownerName) {
    const byName = await prisma.trainer.findFirst({
      where: { studioId, name: ownerName },
      select: { id: true },
    });
    if (byName) return byName.id;
  }

  const nameForTrainer =
    ownerName || (email.includes('@') ? email.split('@')[0] : '') || 'Owner';

  const created = await prisma.trainer.create({
    data: {
      studioId,
      name: nameForTrainer,
      ...(email ? { email } : {}),
      accessLevel: 'ADMIN',
    },
    select: { id: true },
  });
  return created.id;
}
