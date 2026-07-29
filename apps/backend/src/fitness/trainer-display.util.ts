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
  User?: { name: string | null } | null;
} | null;

export function isUnclaimedStudio(studio: {
  claimedAt?: Date | string | null;
  intendedOwnerEmail?: string | null;
}): boolean {
  return !studio.claimedAt && !!studio.intendedOwnerEmail?.trim();
}

/**
 * Prefer linked User.name over Trainer.name.
 * Invite flow seeds Trainer.name with the email local-part; the real name
 * lives on User after registration / profile update.
 */
export function resolveTrainerDisplayName(
  trainer: AssignedTrainerRef,
): string | null {
  if (!trainer) return null;
  const fromUser = trainer.User?.name?.trim();
  if (fromUser) return fromUser;
  const fromTrainer = trainer.name?.trim();
  if (fromTrainer) return fromTrainer;
  return null;
}

/** Display name for clients when session has no Trainer row or empty name. */
export function buildPublicTrainerPayload(
  trainer: AssignedTrainerRef,
  owner: StudioOwnerRef,
): PublicTrainerDto {
  const linkedName = resolveTrainerDisplayName(trainer);
  if (linkedName) {
    return { id: trainer!.id, name: linkedName };
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
 * Resolve trainerId for new sessions: explicit id, owner-linked Trainer, or
 * (for claimed studios only) create an owner placeholder Trainer.
 *
 * Unclaimed / ops studios must not auto-create trainers — that produced
 * "Henzo System Studios" rows that clutter staff data.
 */
export async function resolveTrainerIdForSession(
  prisma: PrismaClient,
  studioId: string,
  owner: { id: string; name: string | null; email: string },
  explicitTrainerId?: string | null,
  options?: { allowOwnerAutoCreate?: boolean },
): Promise<string | null> {
  const trimmed = explicitTrainerId?.trim();
  if (trimmed) {
    const found = await prisma.trainer.findFirst({
      where: { id: trimmed, studioId },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  // No explicit trainer — leave session unassigned for unclaimed studios.
  if (options?.allowOwnerAutoCreate === false) {
    return null;
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

/** Push User profile fields onto the linked Trainer row (invite placeholder fix). */
export async function syncLinkedTrainerFromUser(
  prisma: PrismaClient,
  userId: string,
  data: { name?: string | null; phone?: string | null },
): Promise<void> {
  const patch: { name?: string; phone?: string } = {};
  const name = data.name?.trim();
  const phone = data.phone?.trim();
  if (name) patch.name = name;
  if (phone) patch.phone = phone;
  if (Object.keys(patch).length === 0) return;

  await prisma.trainer.updateMany({
    where: { userId },
    data: patch,
  });
}
