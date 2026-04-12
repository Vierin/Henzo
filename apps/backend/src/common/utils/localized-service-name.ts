/** Matches frontend getLocalizedServiceName — pick translated service title for emails. */
export type ServiceNameFields = {
  name: string;
  nameEn?: string | null;
  nameVi?: string | null;
  nameRu?: string | null;
};

export type ClientEmailLocale = 'en' | 'ru' | 'vi';

export function getLocalizedServiceName(
  service: ServiceNameFields | null | undefined,
  locale: ClientEmailLocale,
  fallback = 'Service',
): string {
  if (!service?.name) return fallback;
  const nonEmpty = (s?: string | null) => {
    const t = s?.trim();
    return t && t.length > 0 ? t : undefined;
  };
  switch (locale) {
    case 'vi':
      return nonEmpty(service.nameVi) ?? service.name;
    case 'ru':
      return nonEmpty(service.nameRu) ?? service.name;
    case 'en':
      return nonEmpty(service.nameEn) ?? service.name;
    default:
      return service.name;
  }
}
