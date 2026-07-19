import type { ClientEmailLocale } from './client-email-locale';

export type TrainerInviteEmailStrings = {
  pageTitle: string;
  subject: string;
  headingBefore: string;
  body: string;
  buttonLabel: string;
  fallbackLabel: string;
  expiryText: string;
  expiryDays: string;
  ignoreText: string;
  footerTagline: string;
};

export const TRAINER_INVITE_EMAIL_STRINGS: Record<
  ClientEmailLocale,
  TrainerInviteEmailStrings
> = {
  en: {
    pageTitle: 'Trainer invitation — Henzo',
    subject: "You're invited to join {studioName} on Henzo",
    headingBefore: "You've been invited to join",
    body: 'You have been added as a trainer. Click the button below to create your account and get started.',
    buttonLabel: 'Accept invitation',
    fallbackLabel: "If the button doesn't work, copy this link:",
    expiryText: 'This invitation expires in',
    expiryDays: '7 days',
    ignoreText: "If you didn't expect this email, you can safely ignore it.",
    footerTagline: 'Run your classes. We\u2019ll run your system.',
  },
  ru: {
    pageTitle: 'Приглашение тренера — Henzo',
    subject: 'Приглашение присоединиться к {studioName} в Henzo',
    headingBefore: 'Вас пригласили присоединиться к',
    body: 'Вас добавили как тренера. Нажмите кнопку ниже, чтобы создать аккаунт и начать работу.',
    buttonLabel: 'Принять приглашение',
    fallbackLabel: 'Если кнопка не работает, скопируйте эту ссылку:',
    expiryText: 'Приглашение действует',
    expiryDays: '7 дней',
    ignoreText: 'Если вы не ожидали это письмо, просто проигнорируйте его.',
    footerTagline: 'Ваши занятия — мы возьмём систему на себя.',
  },
  vi: {
    pageTitle: 'Lời mời huấn luyện viên — Henzo',
    subject: 'Bạn được mời tham gia {studioName} trên Henzo',
    headingBefore: 'Bạn được mời tham gia',
    body: 'Bạn đã được thêm làm huấn luyện viên. Nhấn nút bên dưới để tạo tài khoản và bắt đầu.',
    buttonLabel: 'Chấp nhận lời mời',
    fallbackLabel: 'Nếu nút không hoạt động, hãy sao chép liên kết này:',
    expiryText: 'Lời mời có hiệu lực trong',
    expiryDays: '7 ngày',
    ignoreText: 'Nếu bạn không mong đợi email này, hãy bỏ qua.',
    footerTagline: 'Bạn dạy lớp — chúng tôi vận hành hệ thống.',
  },
};
