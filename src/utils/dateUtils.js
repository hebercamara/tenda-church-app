// Utilitários para formatação de datas no padrão brasileiro

/**
 * Converte data brasileira (dd/mm/aaaa) para formato ISO (aaaa-mm-dd)
 * @param {string} brazilianDate - Data no formato dd/mm/aaaa
 * @returns {string} Data no formato ISO aaaa-mm-dd
 */
export const convertBrazilianDateToISO = (brazilianDate) => {
  if (!brazilianDate) return '';
  const parts = brazilianDate.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return brazilianDate; // Retorna original se não conseguir converter
};

/**
 * Converte data ISO (aaaa-mm-dd) para formato brasileiro (dd/mm/aaaa)
 * @param {string} isoDate - Data no formato ISO aaaa-mm-dd
 * @returns {string} Data no formato brasileiro dd/mm/aaaa
 */
export const convertISOToBrazilianDate = (isoDate) => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoDate; // Retorna original se não conseguir converter
};

/**
 * Formata uma data para exibição no padrão brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} Data formatada
 */
export const formatDateToBrazilian = (date, options = {}) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    // Se a data está no formato ISO, converte para Date
    if (date.includes('-')) {
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
    ...options
  };
  
  return dateObj.toLocaleDateString('pt-BR', defaultOptions);
};

/**
 * Converte uma data para o formato de input HTML5 (aaaa-mm-dd)
 * @param {string|Date} date - Data a ser convertida
 * @returns {string} Data no formato para input HTML5
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    // Se está no formato brasileiro dd/mm/aaaa
    if (date.includes('/')) {
      const [day, month, year] = date.split('/');
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma data para exibição abreviada (Ex: 19/Set)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada no formato abreviado
 */
export const formatDateToAbbreviated = (date) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    if (date.includes('-')) {
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
  const day = dateObj.getDate();
  const month = monthNames[dateObj.getMonth()];
  
  return `${day}/${month}`;
};

/**
 * Retorna o índice do dia da semana (0 = Domingo, 1 = Segunda, ..., 6 = Sábado) a partir de texto
 * @param {string} weekday - Nome do dia da semana (ex: 'quinta-feira', 'quinta', 'qui')
 * @returns {number|null} Índice do dia da semana
 */
export const getConnectWeekdayIndex = (weekday) => {
  if (!weekday) return null;
  const clean = weekday.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (clean.startsWith('dom')) return 0;
  if (clean.startsWith('seg')) return 1;
  if (clean.startsWith('ter')) return 2;
  if (clean.startsWith('qua')) return 3;
  if (clean.startsWith('qui')) return 4;
  if (clean.startsWith('sex')) return 5;
  if (clean.startsWith('sab')) return 6;
  return null;
};

/**
 * Formata um objeto Date, Timestamp ou string para o formato YYYY-MM-DD usando o fuso horário local do usuário
 * @param {Date|Object|string} date - Data a ser formatada
 * @returns {string} Data em formato ISO YYYY-MM-DD no fuso local
 */
export const formatLocalDateToISO = (date) => {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};