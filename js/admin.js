// Painel Administrativo NetworkUp
// Configurações da API
const API_BASE_URL = 'https://deploy-back-end-chi.vercel.app/api';

// Email do administrador autorizado
const ADMIN_EMAIL = 'guilherme@networkup.com.br';

let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let allUsers = [];
let confirmCallback = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Painel Admin carregando...');
    
    // Verificar se usuário está logado e é admin
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        console.log('Usuário não logado');
        showToast('Você precisa estar logado para acessar esta página', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return;
    }
    
    // Verificar se é o admin autorizado
    if (currentUser.email !== ADMIN_EMAIL) {
        console.log('Usuário não autorizado:', currentUser.email);
        showToast('Você não tem permissão para acessar o painel administrativo', 'error');
        setTimeout(() => {
            window.location.href = '/feed';
        }, 2000);
        return;
    }
    
    console.log('Admin autorizado:', currentUser.nome);
    
    // Configurar interface
    setupAdminInterface();
    setupNavigation();
    setupModals();
    setupSearch();
    setupPagination();
    
    // Carregar dados iniciais
    loadDashboardStats();
    loadUsers();
    
    console.log('Painel Admin inicializado!');
});

// Obter usuário atual do localStorage
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

// Configurar interface do admin
function setupAdminInterface() {
    const adminName = document.getElementById('admin-name');
    if (adminName) {
        adminName.textContent = `Olá, ${currentUser.nome}`;
    }
    
    // Configurar logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Configurar navegação entre seções
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover active de todos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Adicionar active ao clicado
            this.classList.add('active');
            
            // Mostrar seção correspondente
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

// Mostrar seção específica
function showSection(sectionName) {
    const sections = document.querySelectorAll('.content-section');
    
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Carregar dados específicos da seção
        if (sectionName === 'dashboard') {
            loadDashboardStats();
        } else if (sectionName === 'users') {
            loadUsers();
        } else if (sectionName === 'posts') {
            loadRecentPosts();
        }
    }
}

// Configurar modais
function setupModals() {
    // Modal de detalhes do usuário
    const userModal = document.getElementById('user-modal');
    const closeBtn = userModal?.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            userModal.classList.remove('show');
        });
    }
    
    // Modal de confirmação
    const confirmModal = document.getElementById('confirm-modal');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');
    
    if (confirmYes) {
        confirmYes.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            confirmModal.classList.remove('show');
        });
    }
    
    if (confirmNo) {
        confirmNo.addEventListener('click', () => {
            confirmModal.classList.remove('show');
            confirmCallback = null;
        });
    }
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userModal.classList.remove('show');
        }
        if (e.target === confirmModal) {
            confirmModal.classList.remove('show');
            confirmCallback = null;
        }
    });
}

// Configurar busca de usuários
function setupSearch() {
    const searchInput = document.getElementById('search-users');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput?.value.trim();
            searchUsers(query);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchUsers(searchInput.value.trim());
            }
        });
    }
}

// Configurar paginação
function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderUsersTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderUsersTable();
            }
        });
    }
}

// Carregar estatísticas do dashboard
async function loadDashboardStats() {
    try {
        console.log('📊 Carregando estatísticas...');
        
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            document.getElementById('total-users').textContent = stats.total_usuarios || 0;
            document.getElementById('active-users').textContent = stats.usuarios_ativos || 0;
            document.getElementById('banned-users').textContent = stats.usuarios_banidos || 0;
            document.getElementById('total-posts').textContent = stats.total_postagens || 0;
            document.getElementById('total-comments').textContent = stats.total_comentarios || 0;
            document.getElementById('total-likes').textContent = stats.total_curtidas || 0;
            
            console.log('Estatísticas carregadas');
        } else {
            console.log('Erro ao carregar estatísticas:', data.message);
            // Tentar calcular manualmente se a rota não existir
            await loadStatsManually();
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Tentar calcular manualmente
        await loadStatsManually();
    }
}

// Carregar estatísticas manualmente (fallback)
async function loadStatsManually() {
    try {
        // Carregar usuários para contar
        const usersResponse = await fetch(`${API_BASE_URL}/users`);
        const usersData = await usersResponse.json();
        
        if (usersData.success) {
            const users = usersData.data || [];
            document.getElementById('total-users').textContent = users.length;
            document.getElementById('active-users').textContent = users.filter(u => u.status !== 'banido').length;
            document.getElementById('banned-users').textContent = users.filter(u => u.status === 'banido').length;
        }
        
        // Carregar posts para contar
        const postsResponse = await fetch(`${API_BASE_URL}/posts/feed`);
        const postsData = await postsResponse.json();
        
        if (postsData.success) {
            const posts = postsData.data || [];
            document.getElementById('total-posts').textContent = posts.length;
            
            let totalComments = 0;
            let totalLikes = 0;
            
            posts.forEach(post => {
                totalLikes += post.curtidas || 0;
                totalComments += (post.comentarios_lista?.length || 0);
            });
            
            document.getElementById('total-comments').textContent = totalComments;
            document.getElementById('total-likes').textContent = totalLikes;
        }
        
        console.log('Estatísticas calculadas manualmente');
    } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
    }
}

