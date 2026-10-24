import type { Customer, ParsedVoiceCommand } from '../types';

// Bengali number words dictionary
const BENGALI_NUM_WORDS: Record<string, number> = {
  'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5,
  'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
  'কুড়ি': 20, 'বিশ': 20, 'ত্রিশ': 30, 'চল্লিশ': 40, 'পঞ্চাশ': 50,
  'ষাট': 60, 'সত্তর': 70, 'আশি': 80, 'নব্বই': 90,
  'একশ': 100, 'একশো': 100, 'দুইশ': 200, 'দুইশো': 200, 'তিনশ': 300, 'তিনশো': 300,
  'চারশ': 400, 'চারশো': 400, 'পাঁচশ': 500, 'পাঁচশো': 500,
  'হাজার': 1000, 'এক হাজার': 1000, 'দেড় হাজার': 1500, 'দুই হাজার': 2000
};

export function parseBengaliAmount(text: string): number | undefined {
  // First check for direct Bengali digits (e.g. ১০০, ৫০০)
  const bnDigitsMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };

  let normalized = text;
  for (const [bn, en] of Object.entries(bnDigitsMap)) {
    normalized = normalized.replaceAll(bn, en);
  }

  // Check for regex digits
  const digitMatch = normalized.match(/(\d+)/);
  if (digitMatch) {
    const val = parseInt(digitMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Check for Bengali words (longest match first)
  const sortedEntries = Object.entries(BENGALI_NUM_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, val] of sortedEntries) {
    if (text.includes(word)) {
      return val;
    }
  }

  return undefined;
}

export function parseVoiceCommand(transcript: string, customers: Customer[]): ParsedVoiceCommand {
  const clean = transcript.trim().toLowerCase();

  // 1. Check queries: "আজকের মোট বিক্রি কত"
  if (clean.includes('মোট বিক্রি') || clean.includes('বিক্রি কত') || clean.includes('আজকের বিক্রি')) {
    return {
      rawTranscript: transcript,
      confidence: 0.95,
      action: 'query_sales',
      isValid: true,
      description: 'আজকের মোট বিক্রির হিসাব দেখা হবে'
    };
  }

  // 2. Check query dues: "রহিমের মোট বাকি কত"
  if (clean.includes('বাকি কত') || clean.includes('পাওনা কত')) {
    // Find customer
    let matchedCustomer: Customer | undefined;
    for (const c of customers) {
      if (clean.includes(c.name.toLowerCase())) {
        matchedCustomer = c;
        break;
      }
    }

    return {
      rawTranscript: transcript,
      confidence: 0.9,
      action: 'query_customer_due',
      customerName: matchedCustomer?.name || 'কাস্টমার',
      matchedCustomerId: matchedCustomer?.id,
      isValid: true,
      description: matchedCustomer
        ? `${matchedCustomer.name}-এর মোট বাকি কত তা দেখা হবে`
        : 'নির্দিষ্ট কাস্টমারের বাকি অনুসন্ধান'
    };
  }

  // 3. Check Credit Sale ("বাকি দিলাম" or "বাকি লিখো")
  const isCreditSale = clean.includes('বাকি লিখ') || clean.includes('বাকি দিল') || clean.includes('বাকি কর') || clean.includes('বাকিতে নিল');

  // 4. Check Payment Collection ("বাকি পেলাম" or "টাকা দিয়েছে" or "পরিশোধ")
  const isPaymentCollection = clean.includes('দিয়েছে') || clean.includes('দিল') || clean.includes('বাকি পেল') || clean.includes('জমা দিল') || clean.includes('পরিশোধ');

  const amount = parseBengaliAmount(clean);

  // Match customer name from the transcript
  let matchedCustomer: Customer | undefined;
  for (const c of customers) {
    const fullName = c.name.toLowerCase().trim();
    const firstName = fullName.split(/[\s(]+/)[0];
    if (clean.includes(fullName) || (firstName.length >= 2 && clean.includes(firstName))) {
      matchedCustomer = c;
      break;
    }
  }

  // If customer is not existing but transcript says "রহিমের নামে...", extract name
  let extractedName = matchedCustomer?.name;
  if (!extractedName) {
    const nameMatch = transcript.match(/([\u0980-\u09FF]+?)(?:ের|র)?\s*(?:নামে|কে)/);
    if (nameMatch && nameMatch[1] && nameMatch[1] !== 'এর') {
      extractedName = nameMatch[1];
    } else {
      // Look for first word before 'টাকা' or 'বাকি'
      const words = transcript.split(/\s+/);
      if (words.length > 0 && !['আজকের', 'দোকানের', 'নগদ'].includes(words[0])) {
        extractedName = words[0].replace(/(?:ের|র)$/, '');
      }
    }
  }

  if (isCreditSale && amount) {
    return {
      rawTranscript: transcript,
      confidence: 0.9,
      action: 'credit_sale_given',
      customerName: extractedName || 'অপরিচিত কাস্টমার',
      matchedCustomerId: matchedCustomer?.id,
      amount,
      isValid: true,
      description: `${extractedName || 'কাস্টমার'}-কে ${amount} টাকা বাকি দেওয়া হবে`
    };
  }

  if (isPaymentCollection && amount) {
    return {
      rawTranscript: transcript,
      confidence: 0.9,
      action: 'credit_payment_collected',
      customerName: extractedName || 'অপরিচিত কাস্টমার',
      matchedCustomerId: matchedCustomer?.id,
      amount,
      isValid: true,
      description: `${extractedName || 'কাস্টমার'}-এর কাছ থেকে ${amount} টাকা আদায় (জমা) হিসেবে লেখা হবে`
    };
  }

  // Cash sale
  if (clean.includes('নগদ') && amount) {
    return {
      rawTranscript: transcript,
      confidence: 0.85,
      action: 'cash_sale',
      amount,
      isValid: true,
      description: `${amount} টাকা নগদ বিক্রি হিসেবে যুক্ত হবে`
    };
  }

  return {
    rawTranscript: transcript,
    confidence: 0.4,
    action: 'unknown',
    amount,
    customerName: extractedName,
    isValid: false,
    description: 'কথাটি সঠিকভাবে বোঝা যায়নি। দয়া করে স্পষ্ট করে বলুন।'
  };
}

export function speakBengali(text: string): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore if TTS is disabled or unavailable
    }
  }
}
