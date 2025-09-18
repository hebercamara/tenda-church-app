/**
 * Utilitários para formatação de endereços
 */

/**
 * Formata um endereço completo a partir dos campos separados
 * @param {Object} addressData - Objeto contendo os campos de endereço
 * @param {string} addressData.endereco - Rua e número
 * @param {string} addressData.bairro - Bairro
 * @param {string} addressData.municipio - Município
 * @param {string} addressData.cep - CEP
 * @returns {string} Endereço formatado
 */
export const formatFullAddress = (addressData) => {
  if (!addressData) return '';
  
  const parts = [];
  
  // Adiciona rua e número se disponível
  if (addressData.endereco && addressData.endereco.trim()) {
    parts.push(addressData.endereco.trim());
  }
  
  // Adiciona bairro se disponível
  if (addressData.bairro && addressData.bairro.trim()) {
    parts.push(addressData.bairro.trim());
  }
  
  // Adiciona município se disponível
  if (addressData.municipio && addressData.municipio.trim()) {
    parts.push(addressData.municipio.trim());
  }
  
  // Adiciona CEP se disponível
  if (addressData.cep && addressData.cep.trim()) {
    parts.push(addressData.cep.trim());
  }
  
  return parts.join(', ');
};

/**
 * Formata um endereço resumido (apenas rua, bairro e município)
 * @param {Object} addressData - Objeto contendo os campos de endereço
 * @returns {string} Endereço resumido
 */
export const formatShortAddress = (addressData) => {
  if (!addressData) return '';
  
  const parts = [];
  
  // Adiciona rua e número se disponível
  if (addressData.endereco && addressData.endereco.trim()) {
    parts.push(addressData.endereco.trim());
  }
  
  // Adiciona bairro se disponível
  if (addressData.bairro && addressData.bairro.trim()) {
    parts.push(addressData.bairro.trim());
  }
  
  // Adiciona município se disponível
  if (addressData.municipio && addressData.municipio.trim()) {
    parts.push(addressData.municipio.trim());
  }
  
  return parts.join(', ');
};

/**
 * Verifica se um endereço tem pelo menos um campo preenchido
 * @param {Object} addressData - Objeto contendo os campos de endereço
 * @returns {boolean} True se tem algum campo preenchido
 */
export const hasAddressData = (addressData) => {
  if (!addressData) return false;
  
  return !!(addressData.endereco?.trim() || 
           addressData.bairro?.trim() || 
           addressData.municipio?.trim() || 
           addressData.cep?.trim());
};

/**
 * Converte endereço antigo (campo único) para novo formato (campos separados)
 * @param {string} oldAddress - Endereço no formato antigo
 * @returns {Object} Objeto com campos separados
 */
export const convertLegacyAddress = (oldAddress) => {
  if (!oldAddress || !oldAddress.trim()) {
    return {
      endereco: '',
      bairro: '',
      municipio: '',
      cep: ''
    };
  }
  
  // Para endereços legados, colocamos tudo no campo endereco
  // O usuário pode editar depois para separar os campos
  return {
    endereco: oldAddress.trim(),
    bairro: '',
    municipio: '',
    cep: ''
  };
};