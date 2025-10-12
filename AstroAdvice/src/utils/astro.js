// Western zodiac by month/day
export function getWesternZodiac(date) {
  if (!date) return '';
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  // Boundaries (inclusive start/end)
  // Aries       Mar 21 – Apr 19
  // Taurus      Apr 20 – May 20
  // Gemini      May 21 – Jun 20
  // Cancer      Jun 21 – Jul 22
  // Leo         Jul 23 – Aug 22
  // Virgo       Aug 23 – Sep 22
  // Libra       Sep 23 – Oct 22
  // Scorpio     Oct 23 – Nov 21
  // Sagittarius Nov 22 – Dec 21
  // Capricorn   Dec 22 – Jan 19
  // Aquarius    Jan 20 – Feb 18
  // Pisces      Feb 19 – Mar 20

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Aries';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taurus';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemini';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cancer';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leo';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgo';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpio';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagittarius';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquarius';
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'Pisces';
  return '';
}

// Chinese zodiac by Gregorian year (simple cycle)
const CHINESE_SIGNS = [
  'Rat','Ox','Tiger','Rabbit','Dragon','Snake',
  'Horse','Goat','Monkey','Rooster','Dog','Pig'
];
export function getChineseZodiac(year) {
  if (!year) return '';
  const index = (year - 1900) % 12; // 1900 was Rat
  return CHINESE_SIGNS[(index + 12) % 12];
}

// Age from DOB (today-based)
export function calcAge(date) {
  if (!date) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;
  return age;
}
