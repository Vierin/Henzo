import type { ClientEmailLocale } from './client-email-locale';

export type StudioClaimEmailStrings = {
  pageTitle: string;
  subject: string;
  defaultTrainingName: string;
  headingBefore: string;
  body: string;
  confirmButton: string;
  manageButton: string;
  clientLabel: string;
  classLabel: string;
  timeLabel: string;
  fallbackLabel: string;
  expiryText: string;
  expiryDays: string;
  ignoreText: string;
  footerTagline: string;
};

export type StudioClaimInviteStrings = {
  pageTitle: string;
  subject: string;
  heading: string;
  body: string;
  ctaButton: string;
  fallbackLabel: string;
  ignoreText: string;
  footerTagline: string;
  appStoreLabel: string;
  googlePlayLabel: string;
};

export const STUDIO_CLAIM_INVITE_STRINGS: Record<
  ClientEmailLocale,
  StudioClaimInviteStrings
> = {
  en: {
    pageTitle: 'Manage your studio — Henzo',
    subject: '{studioName} — manage your studio on Henzo',
    heading: 'Your studio is on Henzo',
    body: 'To keep receiving bookings for your classes, download the Henzo app and start managing your studio.',
    ctaButton: 'Manage your studio',
    fallbackLabel: "If the button doesn't work, copy this link:",
    ignoreText: "If you didn't expect this email, you can safely ignore it.",
    footerTagline: 'Run your classes. We\u2019ll run your system.',
    appStoreLabel: 'App Store',
    googlePlayLabel: 'Google Play',
  },
  ru: {
    pageTitle: 'Управляйте студией — Henzo',
    subject: '{studioName} — управляйте студией в Henzo',
    heading: 'Ваша студия в Henzo',
    body: 'Чтобы продолжать получать записи на ваши тренировки, скачайте приложение Henzo и начните управлять своей студией.',
    ctaButton: 'Управлять студией',
    fallbackLabel: 'Если кнопка не работает, скопируйте ссылку:',
    ignoreText: 'Если вы не ожидали это письмо, просто проигнорируйте его.',
    footerTagline: 'Ваши занятия — мы возьмём систему на себя.',
    appStoreLabel: 'App Store',
    googlePlayLabel: 'Google Play',
  },
  vi: {
    pageTitle: 'Quản lý studio — Henzo',
    subject: '{studioName} — quản lý studio của bạn trên Henzo',
    heading: 'Studio của bạn đã có trên Henzo',
    body: 'Để tiếp tục nhận đặt chỗ cho các lớp học của bạn, hãy tải ứng dụng Henzo và bắt đầu quản lý studio.',
    ctaButton: 'Quản lý studio',
    fallbackLabel: 'Nếu nút không hoạt động, hãy sao chép liên kết này:',
    ignoreText: 'Nếu bạn không mong đợi email này, hãy bỏ qua.',
    footerTagline: 'Bạn dạy lớp — chúng tôi vận hành hệ thống.',
    appStoreLabel: 'App Store',
    googlePlayLabel: 'Google Play',
  },
};

export const STUDIO_CLAIM_EMAIL_STRINGS: Record<
  ClientEmailLocale,
  StudioClaimEmailStrings
> = {
  en: {
    pageTitle: 'New booking request — Henzo',
    subject: 'New booking for {studioName}: {trainingName}',
    defaultTrainingName: 'a class',
    headingBefore: 'New booking request for',
    body: 'A client requested a spot. Confirm the booking or open Henzo to manage your studio.',
    confirmButton: 'Confirm booking',
    manageButton: 'Manage bookings',
    clientLabel: 'Client',
    classLabel: 'Class',
    timeLabel: 'When',
    fallbackLabel: "If the buttons don't work, copy this link:",
    expiryText: 'This link expires in',
    expiryDays: '72 hours',
    ignoreText: "If you didn't expect this email, you can safely ignore it.",
    footerTagline: 'Run your classes. We\u2019ll run your system.',
  },
  ru: {
    pageTitle: 'Новая заявка на запись — Henzo',
    subject: 'Новая запись в {studioName}: {trainingName}',
    defaultTrainingName: 'тренировку',
    headingBefore: 'Новая заявка на запись в',
    body: 'Клиент запросил место. Подтвердите запись или откройте Henzo, чтобы управлять студией.',
    confirmButton: 'Подтвердить запись',
    manageButton: 'Управлять записями',
    clientLabel: 'Клиент',
    classLabel: 'Тренировка',
    timeLabel: 'Когда',
    fallbackLabel: 'Если кнопки не работают, скопируйте ссылку:',
    expiryText: 'Ссылка действует',
    expiryDays: '72 часа',
    ignoreText: 'Если вы не ожидали это письмо, просто проигнорируйте его.',
    footerTagline: 'Ваши занятия — мы возьмём систему на себя.',
  },
  vi: {
    pageTitle: 'Yêu cầu đặt chỗ mới — Henzo',
    subject: 'Đặt chỗ mới cho {studioName}: {trainingName}',
    defaultTrainingName: 'một lớp',
    headingBefore: 'Yêu cầu đặt chỗ mới cho',
    body: 'Khách đã yêu cầu một chỗ. Xác nhận đặt chỗ hoặc mở Henzo để quản lý studio.',
    confirmButton: 'Xác nhận đặt chỗ',
    manageButton: 'Quản lý đặt chỗ',
    clientLabel: 'Khách',
    classLabel: 'Lớp',
    timeLabel: 'Thời gian',
    fallbackLabel: 'Nếu nút không hoạt động, hãy sao chép liên kết này:',
    expiryText: 'Liên kết hết hạn sau',
    expiryDays: '72 giờ',
    ignoreText: 'Nếu bạn không mong đợi email này, hãy bỏ qua.',
    footerTagline: 'Bạn dạy lớp — chúng tôi vận hành hệ thống.',
  },
};
