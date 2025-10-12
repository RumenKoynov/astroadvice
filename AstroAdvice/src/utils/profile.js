// src/utils/profile.js
export function isProfileComplete(user) {
  if (!user) return false;
  const hasDob = !!user.dob;
  const hasSex = !!user.sex;
  const hasZodiac = !!user.westernZodiac; // you derive this from DOB in your ProfileScreen
  return hasDob && hasSex && hasZodiac;
}
