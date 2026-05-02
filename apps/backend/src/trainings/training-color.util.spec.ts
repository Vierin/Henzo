import { computeTrainingDisplayColor } from './training-color.util';

describe('computeTrainingDisplayColor', () => {
  it('returns stable color for same training input', () => {
    const first = computeTrainingDisplayColor({
      trainingId: 'trn_123',
      trainingName: 'Vinyasa Flow',
      trainingCategoryId: 7,
      mainCategoryId: 2,
    });
    const second = computeTrainingDisplayColor({
      trainingId: 'trn_123',
      trainingName: 'Vinyasa Flow',
      trainingCategoryId: 7,
      mainCategoryId: 2,
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('keeps same family while varying variant within category', () => {
    const colors = new Set(
      ['yoga_a', 'yoga_b', 'yoga_c', 'yoga_d'].map((id) =>
        computeTrainingDisplayColor({
          trainingId: id,
          trainingName: id,
          trainingCategoryId: 11,
          mainCategoryId: 3,
        }),
      ),
    );

    expect(colors.size).toBeGreaterThan(1);
  });

  it('respects existing valid display color', () => {
    const color = computeTrainingDisplayColor({
      trainingId: 'trn_existing',
      trainingName: 'Existing',
      trainingCategoryId: 1,
      mainCategoryId: 1,
      existingColor: '#12AB34',
    });

    expect(color).toBe('#12AB34');
  });
});
