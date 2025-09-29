// Script para debug das permissões de admin
// Execute no console do navegador para verificar o status

console.log('=== DEBUG ADMIN STATUS ===');

// Verificar se o usuário está logado
const user = JSON.parse(localStorage.getItem('user') || 'null');
console.log('Usuário logado:', user);

// Verificar email do admin
const ADMIN_EMAIL = "tendachurchgbi@batistavida.com.br";
console.log('Email do admin:', ADMIN_EMAIL);

if (user) {
    console.log('Email do usuário:', user.email);
    console.log('É admin por email?', user.email === ADMIN_EMAIL);
}

// Verificar se há dados do membro
const memberData = JSON.parse(localStorage.getItem('currentUserData') || 'null');
console.log('Dados do membro:', memberData);

if (memberData) {
    console.log('É admin por flag?', memberData.isAdmin === true);
}

// Verificar estado do Zustand
if (window.zustandStore) {
    console.log('Estado do Zustand:', window.zustandStore.getState());
}

console.log('=== FIM DEBUG ===');