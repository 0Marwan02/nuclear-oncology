/**
 * Egyptian National ID Parser Utility
 * Parses and validates 14-digit Egyptian National ID numbers
 *
 * Format: C YY MM DD S S S S G C
 * - Digit 1 (Century): 2 = 1900-1999, 3 = 2000-2099
 * - Digits 2-3: Year of birth
 * - Digits 4-5: Month of birth (01-12)
 * - Digits 6-7: Day of birth (01-31)
 * - Digits 8-10: Governorate code (not used in parsing)
 * - Digits 11-12: Birth registration sequence (not used in parsing)
 * - Digit 13 (0-indexed 12): Gender - Odd = Male, Even = Female
 * - Digit 14: Check digit (not validated)
 */

/**
 * Parse and validate an Egyptian National ID
 * @param {string} id - The 14-digit national ID number
 * @returns {Object} Parsed data with validation results
 */
function parseEgyptianNationalId(id) {
  const result = {
    birthDate: null,
    birthDateString: '',
    age: 0,
    gender: null,
    isValid: false,
    error: null
  };

  if (id === null || id === undefined) {
    result.error = 'يجب أن يتكون الرقم القومي من 14 رقماً';
    return result;
  }

  const idString = String(id).trim();

  if (!/^\d+$/.test(idString)) {
    result.error = 'الرقم القومي يجب أن يحتوي على أرقام فقط';
    return result;
  }

  if (idString.length !== 14) {
    result.error = 'يجب أن يتكون الرقم القومي من 14 رقماً';
    return result;
  }

  const centuryDigit = parseInt(idString[0], 10);
  const yearDigits = idString.substring(1, 3);
  const monthDigits = idString.substring(3, 5);
  const dayDigits = idString.substring(5, 7);
  const genderDigit = parseInt(idString[12], 10);

  if (centuryDigit !== 2 && centuryDigit !== 3) {
    result.error = 'رقم القرن غير صالح';
    return result;
  }

  const baseYear = centuryDigit === 2 ? 1900 : 2000;
  const year = baseYear + parseInt(yearDigits, 10);

  const month = parseInt(monthDigits, 10);
  if (month < 1 || month > 12) {
    result.error = 'الشهر غير صالح';
    return result;
  }

  const day = parseInt(dayDigits, 10);
  if (day < 1 || day > 31) {
    result.error = 'اليوم غير صالح';
    return result;
  }

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  const gender = genderDigit % 2 === 1 ? 'Male' : 'Female';
  const birthDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  result.birthDate = birthDate;
  result.birthDateString = birthDateString;
  result.age = age;
  result.gender = gender;
  result.isValid = true;

  return result;
}

export { parseEgyptianNationalId };
