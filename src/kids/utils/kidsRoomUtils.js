/**
 * Calcula a sala automatica de uma crianca com base na idade no dia do culto
 * @param {string} dob - data de nascimento (YYYY-MM-DD)
 * @param {Date} eventDate - data do culto
 * @param {Array} rooms - lista de salas do Firestore
 * @returns {object|null} sala correspondente ou null
 */
export function getRoomForChild(dob, eventDate, rooms) {
  if (!dob || !eventDate || !rooms?.length) return null;
  const birth = new Date(dob);
  const ageInMonths =
    (eventDate.getFullYear() - birth.getFullYear()) * 12 +
    (eventDate.getMonth() - birth.getMonth());

  const defaultRooms = rooms
    .filter((r) => r.isDefault && r.isActive)
    .sort((a, b) => a.minAge - b.minAge);

  return defaultRooms.find(
    (r) => ageInMonths >= r.minAge && ageInMonths <= r.maxAge
  ) || null;
}

/**
 * Retorna a idade formatada de uma crianca
 */
export function getAgeLabel(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  if (months < 24) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}
