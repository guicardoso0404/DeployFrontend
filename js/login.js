// 🦟👀
// Configurações da API
const API_BASE_URL = 'https://deploy-back-end-chi.vercel.app/api';

console.log(' Login.js carregado!');

document.addEventListener('DOMContentLoaded', function() {
    console.log(' DOM carregado - configurando login');
    
    // COMENTADO PARA PERMITIR ACESSO SEMPRE:
    // const currentUser = getCurrentUser();
    // if (currentUser) {
    //     window.location.href = '/feed';
    //     return;
    // }
    
    // Configurar formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log(' Formulário de login encontrado');
        loginForm.addEventListener('submit', handleLogin);
        
        // Configurar validação em tempo real
        setupFormValidation();
    } else {
        console.error(' Formulário de login não encontrado!');
    }
    
    // Configurar toggle de senha
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            togglePassword(input.id);
        });
    });
    
    // Login com Google
    const googleBtn = document.querySelector('.btn-google');
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(' Redirecionando para login com Google...');
            window.location.href = 'https://deploy-back-end-chi.vercel.app/api/auth/google';
        });
    }
    
    // // Login com LinkedIn
    // const linkedinBtn = document.querySelector('.btn-linkedin');
    // if (linkedinBtn) {
    //     linkedinBtn.addEventListener('click', function(e) {
    //         e.preventDefault();
    //         console.log(' Redirecionando para login com LinkedIn...');
    //         window.location.href = 'https://deploy-back-end-chi.vercel.app/api/auth/linkedin';
    //     });
    // }
});

// Função de login
async function handleLogin(event) {
    console.log(' handleLogin chamada!');
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value.trim();
    const senha = form.senha.value;
    const submitButton = form.querySelector('button[type="submit"]');
    
    console.log(' Email:', email);
    console.log(' Senha:', senha ? '***' : 'vazia');
    
    // Validações básicas
    if (!email || !senha) {
        console.log(' Campos vazios');
        showToast('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        console.log(' Email inválido');
        showToast('E-mail inválido', 'error');
        return;
    }
    
    setButtonLoading(submitButton, true);
    
    try {
        console.log(' Tentando login:', email);
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });
        
        console.log(' Resposta recebida:', response.status);
        
        const data = await response.json();
        console.log(' Dados:', data);
        
        if (data.success) {
            console.log(' Login realizado:', data.data.usuario.nome);
            console.log(' Foto de perfil recebida:', data.data.usuario.foto_perfil_url || data.data.usuario.foto_perfil || 'nenhuma');
            
            // Garantir que a foto de perfil esteja no objeto do usuário
            const usuario = data.data.usuario;
            
            // Se tiver foto_perfil_url, garantir que foto_perfil também tenha
            if (usuario.foto_perfil_url && !usuario.foto_perfil) {
                usuario.foto_perfil = usuario.foto_perfil_url;
            }
            // Se tiver foto_perfil mas não foto_perfil_url, garantir que foto_perfil_url também tenha
            if (usuario.foto_perfil && !usuario.foto_perfil_url) {
                usuario.foto_perfil_url = usuario.foto_perfil;
            }
            
            console.log(' Dados completos do usuário para salvar:', usuario);
            
            // Salvar usuário no localStorage
            localStorage.setItem('currentUser', JSON.stringify(usuario));
            
            showToast('Login realizado com sucesso!', 'success');
            
            // Redirecionar após delay
            setTimeout(() => {
                console.log(' Redirecionando para:', data.data.redirectTo);
                window.location.href = data.data.redirectTo || '/feed';
            }, 1500);
        } else {
            console.log(' Login falhou:', data.message);
            showToast(data.message || 'Erro no login', 'error');
        }
    } catch (error) {
        console.error(' Erro no login:', error);
        showToast('Erro de conexão. Verifique se o servidor está rodando.', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Função para obter usuário atual
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Erro ao recuperar usuário:', error);
        localStorage.removeItem('currentUser');
        return null;
    }
}

// Validação de email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Toggle senha
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');
    
    if (input && button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
            button.setAttribute('title', 'Ocultar senha');
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="bi bi-eye-fill"></i>';
            button.setAttribute('title', 'Mostrar senha');
        }
    }
}

// Função global para ser chamada pelo HTML
window.togglePassword = togglePassword;

// Loading button
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        button.textContent = 'Entrando...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.textContent = 'Entrar';
    }
}

// Configurar validação de formulário
function setupFormValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
}

// Validar campo individual
function validateField(input) {
    const formGroup = input.closest('.form-group');
    let isValid = true;
    let message = '';
    
    if (input.type === 'email' && input.value) {
        if (!validateEmail(input.value)) {
            isValid = false;
            message = 'E-mail inválido';
        }
    }
    
    if (input.required && !input.value.trim()) {
        isValid = false;
        message = 'Este campo é obrigatório';
    }
    
    if (isValid) {
        formGroup.classList.remove('invalid');
        formGroup.classList.add('valid');
    } else {
        formGroup.classList.remove('valid');
        formGroup.classList.add('invalid');
        showFieldError(input, message);
    }
    
    return isValid;
}

// Mostrar erro no campo
function showFieldError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorElement = formGroup.querySelector('.error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.style.cssText = `
            color: #dc2626;
            font-size: 0.8em;
            margin-top: 4px;
        `;
        formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

// Limpar erro do campo
function clearFieldError(input) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('invalid');
    
    const errorElement = formGroup.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = '';
    }
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Criar container se não existir
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }
    
    // Estilos do toast
    toast.style.cssText = `
        background: ${type === 'success' ? '#A7C0BE' : type === 'error' ? '#dc2626' : '#4D6772'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    container.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover toast após 4 segundos1
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}
