import type { ClientEmailLocale } from './client-email-locale';

export type OtpEmailStrings = {
  pageTitle: string;
  subject: string;
  ownerSubject: string;
  secureBadge: string;
  heading: string;
  ownerHeading: string;
  subheading: string;
  ownerSubheading: string;
  expiryText: string;
  expiryMinutes: string;
  ignoreText: string;
  footerTagline: string;
};

export const OTP_EMAIL_STRINGS: Record<ClientEmailLocale, OtpEmailStrings> = {
  en: {
    pageTitle: 'Your Henzo verification code',
    subject: 'Your Henzo verification code',
    ownerSubject: 'Your Henzo business verification code',
    secureBadge: 'Secure sign-in',
    heading: 'Your verification code',
    ownerHeading: 'Your business verification code',
    subheading:
      'Use this code to sign in to your account. Do not share it with anyone.',
    ownerSubheading:
      'Use this code to finish setting up your business account. Do not share it with anyone.',
    expiryText: 'Code is valid for',
    expiryMinutes: '10 minutes',
    ignoreText:
      "If you didn't request this code, you can safely ignore this email.",
    footerTagline: 'Run your classes. We\u2019ll run your system.',
  },
  ru: {
    pageTitle: 'Код подтверждения Henzo',
    subject: 'Ваш код подтверждения Henzo',
    ownerSubject: 'Код подтверждения бизнес-аккаунта Henzo',
    secureBadge: 'Безопасный вход',
    heading: 'Ваш код подтверждения',
    ownerHeading: 'Код подтверждения бизнес-аккаунта',
    subheading:
      'Используйте этот код для входа в ваш аккаунт. Никому не сообщайте его.',
    ownerSubheading:
      'Используйте этот код для завершения регистрации бизнес-аккаунта. Никому не сообщайте его.',
    expiryText: 'Код действителен',
    expiryMinutes: '10 минут',
    ignoreText:
      'Если вы не запрашивали этот код, просто проигнорируйте письмо.',
    footerTagline: 'Ваши занятия — мы возьмём систему на себя.',
  },
  vi: {
    pageTitle: 'Mã xác minh Henzo của bạn',
    subject: 'Mã xác minh Henzo của bạn',
    ownerSubject: 'Mã xác minh tài khoản doanh nghiệp Henzo',
    secureBadge: 'Đăng nhập an toàn',
    heading: 'Mã xác minh của bạn',
    ownerHeading: 'Mã xác minh tài khoản doanh nghiệp',
    subheading:
      'Dùng mã này để đăng nhập vào tài khoản. Không chia sẻ với bất kỳ ai.',
    ownerSubheading:
      'Dùng mã này để hoàn tất thiết lập tài khoản doanh nghiệp. Không chia sẻ với bất kỳ ai.',
    expiryText: 'Mã có hiệu lực trong',
    expiryMinutes: '10 phút',
    ignoreText: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
    footerTagline: 'Bạn dạy lớp — chúng tôi vận hành hệ thống.',
  },
};
