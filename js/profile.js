// 🦟👀
// Configurações da API
const API_BASE_URL = 'https://deploy-back-end-chi.vercel.app/api';
let currentUser = null;
let viewingUserId = null;
let isOwnProfile = false;

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se usuário está logado
    currentUser = getCurrentUser();
    
    // Verificar se está visualizando perfil de outro usuário
    const urlParams = new URLSearchParams(window.location.search);
    viewingUserId = urlParams.get('user');
    
    if (viewingUserId) {
        // Visualizando perfil de outro usuário
        isOwnProfile = currentUser && currentUser.id == viewingUserId;
        loadUserProfile(viewingUserId);
    } else {
        // Visualizando próprio perfil - precisa estar logado
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
        isOwnProfile = true;
        viewingUserId = currentUser.id;
        loadProfileInfo();
    }
    
    setupEventListeners();
});

// Carregar perfil de outro usuário
async function loadUserProfile(userId) {
    try {
        console.log(' Carregando perfil do usuário:', userId);
        
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            const user = result.data.user;
            const posts = result.data.posts;
            const stats = result.data.stats;
            
            console.log(' Perfil carregado:', user);
            
            // Atualizar elementos da página
            updateProfileElements(user, stats);
            
            // Carregar posts do usuário
            displayUserPosts(posts);
            
            // Esconder/mostrar botões de edição baseado se é próprio perfil
            toggleEditButtons(isOwnProfile);
            
        } else {
            console.error(' Erro ao carregar perfil:', result.message);
            showToast('Usuário não encontrado', 'error');
            setTimeout(() => {
                window.location.href = '/feed';
            }, 2000);
        }
        
    } catch (error) {
        console.error(' Erro ao carregar perfil:', error);
        showToast('Erro ao carregar perfil', 'error');
    }
}

// Atualizar elementos do perfil
function updateProfileElements(user, stats) {
    document.getElementById('profileName').textContent = user.nome || 'Nome não informado';
    document.getElementById('profileEmail').textContent = user.email || 'Email não informado';
    document.getElementById('profileDescription').textContent = user.descricao || 'Descrição não informada';
    document.getElementById('aboutName').textContent = user.nome || 'Nome não informado';
    document.getElementById('aboutEmail').textContent = user.email || 'Email não informado';
    document.getElementById('companyDescription').textContent = user.descricao || 'Descrição não informada';
    
    // Carregar foto de perfil se existir
    if (user.foto_perfil_url) {
        document.getElementById('profileAvatar').src = user.foto_perfil_url;
    } else if (user.foto_perfil) {
        document.getElementById('profileAvatar').src = user.foto_perfil;
    }
    
    // Atualizar data de criação
    if (user.data_criacao) {
        const memberSince = new Date(user.data_criacao).toLocaleDateString('pt-BR');
        document.getElementById('memberSince').textContent = memberSince;
    }
    
    // Atualizar estatísticas se existir elemento
    const totalPostsElement = document.getElementById('totalPosts');
    if (totalPostsElement && stats) {
        totalPostsElement.textContent = stats.total_posts || 0;
    }
}

// Mostrar/esconder botões de edição
function toggleEditButtons(showEdit) {
    const editButtons = document.querySelectorAll('.edit-btn, .upload-btn');
    editButtons.forEach(btn => {
        btn.style.display = showEdit ? 'inline-block' : 'none';
    });
    
    // Adicionar indicador se não é próprio perfil
    if (!showEdit) {
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader && !document.querySelector('.viewing-profile-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'viewing-profile-indicator';
            indicator.innerHTML = '<p>Visualizando perfil</p>';
            profileHeader.appendChild(indicator);
        }
    }
}

