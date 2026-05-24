import 'dart:async';
import 'dart:io';

import '../l10n/locale_provider.dart';
import '../services/api_client.dart';

/// True for timeouts and transport-level failures (not HTTP 4xx/5xx).
bool isTransientNetworkError(Object e) {
  if (e is TimeoutException) return true;
  if (e is SocketException) return true;
  final s = e.toString();
  return s.contains('SocketException') ||
      s.contains('Connection reset') ||
      s.contains('HandshakeException') ||
      s.contains('ClientException') ||
      s.contains('TimeoutException');
}

/// Localized message for list/screen load failures.
String loadErrorMessage(LocaleProvider locale, Object e) {
  if (isTransientNetworkError(e)) {
    return locale.t('errors.network');
  }
  if (e is ApiException) {
    return e.message;
  }
  return locale.t('common.loadFailed');
}

/// Localized message for class booking failures.
String bookingErrorMessage(LocaleProvider locale, Object e) {
  if (e is ApiException) {
    if (e.statusCode == 401) {
      return locale.t('clientClassDetail.signInToBook');
    }
    if (e.statusCode == 409) {
      return locale.t('clientClassDetail.alreadyBooked');
    }
    return e.message;
  }
  if (isTransientNetworkError(e)) {
    return locale.t('errors.network');
  }
  return locale.t('clientClassDetail.bookingFailed');
}

bool isBookingAlreadyBookedError(Object e) {
  if (e is ApiException && e.statusCode == 409) return true;
  final s = e.toString().toLowerCase();
  return s.contains('409') || s.contains('already booked');
}
