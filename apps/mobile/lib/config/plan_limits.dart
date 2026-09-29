/// Plan quotas — keep in sync with
/// `apps/backend/.../plan-limits.constants.ts` and
/// `apps/frontend/src/config/planLimits.ts`.
class PlanLimits {
  PlanLimits._();

  static const int soloTrainers = 1;
  static const int soloSessionsPerMonth = 50;
  static const int studioTrainers = 5;
  static const int studioSessionsPerMonth = 180;

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