// Carregar lista de usuários
async function loadUsers() {
    const usersList = document.getElementById('users-list');
    
    try {
        console.log('Carregando usuários...');
        
        const response = await fetch(`${API_BASE_URL}/users`);
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.data || [];
            console.log('Usuários carregados:', allUsers.length);
            renderUsersTable();
        } else {
            console.log('Erro ao carregar usuários:', data.message);
            usersList.innerHTML = '<tr><td colspan="8" class="loading">Erro ao carregar usuários</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        usersList.innerHTML = '<tr><td colspan="8" class="loading">Erro de conexão</td></tr>';
    }
}

// Buscar usuários
function searchUsers(query) {
    if (!query) {
        renderUsersTable();
        return;
    }
    
    const filteredUsers = allUsers.filter(user => {
        const nome = (user.nome || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const searchTerm = query.toLowerCase();
        
        return nome.includes(searchTerm) || email.includes(searchTerm);
    });
    
    renderUsersTable(filteredUsers);
}

// Renderizar tabela de usuários
function renderUsersTable(users = null) {
    const usersList = document.getElementById('users-list');
    const usersToRender = users || allUsers;
    
    const pageSize = 10;
    totalPages = Math.ceil(usersToRender.length / pageSize);
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = usersToRender.slice(startIndex, endIndex);
    
    if (paginatedUsers.length === 0) {
        usersList.innerHTML = '<tr><td colspan="8" class="loading">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    usersList.innerHTML = paginatedUsers.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.nome || 'N/A')}</td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td><span class="status-badge role-${user.role || 'user'}">${user.role || 'user'}</span></td>
            <td><span class="status-badge status-${user.status || 'ativo'}">${user.status || 'ativo'}</span></td>
            <td>${user.total_posts || 0}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <button class="btn-primary btn-small" onclick="viewUserDetails(${user.id})">Ver</button>
                ${user.status === 'banido' ? 
                    `<button class="btn-success btn-small" onclick="unbanUser(${user.id})">Desbanir</button>` :
                    `<button class="btn-danger btn-small" onclick="banUser(${user.id})">Banir</button>`
                }
            </td>
        </tr>
    `).join('');
    
    // Atualizar paginação
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// Ver detalhes do usuário
async function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) {
        showToast('Usuário não encontrado', 'error');
        return;
    }
    
    const userDetails = document.getElementById('user-details');
    const modal = document.getElementById('user-modal');
    
    userDetails.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">ID:</span>
            <span class="detail-value">${user.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Nome:</span>
            <span class="detail-value">${escapeHtml(user.nome || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">${escapeHtml(user.email || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Telefone:</span>
            <span class="detail-value">${escapeHtml(user.telefone || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Cargo/Profissão:</span>
            <span class="detail-value">${escapeHtml(user.cargo || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Empresa:</span>
            <span class="detail-value">${escapeHtml(user.empresa || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Localização:</span>
            <span class="detail-value">${escapeHtml(user.localizacao || 'N/A')}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value"><span class="status-badge status-${user.status || 'ativo'}">${user.status || 'ativo'}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Role:</span>
            <span class="detail-value"><span class="status-badge role-${user.role || 'user'}">${user.role || 'user'}</span></span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Total de Posts:</span>
            <span class="detail-value">${user.total_posts || 0}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Data de Criação:</span>
            <span class="detail-value">${formatDateFull(user.created_at)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Última Atualização:</span>
            <span class="detail-value">${formatDateFull(user.updated_at)}</span>
        </div>
    `;
    
    modal.classList.add('show');
}

// Banir usuário
async function banUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) {
        showToast('Usuário não encontrado', 'error');
        return;
    }
    
    // Não permitir banir o próprio admin
    if (user.email === ADMIN_EMAIL) {
        showToast('Você não pode banir a si mesmo', 'error');
        return;
    }
    
    showConfirmModal(`Tem certeza que deseja banir o usuário "${user.nome}"?`, async () => {
        try {
            console.log('Banindo usuário:', userId);
            
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    admin_id: currentUser.id,
                    status: 'banido'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Usuário banido com sucesso!', 'success');
                loadUsers();
                loadDashboardStats();
            } else {
                // Fallback: tentar endpoint alternativo
                await banUserFallback(userId);
            }
        } catch (error) {
            console.error('Erro ao banir usuário:', error);
            await banUserFallback(userId);
        }
    });
}