// Exibir posts do usuário
function displayUserPosts(posts) {
    const postsContainer = document.getElementById('userPostsContainer') || document.querySelector('.posts-container');
    
    if (!postsContainer) {
        console.warn('Container de posts não encontrado');
        return;
    }
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="no-posts">
                <p>${isOwnProfile ? 'Você ainda não fez nenhuma postagem' : 'Este usuário não fez postagens ainda'}</p>
            </div>
        `;
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <article class="post-card">
            <div class="post-content">
                ${escapeHtml(post.conteudo)}
            </div>
            
            ${post.imagem_url ? `
                <div class="post-image">
                    <img src="${post.imagem_url}" alt="Imagem do post">
                </div>
            ` : ''}
            
            <div class="post-meta">
                <div class="post-stats">
                    <span>❤️ ${post.curtidas || 0}</span>
                    <span>💬 ${post.comentarios || 0}</span>
                </div>
                <div class="post-date">
                    ${formatDate(post.created_at)}
                </div>
            </div>
        </article>
    `).join('');
}

// Carregar informações do perfil (próprio)
function loadProfileInfo() {
    if (!currentUser) return;
    
    // Atualizar elementos da página
    document.getElementById('profileName').textContent = currentUser.nome || 'Nome da empresa não informado';
    document.getElementById('profileEmail').textContent = currentUser.email || 'Email não informado';
    document.getElementById('profileDescription').textContent = currentUser.descricao || 'Descrição da empresa não informada';
    document.getElementById('aboutName').textContent = currentUser.nome || 'Nome da empresa não informado';
    document.getElementById('aboutEmail').textContent = currentUser.email || 'Email não informado';
    document.getElementById('companyDescription').textContent = currentUser.descricao || 'Descrição da empresa não informada';
    
    // Carregar foto de perfil se existir
    if (currentUser.foto_perfil_url) {
        document.getElementById('profileAvatar').src = currentUser.foto_perfil_url;
    } else if (currentUser.foto_perfil) {
        document.getElementById('profileAvatar').src = currentUser.foto_perfil;
    }
    
    // Definir data de criação (simulada)
    const memberSince = new Date().toLocaleDateString('pt-BR');
    document.getElementById('memberSince').textContent = memberSince;
    
    // Carregar posts do usuário
    loadUserPosts();
}

// Configurar event listeners
function setupEventListeners() {
    // Formulário de edição
    const editForm = document.getElementById('editProfileForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditProfile);
    }
    
    // Botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Upload de avatar
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
}

