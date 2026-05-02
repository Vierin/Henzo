import { createHash } from 'crypto';

type NullableNumber = number | null | undefined;

type ComputeTrainingDisplayColorInput = {
  trainingId?: string | null;
  trainingName?: string | null;
  trainingCategoryId?: NullableNumber;
  mainCategoryId?: NullableNumber;
  existingColor?: string | null;
};

const FAMILY_PALETTES = [
  ['#0EA5E9', '#38BDF8', '#0284C7', '#7DD3FC'],
  ['#14B8A6', '#2DD4BF', '#0F766E', '#5EEAD4'],
  ['#22C55E', '#4ADE80', '#15803D', '#86EFAC'],
  ['#84CC16', '#A3E635', '#4D7C0F', '#BEF264'],
  ['#F59E0B', '#FBBF24', '#B45309', '#FCD34D'],
  ['#F97316', '#FB923C', '#C2410C', '#FDBA74'],
  ['#A855F7', '#C084FC', '#7E22CE', '#D8B4FE'],
  ['#EC4899', '#F472B6', '#BE185D', '#F9A8D4'],
];

function parseHexHashPart(input: string): number {
  const digest = createHash('md5').update(input).digest('hex');
  const value = Number.parseInt(digest.slice(0, 8), 16);
  return Number.isFinite(value) ? value : 0;
}

function normalizeHexColor(color?: string | null): string | null {
  if (!color) return null;
  const raw = color.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(raw)) return null;
  return raw;
}

function normalizeCategorySeed(value: NullableNumber): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.trunc(value);
}

export function computeTrainingDisplayColor(
  input: ComputeTrainingDisplayColorInput,
): string {
  const explicit = normalizeHexColor(input.existingColor);
  if (explicit) return explicit;

  const familySeed = normalizeCategorySeed(
    input.mainCategoryId ?? input.trainingCategoryId ?? 0,
  );
  const familyHash = parseHexHashPart(String(familySeed));
  const familyIndex = familyHash % FAMILY_PALETTES.length;

  const variantSeed = (input.trainingId || '').trim()
    ? (input.trainingId || '').trim()
    : (input.trainingName || '').trim() || 'training';
  const variantHash = parseHexHashPart(variantSeed);
  const variantIndex = variantHash % FAMILY_PALETTES[familyIndex]!.length;

  return FAMILY_PALETTES[familyIndex]![variantIndex]!;
}
