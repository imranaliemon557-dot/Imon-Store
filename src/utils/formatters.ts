/**
 * Bengali Number and Asia/Dhaka Date-Time Formatting
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || isNaN(Number(num))) {
    return '০';
  }
  const str = Math.round(Number(num)).toString();
  return str.replace(/\d/g, d => BN_DIGITS[parseInt(d, 10)]);
}

export function formatTaka(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '৳ ০';
  }
  const isNegative = amount < 0;
  const absVal = Math.abs(Math.round(amount));

  // Format with standard South Asian comma style (lakh / crore)
  const formatted = absVal.toLocaleString('en-IN');
  const bnFormatted = formatted.replace(/\d/g, d => BN_DIGITS[parseInt(d, 10)]);
  return `${isNegative ? '-' : ''}৳ ${bnFormatted}`;
}

export function formatDhakaDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    const formatted = new Intl.DateTimeFormat('bn-BD', options).format(date);
    return formatted;
  } catch {
    return isoString;
  }
}

export function formatDhakaTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Dhaka',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return new Intl.DateTimeFormat('bn-BD', options).format(date);
  } catch {
    return '';
  }
}

export function formatDhakaDateTime(isoString: string): string {
  return `${formatDhakaDate(isoString)}, ${formatDhakaTime(isoString)}`;
}

export function getBengaliTransactionTypeName(type: string): string {
  switch (type) {
    case 'cash_sale':
      return 'নগদ বিক্রি';
    case 'credit_sale_given':
      return 'বাকি দিলাম';
    case 'credit_payment_collected':
      return 'বাকি পেলাম (আদায়)';
    case 'partial_payment':
      return 'আংশিক পরিশোধ';
    case 'return':
      return 'পণ্য ফেরত';
    case 'expense':
      return 'দোকানের খরচ';
    case 'correction':
      return 'সংশোধন';
    default:
      return type;
  }
}
