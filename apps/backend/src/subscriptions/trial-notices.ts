type Notice = { title: string; body: string };

const GRANTED: Record<string, Notice> = {
  en: {
    title: 'Studio trial started',
    body: 'You have a 3-month Studio trial. Add classes and trainers until it ends.',
  },
  ru: {
    title: 'Триал Studio на 3 месяца',
    body: 'Вам выдан триал пакета Studio на 3 месяца. Можно добавлять занятия и тренеров, пока он действует.',
  },
  es: {
    title: 'Prueba de Studio iniciada',
    body: 'Tienes 3 meses de Studio. Añade clases y entrenadores hasta que termine.',
  },
  vi: {
    title: 'Đã bắt đầu dùng thử Studio',
    body: 'Bạn được dùng thử gói Studio trong 3 tháng. Thêm lớp và huấn luyện viên cho đến khi hết hạn.',
  },
  pl: {
    title: 'Okres próbny Studio',
    body: 'Masz 3 miesiące pakietu Studio. Dodawaj zajęcia i trenerów do końca okresu.',
  },
  cs: {
    title: 'Zkušební Studio',
    body: 'Máte 3 měsíce tarifu Studio. Přidávejte lekce a trenéry, dokud neskončí.',
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