// Fallback para banir usuário
async function banUserFallback(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'banido'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Usuário banido com sucesso!', 'success');
            loadUsers();
            loadDashboardStats();
        } else {
            showToast(data.message || 'Erro ao banir usuário', 'error');
        }
    } catch (error) {
        console.error('Erro no fallback:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Desbanir usuário
async function unbanUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) {
        showToast('Usuário não encontrado', 'error');
        return;
    }
    
    showConfirmModal(`Tem certeza que deseja desbanir o usuário "${user.nome}"?`, async () => {
        try {
            console.log('Desbanindo usuário:', userId);
            
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    admin_id: currentUser.id,
                    status: 'ativo'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Usuário desbanido com sucesso!', 'success');
                loadUsers();
                loadDashboardStats();
            } else {
                // Fallback
                await unbanUserFallback(userId);
            }
        } catch (error) {
            console.error('Erro ao desbanir usuário:', error);
            await unbanUserFallback(userId);
        }
    });
}

// Fallback para desbanir usuário
async function unbanUserFallback(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'ativo'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Usuário desbanido com sucesso!', 'success');
            loadUsers();
            loadDashboardStats();
        } else {
            showToast(data.message || 'Erro ao desbanir usuário', 'error');
        }
    } catch (error) {
        console.error('Erro no fallback:', error);
        showToast('Erro de conexão', 'error');
    }
}

// Carregar posts recentes
async function loadRecentPosts() {
    const postsList = document.getElementById('posts-list');
    
    try {
        console.log('Carregando posts recentes...');
        
        const response = await fetch(`${API_BASE_URL}/posts/feed`);
        const data = await response.json();
        
        if (data.success) {
            const posts = data.data || [];
            console.log('Posts carregados:', posts.length);
            renderPosts(posts.slice(0, 20)); // Mostrar últimos 20 posts
        } else {
            console.log('Erro ao carregar posts:', data.message);
            postsList.innerHTML = '<p class="loading">Erro ao carregar postagens</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar posts:', error);
        postsList.innerHTML = '<p class="loading">Erro de conexão</p>';
    }
}

// Renderizar posts
function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    
    if (posts.length === 0) {
        postsList.innerHTML = '<p class="loading">Nenhuma postagem encontrada</p>';
        return;
    }
    
    postsList.innerHTML = posts.map(post => `
        <div class="post-card-admin">
            <div class="post-header-admin">
                <div class="post-author-admin">
                    <div class="post-author-avatar">
                        ${post.foto_perfil_url ? 
                            `<img src="${post.foto_perfil_url}" alt="${post.usuario_nome}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
                            `${(post.usuario_nome || 'U').charAt(0).toUpperCase()}`
                        }
                    </div>
                    <div class="post-author-info">
                        <h4>${escapeHtml(post.usuario_nome || 'Usuário')}</h4>
                        <p>${formatDate(post.created_at)}</p>
                    </div>
                </div>
            </div>
            <div class="post-content-admin">
                ${escapeHtml(post.conteudo || '')}
            </div>
            ${post.imagem_url ? `<img src="${post.imagem_url}" alt="Imagem do post" style="max-width: 100%; border-radius: 8px; margin-bottom: 1rem;">` : ''}
            <div class="post-stats-admin">
                <span><i class="bi bi-heart-fill"></i> ${post.curtidas || 0} curtidas</span>
                <span><i class="bi bi-chat-left-text-fill"></i> ${post.comentarios_lista?.length || 0} comentários</span>
            </div>
            <div class="post-actions-admin">
                <button class="btn-danger btn-small" onclick="deletePost(${post.id})">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Deletar post
async function deletePost(postId) {
    showConfirmModal('Tem certeza que deseja excluir esta postagem?', async () => {
        try {
            console.log('Deletando post:', postId);
            
            const response = await fetch(`${API_BASE_URL}/posts/deletar/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario_id: currentUser.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Postagem excluída com sucesso!', 'success');
                loadRecentPosts();
                loadDashboardStats();
            } else {
                showToast(data.message || 'Erro ao excluir postagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao deletar post:', error);
            showToast('Erro de conexão', 'error');
        }
    });
}

// Mostrar modal de confirmação
function showConfirmModal(message, callback) {
    const modal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    
    confirmMessage.textContent = message;
    confirmCallback = callback;
    modal.classList.add('show');
}

// Logout
function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userToken');
    
    showToast('Logout realizado com sucesso!', 'success');
    
    setTimeout(() => {
        window.location.href = '/home';
    }, 1000);
}

// Utilitários
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    
    return date.toLocaleDateString('pt-BR');
}

function formatDateFull(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
window.viewUserDetails = viewUserDetails;
window.banUser = banUser;
window.unbanUser = unbanUser;
window.deletePost = deletePost;
