// Teste simples para verificar autenticação
// Execute este arquivo no console do navegador para verificar o status

console.log('=== TESTE DE AUTENTICAÇÃO ===');

// Verificar se o usuário está logado
const user = JSON.parse(localStorage.getItem('auth-storage') || '{}');
console.log('Dados do localStorage:', user);

// Verificar se há dados no Zustand store
if (window.useAuthStore) {
    const authState = window.useAuthStore.getState();
    console.log('Estado do Zustand:', authState);
} else {
    console.log('Zustand store não encontrado');
}

// Verificar se o email do admin está correto
const ADMIN_EMAIL = "tendachurchgbi@batistavida.com.br";
console.log('Email do admin configurado:', ADMIN_EMAIL);

// Verificar se o usuário atual é admin
if (user.state && user.state.user) {
    const currentEmail = user.state.user.email;
    const isAdmin = currentEmail === ADMIN_EMAIL;
    console.log('Email atual:', currentEmail);
    console.log('É admin?', isAdmin);
} else {
    console.log('Usuário não está logado');
}

console.log('=== FIM DO TESTE ===');