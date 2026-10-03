/**
 * Gera instancias de cultos recorrentes para as proximas N semanas
 * @param {object} eventTemplate - documento base do culto
 * @param {number} weeks - quantas semanas gerar (default 8)
 * @returns {Array} lista de objetos prontos para salvar no Firestore
 */
export function generateRecurringEvents(eventTemplate, weeks = 8) {
  if (!eventTemplate.recurrence?.enabled) return [eventTemplate];

  const instances = [];
  const { daysOfWeek = [], time = "19:00" } = eventTemplate.recurrence;
  const [hours, minutes] = time.split(":").map(Number);

  const startFrom = new Date();
  startFrom.setHours(0, 0, 0, 0);

  for (let w = 0; w < weeks; w++) {
    for (const dayOfWeek of daysOfWeek) {
      const date = new Date(startFrom);
      date.setDate(startFrom.getDate() + w * 7);
      // Ajusta para o dia correto da semana nessa semana
      const currentDay = date.getDay();
      const diff = (dayOfWeek - currentDay + 7) % 7;
      date.setDate(date.getDate() + diff);
      date.setHours(hours, minutes, 0, 0);

      if (date < startFrom) continue;

      const id = `${eventTemplate.id}-${date.toISOString().slice(0, 10)}`;
      instances.push({
        ...eventTemplate,
        id,
        startTime: date,
        status: "scheduled",
        recurrence: {
          ...eventTemplate.recurrence,
          parentEventId: eventTemplate.id,
          instanceDate: date.toISOString(),
        },
      });
    }
  }
  return instances;
}

/**
 * Label amigavel para a recorrencia
 */
export function getRecurrenceLabel(recurrence) {
  if (!recurrence?.enabled) return "Evento unico";
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const daysLabel = (recurrence.daysOfWeek || []).map((d) => days[d]).join(", ");
  return `Toda semana: ${daysLabel} as ${recurrence.time}`;
}
