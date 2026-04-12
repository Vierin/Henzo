/** VND display for email bodies (same rules as previous EmailService). */
export function formatVnd(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M ₫`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K ₫`;
  }
  return `${amount} ₫`;
}

export function generateGoogleCalendarUrl(bookingData: {
  serviceName: string;
  dateTime: Date | string;
  duration: number;
  salonName: string;
  salonAddress?: string;
  staffName?: string;
  salonTimezone?: string;
}): string {
  let dateTimeStr: string;
  if (bookingData.dateTime instanceof Date) {
    dateTimeStr = bookingData.dateTime.toISOString();
  } else {
    dateTimeStr = bookingData.dateTime;
  }

  const utcDate = new Date(dateTimeStr);

  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth() + 1;
  const day = utcDate.getUTCDate();
  const hours = utcDate.getUTCHours();
  const minutes = utcDate.getUTCMinutes();
  const seconds = utcDate.getUTCSeconds();

  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + bookingData.duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  const formatDateTime = (
    y: number,
    m: number,
    d: number,
    h: number,
    min: number,
    sec: number,
  ): string => {
    return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}${String(sec).padStart(2, '0')}Z`;
  };

  const start = formatDateTime(year, month, day, hours, minutes, seconds);
  const end = formatDateTime(year, month, day, endHours, endMins, seconds);

  const title = encodeURIComponent(
    `${bookingData.serviceName} at ${bookingData.salonName}`,
  );
  const details = encodeURIComponent(
    `Service: ${bookingData.serviceName}\n${
      bookingData.staffName ? `Staff: ${bookingData.staffName}\n` : ''
    }Salon: ${bookingData.salonName}`,
  );
  const location = encodeURIComponent(
    bookingData.salonAddress || bookingData.salonName,
  );

  const salonTimezone = bookingData.salonTimezone || 'Asia/Ho_Chi_Minh';
  const ctz = encodeURIComponent(salonTimezone);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&ctz=${ctz}&details=${details}&location=${location}`;
}

export function generateGoogleMapsUrl(salonAddress: string): string {
  const encodedAddress = encodeURIComponent(salonAddress);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
}
