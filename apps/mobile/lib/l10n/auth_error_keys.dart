/// L10n keys under [assets/l10n/*/app.json] for auth and API errors.
abstract final class AuthErrorKeys {
  static const network = 'errors.network';
  static const responseNoUser = 'errors.responseNoUser';
  static const userNotFoundInSystem = 'errors.userNotFoundInSystem';
  static const accountNotFoundForEmail = 'errors.accountNotFoundForEmail';
  static const noSession = 'errors.noSession';
  static const googleWebClientMissing = 'errors.googleWebClientMissing';
  static const googleIosClientMissing = 'errors.googleIosClientMissing';
  static const googleSignInCancelled = 'errors.googleSignInCancelled';
  static const googleNoIdToken = 'errors.googleNoIdToken';
  static const googleNoSessionAfterSignIn = 'errors.googleNoSessionAfterSignIn';
  static const googleDeveloperSHA1 = 'errors.googleDeveloperSHA1';
  static const passwordUpdateFailed = 'errors.passwordUpdateFailed';
  static const profileUpdateFailed = 'errors.profileUpdateFailed';
  static const deleteAccountFailed = 'errors.deleteAccountFailed';
}