// Carregar posts do usuário
async function loadUserPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/feed`);
        const data = await response.json();
        
        if (data.success) {
            // Filtrar posts do usuário atual
            const userPosts = data.data.filter(post => post.usuario_id === currentUser.id);
            renderUserPosts(userPosts);
            updateStats(userPosts);
        }
    } catch (error) {
        console.error('Erro ao carregar posts:', error);
    }
}

// Renderizar posts do usuário
function renderUserPosts(posts) {
    const postsContainer = document.getElementById('userPosts');
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="no-posts">
                <p>Você ainda não fez nenhuma postagem.</p>
                <a href="feed.html" class="btn btn-primary">Criar primeira postagem</a>
            </div>
        `;
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-content">
                <p>${escapeHtml(post.conteudo)}</p>
            </div>
            <div class="post-stats">
                <span>❤️ ${post.curtidas || 0}</span>
                <span>💬 ${post.comentarios_lista ? post.comentarios_lista.length : 0}</span>
                <span>📅 ${formatDate(post.created_at)}</span>
            </div>
        </div>
    `).join('');
}

// Atualizar estatísticas
function updateStats(posts) {
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + (post.curtidas || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comentarios_lista ? post.comentarios_lista.length : 0), 0);
    
    document.getElementById('postsCount').textContent = totalPosts;
    document.getElementById('likesCount').textContent = totalLikes;
    document.getElementById('commentsCount').textContent = totalComments;
    document.getElementById('totalPosts').textContent = totalPosts;
    document.getElementById('totalLikes').textContent = totalLikes;
    document.getElementById('totalComments').textContent = totalComments;
    
    // Post mais curtido
    if (posts.length > 0) {
        const mostLiked = posts.reduce((max, post) => 
            (post.curtidas || 0) > (max.curtidas || 0) ? post : max
        );
        const preview = mostLiked.conteudo.substring(0, 50) + (mostLiked.conteudo.length > 50 ? '...' : '');
        document.getElementById('mostLikedPost').textContent = `"${preview}" (${mostLiked.curtidas || 0} curtidas)`;
    }
}

// Mostrar tab
function showTab(tabName) {
    // Remover classe ativa de todos os botões e conteúdos
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adicionar classe ativa ao botão e conteúdo selecionado
    document.querySelector(`button[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Abrir modal de edição
function editProfile() {
    const modal = document.getElementById('editProfileModal');
    const nameInput = document.getElementById('editName');
    const emailInput = document.getElementById('editEmail');
    const descriptionInput = document.getElementById('editDescription');
    
    // Preencher campos com dados atuais
    nameInput.value = currentUser.nome || '';
    emailInput.value = currentUser.email || '';
    descriptionInput.value = currentUser.descricao || '';
    
    // Limpar campos de senha
    document.getElementById('editPassword').value = '';
    document.getElementById('editConfirmPassword').value = '';
    
    modal.style.display = 'block';
}

// Fechar modal de edição
function closeEditProfile() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// Processar edição do perfil
async function handleEditProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const description = form.description.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    
    // Validações
    if (!name || !email) {
        showToast('Nome e email são obrigatórios', 'error');
        return;
    }
    
    if (password && password !== confirmPassword) {
        showToast('As senhas não coincidem', 'error');
        return;
    }
    
    if (password && password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    try {
        // Dados para atualizar
        const updateData = {
            usuario_id: currentUser.id,
            nome: name,
            email: email,
            descricao: description
        };
        
        // Adicionar senha se foi fornecida
        if (password) {
            updateData.senha = password;
        }
        
        const response = await fetch(`${API_BASE_URL}/users/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Atualizar dados do usuário local
            currentUser.nome = name;
            currentUser.email = email;
            currentUser.descricao = description;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Atualizar interface
            loadProfileInfo();
            closeEditProfile();
            showToast('Perfil atualizado com sucesso!', 'success');
        } else {
            showToast(result.message || 'Erro ao atualizar perfil', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Toggle senha no modal
function toggleModalPassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');
    
    if (input && button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
            button.setAttribute('title', 'Ocultar senha');
        } else {
            input.type = 'password';
            button.textContent = '👁️';
            button.setAttribute('title', 'Mostrar senha');
        }
    }
}

// Logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userToken');
        showToast('Logout realizado com sucesso!', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
    }
}

// Utilitários
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
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
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
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

// Expor funções globalmente
window.showTab = showTab;
window.editProfile = editProfile;
window.closeEditProfile = closeEditProfile;
window.logout = logout;
window.toggleModalPassword = toggleModalPassword;

// Funções para upload de avatar
function changeProfilePhoto() {
    document.getElementById('avatarInput').click();
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }
    
    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('A imagem deve ter no máximo 2MB', 'error');
        return;
    }
    
    try {
        // Preparar FormData
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('usuario_id', currentUser.id);
        
        const response = await fetch(`${API_BASE_URL}/users/upload-avatar`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Atualizar foto de perfil - priorizar foto_perfil_url
            const fotoUrl = result.data.foto_perfil_url || result.data.foto_perfil;
            if (fotoUrl) {
                currentUser.foto_perfil = fotoUrl;
                currentUser.foto_perfil_url = fotoUrl;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Atualizar interface
                document.getElementById('profileAvatar').src = fotoUrl;
            }
            showToast('Foto de perfil atualizada com sucesso!', 'success');
        } else {
            showToast(result.message || 'Erro ao fazer upload da foto', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer upload da foto:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Funções auxiliares
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString('pt-BR');
}

function showToast(message, type = 'info') {
    // Criar container se não existir
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }
    
    // Criar toast1
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
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
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
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

window.changeProfilePhoto = changeProfilePhoto;
