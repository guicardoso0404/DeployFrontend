// 🦟👀
// Script da página home do NetworkUp
document.addEventListener('DOMContentLoaded', function() {
    console.log('NetworkUp - Página Home carregada');
    
    // Verificar se há usuário logado para mostrar informações adicionais se necessário
    const user = JSON.parse(localStorage.getItem('currentUser'));
    
    if (user) {
        console.log('Usuário logado encontrado:', user.nome);
        // Usuário pode navegar livremente pela home mesmo estando logado
    }
    
    // Adicionar eventos aos botões se necessário1
    const loginBtn = document.querySelector('a[href="/login"]');
    const cadastroBtn = document.querySelector('a[href="/cadastro"]');
    const feedLink = document.querySelector('a[href="/feed"]');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            console.log('Navegando para login');
        });
    }
    
    if (cadastroBtn) {
        cadastroBtn.addEventListener('click', function(e) {
            console.log('Navegando para cadastro');
        });
    }
    
    if (feedLink) {
        feedLink.addEventListener('click', function(e) {
            console.log('Entrando no feed como visitante');
        });
    }
});
