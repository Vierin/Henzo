type Notice = { title: string; body: string };

const GRANTED: Record<string, Notice> = {
  en: {
    title: '3 months to explore Henzo',
    body: 'Studio is yours for 3 months, so you can get to know the app and see how it fits your studio. We will remind you a month before it ends.',
  },
  ru: {
    title: '3 месяца, чтобы узнать Henzo',
    body: 'Studio открыт на 3 месяца — спокойно познакомьтесь с приложением и посмотрите, как оно подходит вашей студии. За месяц до конца напомним.',
  },
  es: {
    title: '3 meses para conocer Henzo',
    body: 'Studio es tuyo durante 3 meses para que explores la app y veas cómo encaja en tu estudio. Te avisaremos un mes antes de que termine.',
  },
  vi: {
    title: '3 tháng để làm quen với Henzo',
    body: 'Studio mở trong 3 tháng để bạn khám phá ứng dụng và xem nó hợp với studio của bạn thế nào. Chúng tôi sẽ nhắc trước một tháng khi sắp hết hạn.',
  },
  pl: {
    title: '3 miesiące, żeby poznać Henzo',
    body: 'Studio jest Twoje przez 3 miesiące — spokojnie poznaj aplikację i zobacz, jak pasuje do Twojego studia. Przypomnimy miesiąc przed końcem.',
  },
  cs: {
    title: '3 měsíce na seznámení s Henzo',
    body: 'Studio máte na 3 měsíce, abyste si aplikaci v klidu prošli a viděli, jak sedí vašemu studiu. Měsíc před koncem vám připomeneme.',
  },
};

const ENDING: Record<string, Notice> = {
  en: {
    title: 'Your Studio trial ends in a month',
    body: 'If you want to keep using Henzo, renew your plan before the trial ends.',
  },
  ru: {
    title: 'Через месяц заканчивается пакет',
    body: 'Если вам нравится приложение, продлите подписку до окончания триала.',
  },
  es: {
    title: 'Tu prueba de Studio termina en un mes',
    body: 'Si quieres seguir usando Henzo, renueva el plan antes de que termine.',
  },
  vi: {
    title: 'Gói Studio dùng thử còn một tháng',
    body: 'Nếu bạn muốn tiếp tục dùng Henzo, hãy gia hạn trước khi hết hạn.',
  },
  pl: {
    title: 'Okres próbny Studio kończy się za miesiąc',
    body: 'Jeśli chcesz dalej korzystać z Henzo, przedłuż plan przed końcem okresu.',
  },
  cs: {
    title: 'Zkušební Studio končí za měsíc',
    body: 'Pokud chcete Henzo dál používat, prodlužte tarif před koncem zkušební doby.',
  },
};

function pick(
  map: Record<string, Notice>,
  language: string | null | undefined,
): Notice {
  const key = (language ?? 'en').trim().toLowerCase().slice(0, 2);
  return map[key] ?? map.en;
}

export function trialGrantedNotice(language?: string | null): Notice {
  return pick(GRANTED, language);
}

export function trialEndingNotice(language?: string | null): Notice {
  return pick(ENDING, language);
}
