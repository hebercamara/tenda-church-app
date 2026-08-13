// src/utils/tenantUtils.js
// Utilitário centralizado para construir caminhos do Firestore baseados no tenant ativo.

import { useAuthStore } from '../store/authStore';

/**
 * Retorna o Tenant ID ativo da sessão atual.
 * Fallback para o projectId original caso nenhum tenant esteja selecionado.
 */
export const getTenantId = () => {
  const tenantId = useAuthStore.getState().tenantId;
  return tenantId || 'tenda-church-app';
};

/**
 * Constrói o caminho base do Firestore para uma coleção dentro do tenant ativo.
 * Exemplo: getCollectionPath('members') => 'artifacts/tenda-church-app/public/data/members'
 */
export const getCollectionPath = (collectionName) => {
  return `artifacts/${getTenantId()}/public/data/${collectionName}`;
};

/**
 * Constrói o caminho do Firestore para um documento específico dentro do tenant ativo.
 * Exemplo: getDocPath('members', 'abc123') => 'artifacts/tenda-church-app/public/data/members/abc123'
 */
export const getDocPath = (collectionName, docId) => {
  return `artifacts/${getTenantId()}/public/data/${collectionName}/${docId}`;
};

/**
 * E-mail do Super Admin que tem acesso a todas as igrejas.
 */
export const SUPER_ADMIN_EMAIL = 'heber.vida@gmail.com';
