/// Plan quotas — keep in sync with `apps/backend/.../plan-limits.constants.ts`.
class PlanLimits {
  PlanLimits._();

  static const int soloTrainers = 1;
  static const int soloSessionsPerMonth = 12;
  static const int studioTrainers = 4;
  static const int studioSessionsPerMonth = 100;

  static ({int trainers, int sessions})? quotaForType(String? type) {
    final t = (type ?? 'SOLO').toUpperCase();
    switch (t) {
      case 'STUDIO':
      case 'PRO':
        return (trainers: studioTrainers, sessions: studioSessionsPerMonth);
      case 'SOLO':
      case 'FREEMIUM':
        return (trainers: soloTrainers, sessions: soloSessionsPerMonth);
      default:
        return null;
    }
  }

  static bool hasUsageQuota(String? type) => quotaForType(type) != null;
}
