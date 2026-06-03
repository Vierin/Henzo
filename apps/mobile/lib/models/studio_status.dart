/// Studio publication lifecycle (matches Prisma `StudioStatus`).
enum StudioStatus {
  draft,
  ready,
  active;

  static StudioStatus parse(String? raw) {
    switch (raw?.toUpperCase()) {
      case 'READY':
        return StudioStatus.ready;
      case 'ACTIVE':
        return StudioStatus.active;
      case 'DRAFT':
      default:
        return StudioStatus.draft;
    }
  }

  bool get isActive => this == StudioStatus.active;

  bool get showsOnboarding => !isActive;
}
