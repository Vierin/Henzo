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
  static const appleSignInCancelled = 'errors.appleSignInCancelled';
  static const appleNoIdToken = 'errors.appleNoIdToken';
  static const appleNoSessionAfterSignIn = 'errors.appleNoSessionAfterSignIn';
  static const passwordUpdateFailed = 'errors.passwordUpdateFailed';
  static const profileUpdateFailed = 'errors.profileUpdateFailed';
  static const deleteAccountFailed = 'errors.deleteAccountFailed';
  static const accountExistsLogin = 'errors.accountExistsLogin';
  static const accountExistsUseGoogle = 'errors.accountExistsUseGoogle';
  static const accountExistsUseApple = 'errors.accountExistsUseApple';
  static const accountExistsUseOauth = 'errors.accountExistsUseOauth';
  static const invalidCredentials = 'errors.invalidCredentials';
  static const verificationCodeNotRequested =
      'errors.verificationCodeNotRequested';
  static const verificationCodeExpired = 'errors.verificationCodeExpired';
  static const tooManyAttempts = 'errors.tooManyAttempts';
  static const invalidVerificationCode = 'errors.invalidVerificationCode';
  static const invalidRegistrationPayload = 'errors.invalidRegistrationPayload';

  /// Maps API / Supabase raw messages to l10n keys when possible.
  static String? mapRawToL10nKey(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    if (raw.contains('ACCOUNT_EXISTS_USE_GOOGLE')) {
      return accountExistsUseGoogle;
    }
    if (raw.contains('ACCOUNT_EXISTS_USE_APPLE')) {
      return accountExistsUseApple;
    }
    if (raw.contains('ACCOUNT_EXISTS_USE_OAUTH')) {
      return accountExistsUseOauth;
    }
    if (raw.contains('ACCOUNT_EXISTS_LOGIN')) {
      return accountExistsLogin;
    }
    if (raw.contains('ACCOUNT_NOT_FOUND') ||
        raw.contains('User not found in database')) {
      return accountNotFoundForEmail;
    }
    final lower = raw.toLowerCase();
    if (lower.contains('invalid login credentials') ||
        lower.contains('invalid email or password')) {
      return invalidCredentials;
    }
    if (lower.contains('verification code not requested')) {
      return verificationCodeNotRequested;
    }
    if (lower.contains('verification code expired')) {
      return verificationCodeExpired;
    }
    if (lower.contains('too many attempts')) {
      return tooManyAttempts;
    }
    if (lower.contains('invalid verification code')) {
      return invalidVerificationCode;
    }
    if (lower.contains('invalid registration payload')) {
      return invalidRegistrationPayload;
    }
    return null;
  }
}
