// FEED CORRIGIDO (avatar Google/LinkedIn)
// - Só usa URL real (http/https/data/blob) como foto.
// - Não promove public_id (Cloudinary) para foto_perfil_url.
// - Mantém o restante do comportamento original.

// Configurações da API
const API_BASE_URL = 'https://deploy-back-end-chi.vercel.app/api';
let currentUser = null;

function isLikelyUrl(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    return (
        v.startsWith('https://') ||
        v.startsWith('http://') ||
        v.startsWith('//') ||
        v.startsWith('data:image/') ||
        v.startsWith('blob:')
    );
}

function normalizeUrl(value) {
    if (typeof value !== 'string') return '';
    const v = value.trim();
    if (!v) return '';

    if (v.startsWith('http://')) return `https://${v.slice('http://'.length)}`;
    if (v.startsWith('//')) return `https:${v}`;
    return v;
}

function pickPhotoUrl(obj) {
    if (!obj) return '';

    // Ordem: primeiro campos já “url”, depois equivalentes de providers.
    const candidates = [
        obj.foto_perfil_url,
        obj.foto_perfil,
        obj.foto_perfilUrl,
        obj.fotoPerfil,
        obj.avatar_url,
        obj.avatarUrl,
        obj.avatar,
        obj.picture,
        obj.pictureUrl,
        obj.profile_picture,
        obj.profilePicture,
        obj.photo,
        obj.photoUrl,
        obj.imagem_url,
        obj.imagemUrl,
        obj.imagem
    ];

    for (const c of candidates) {
        if (typeof c !== 'string') continue;
        const trimmed = c.trim();
        if (!trimmed) continue;
        if (!isLikelyUrl(trimmed)) continue;
        return normalizeUrl(trimmed);
    }

    return '';
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Feed carregando...');

    // Verificar se veio do login OAuth (Google/LinkedIn)
    const urlParams = new URLSearchParams(window.location.search);
    const authData = urlParams.get('auth');

    if (authData) {
        try {
            const persistUsuarioOnly = (usuario) => {
                if (!usuario) return;

                // Só aceita URL real (Google/LinkedIn normalmente vêm aqui)
                const photoUrl = pickPhotoUrl(usuario);
                if (photoUrl) {
                    // Mantém compatibilidade: preenche os dois campos com URL
                    usuario.foto_perfil = photoUrl;
                    usuario.foto_perfil_url = photoUrl;
                } else {
                    // Se não for URL, não inventa foto_perfil_url.
                    // Isso evita <img src="public_id"> quebrando e gerando warning.
                    if (usuario.foto_perfil_url && !isLikelyUrl(usuario.foto_perfil_url)) {
                        delete usuario.foto_perfil_url;
                    }
                }

                localStorage.setItem('currentUser', JSON.stringify(usuario));
                if (usuario.id != null) {
                    localStorage.setItem('userId', String(usuario.id));
                }
            };

            if (window.Auth?.decodeAuthQueryPayload) {
                const payload = window.Auth.decodeAuthQueryPayload(authData);
                const data = payload?.data || payload;
                const accessToken = data?.accessToken;
                const usuario = data?.usuario;
                const userId = usuario?.id;

                if (payload?.success && usuario) {
                    if (accessToken && userId && window.Auth?.setAuth) {
                        // Importante: setAuth precisa receber o usuário já normalizado
                        const cloned = { ...usuario };
                        const photoUrl = pickPhotoUrl(cloned);
                        if (photoUrl) {
                            cloned.foto_perfil = photoUrl;
                            cloned.foto_perfil_url = photoUrl;
                        } else if (cloned.foto_perfil_url && !isLikelyUrl(cloned.foto_perfil_url)) {
                            delete cloned.foto_perfil_url;
                        }

                        window.Auth.setAuth({ accessToken, userId, usuario: cloned });
                    } else {
                        persistUsuarioOnly(usuario);
                    }

                    window.history.replaceState({}, document.title, window.location.pathname);
                    console.log('Login OAuth realizado:', usuario);
                } else {
                    console.warn('OAuth recebido, mas payload inválido:', payload);
                }
            } else {
                // Fallback (legado)
                const userData = JSON.parse(atob(authData));
                if (userData.success && userData.data?.usuario) {
                    persistUsuarioOnly(userData.data.usuario);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    console.log('Login OAuth realizado (fallback):', userData.data.usuario);
                }
            }
        } catch (e) {
            console.error('Erro ao processar dados do OAuth:', e);
        }
    }

    // Verificar se usuário está logado (opcional)
    currentUser = getCurrentUser();

    if (currentUser) {
        console.log('Usuário logado detectado:', currentUser.nome, currentUser.email);
    } else {
        console.log('Usuário não logado - modo visitante');
    }

    // Configurar interface
    setupUserInterface();
    setupPostForm();
    setupUserMenu();

    loadFriendSuggestions();
    loadFeed();

    console.log('Feed inicializado!');
});

// Carregar sugestões de usuários cadastrados (sidebar)
async function loadFriendSuggestions() {
    const friendsList = document.getElementById('friendsList');
    const friendsLoading = document.getElementById('friendsLoading');
    const friendsEmpty = document.getElementById('friendsEmpty');

    if (!friendsList) return;

    const setLoading = (isLoading) => {
        if (friendsLoading) friendsLoading.style.display = isLoading ? 'block' : 'none';
    };

    const setEmpty = (isEmpty) => {
        if (friendsEmpty) friendsEmpty.style.display = isEmpty ? 'block' : 'none';
    };

    try {
        setLoading(true);
        setEmpty(false);
        friendsList.innerHTML = '';

        const response = await fetch(`${API_BASE_URL}/users`);
        const data = await response.json();

        if (!data || !data.success) {
            setLoading(false);
            setEmpty(true);
            return;
        }

        const users = Array.isArray(data.data) ? data.data : [];

        const filtered = users
            .filter(u => u && u.id)
            .filter(u => !currentUser || String(u.id) !== String(currentUser.id))
            .filter(u => (u.status || '').toLowerCase() !== 'banido');

        const shuffled = filtered
            .map(u => ({ u, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ u }) => u);

        const suggestions = shuffled.slice(0, 6);

        setLoading(false);

        if (suggestions.length === 0) {
            setEmpty(true);
            return;
        }

        setEmpty(false);
        friendsList.innerHTML = suggestions.map(u => renderFriendSuggestion(u)).join('');
    } catch (error) {
        console.error('Erro ao carregar sugestões de amigos:', error);
        if (friendsList) friendsList.innerHTML = '';
        setLoading(false);
        setEmpty(true);
    }
}

function renderFriendSuggestion(user) {
    const nome = (user.nome || 'Usuário').toString();
    const iniciais = nome.trim() ? nome.trim().charAt(0).toUpperCase() : 'U';
    const foto = pickPhotoUrl(user);

    const avatarHtml = foto
        ? `<img class="friend-avatar-img" src="${foto}" alt="Foto de ${escapeHtml(nome)}" onerror="this.remove();" />`
        : '';

    return `
        <button class="friend-item" type="button" onclick="openUserProfile(${user.id})" title="Ver perfil">
            <div class="friend-avatar" aria-hidden="true">${escapeHtml(iniciais)}${avatarHtml}</div>
            <div class="friend-meta">
                <div class="friend-name">${escapeHtml(nome)}</div>
                <div class="friend-sub">Ver perfil</div>
            </div>
        </button>
    `;
}

function setupUserInterface() {
    const loggedUserArea = document.getElementById('loggedUserArea');
    const guestUserArea = document.getElementById('guestUserArea');
    const headerUserName = document.getElementById('headerUserName');
    const headerUserEmail = document.getElementById('headerUserEmail');
    const createPostSection = document.getElementById('createPostSection');
    const guestMessageSection = document.getElementById('guestMessageSection');

    if (currentUser) {
        if (loggedUserArea) loggedUserArea.style.display = 'block';
        if (guestUserArea) guestUserArea.style.display = 'none';

        if (headerUserName) headerUserName.textContent = currentUser.nome;
        if (headerUserEmail) headerUserEmail.textContent = currentUser.email;

        const headerUserAvatar = document.getElementById('headerUserAvatar');
        if (headerUserAvatar) {
            const fotoUrl = pickPhotoUrl(currentUser);
            console.log('Tentando carregar foto de perfil:', fotoUrl || '(nenhuma)');

            if (fotoUrl) {
                headerUserAvatar.src = fotoUrl;
                headerUserAvatar.alt = `Foto de ${currentUser.nome}`;
                headerUserAvatar.onerror = function() {
                    console.warn('Erro ao carregar foto de perfil, usando padrão');
                    this.src = '../assets/imagens/Logo.png';
                    this.onerror = null;
                };
            } else {
                headerUserAvatar.src = '../assets/imagens/Logo.png';
                headerUserAvatar.alt = 'Avatar padrão';
            }
        }

        if (createPostSection) createPostSection.style.display = 'block';
        if (guestMessageSection) guestMessageSection.style.display = 'none';
    } else {
        if (loggedUserArea) loggedUserArea.style.display = 'none';
        if (guestUserArea) guestUserArea.style.display = 'block';

        if (createPostSection) createPostSection.style.display = 'none';
        if (guestMessageSection) guestMessageSection.style.display = 'block';
    }
}

function setupPostForm() {
    const createPostForm = document.getElementById('createPostForm');
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);

        const textarea = document.getElementById('postContent');
        if (textarea) {
            textarea.addEventListener('input', updateCharacterCount);
            updateCharacterCount();
        }

        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.addEventListener('change', handlePhotoSelect);
        }
    }
}

function setupUserMenu() {
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            window.location.href = '/profile';
        });
    }

    const chatBtn = document.getElementById('chatBtn');
    if (chatBtn) {
        chatBtn.addEventListener('click', function() {
            window.location.href = '/chat';
        });
    }

    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn && currentUser && currentUser.email === 'guilherme@networkup.com.br') {
        adminBtn.style.display = 'inline-flex';
        adminBtn.addEventListener('click', function() {
            window.location.href = '/admin';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (window.Auth?.clearAuth) {
                window.Auth.clearAuth();
            } else {
                localStorage.removeItem('currentUser');
            }
            sessionStorage.clear();

            showToast('Logout realizado com sucesso!', 'success');

            setTimeout(() => {
                window.location.href = '/home';
            }, 1000);
        });
    }
}

async function handleCreatePost(event) {
    event.preventDefault();

    const form = event.target;
    const content = form.content.value.trim();
    const photoInput = document.getElementById('photoInput');
    const submitButton = form.querySelector('button[type="submit"]');

    if (!content && !photoInput.files[0]) {
        showToast('Digite algo ou adicione uma foto para postar', 'error');
        return;
    }

    if (!currentUser) {
        showToast('Você precisa estar logado para postar', 'error');
        return;
    }

    setButtonLoading(submitButton, true);

    try {
        const formData = new FormData();
        formData.append('conteudo', content);

        if (photoInput.files[0]) {
            formData.append('photo', photoInput.files[0]);
        }

        const doAuthFetch = window.Auth?.authFetch;
        const response = doAuthFetch
            ? await doAuthFetch(`${API_BASE_URL}/posts/postar`, {
                method: 'POST',
                body: formData
            })
            : await fetch(`${API_BASE_URL}/posts/postar`, {
                method: 'POST',
                body: formData
            });

        const data = await response.json();

        if (data.success) {
            showToast('Postagem criada com sucesso!', 'success');
            form.reset();
            removePhoto();
            updateCharacterCount();
            loadFeed();
        } else {
            showToast(data.message || 'Erro ao criar postagem', 'error');
        }
    } catch (error) {
        console.error('Erro ao criar postagem:', error);
        showToast('Erro de conexão. Verifique se o servidor está rodando.', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

async function loadFeed() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    postsContainer.innerHTML = '<div class="loading"><p>Carregando postagens...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/posts/feed`);
        const data = await response.json();

        if (data.success) {
            renderPosts(data.data);
        } else {
            postsContainer.innerHTML = '<div class="loading"><p>Erro ao carregar postagens</p></div>';
        }
    } catch (error) {
        console.error('Erro ao carregar feed:', error);
        postsContainer.innerHTML = '<div class="loading"><p>Erro de conexão</p></div>';
    }
}

function renderPosts(posts) {
    const postsContainer = document.getElementById('postsContainer');

    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="loading">
                <p>Nenhuma postagem encontrada</p>
                <p>Seja o primeiro a compartilhar algo!</p>
            </div>
        `;
        return;
    }

    postsContainer.innerHTML = posts.map(post => {
        const postAvatarUrl = pickPhotoUrl({ foto_perfil_url: post.foto_perfil_url, foto_perfil: post.foto_perfil });

        return `
        <article class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="user-avatar" onclick="openUserProfile(${post.usuario_id})">
                    ${postAvatarUrl ?
                        `<img src="${postAvatarUrl}" alt="Foto de ${escapeHtml(post.usuario_nome || 'Usuário')}" onerror="this.remove();" />` :
                        `<div class="avatar-placeholder">${post.usuario_nome ? escapeHtml(post.usuario_nome.charAt(0).toUpperCase()) : 'U'}</div>`
                    }
                </div>
                <div class="user-info">
                    <h3 onclick="openUserProfile(${post.usuario_id})" class="clickable-username">${escapeHtml(post.usuario_nome || 'Usuário')}</h3>
                    <div class="post-time">${formatDate(post.created_at)}</div>
                </div>
                ${canDeletePost(post) ? `
                    <div class="post-menu">
                        <button class="delete-btn" onclick="deletePost(${post.id})" title="Deletar postagem">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="post-content">
                ${escapeHtml(post.conteudo)}
            </div>

            ${post.imagem_url ? `
                <div class="post-image">
                    <img src="${post.imagem_url}" alt="Imagem do post" onclick="openImageModal('${post.imagem_url}')" loading="lazy">
                </div>
            ` : ''}

            <div class="post-actions">
                <button class="action-btn like-btn" onclick="toggleLike(${post.id})" ${!currentUser ? 'disabled title="Faça login para curtir"' : ''}>
                    <i class="bi bi-heart-fill"></i> <span>${post.curtidas || 0}</span>
                </button>
                <button class="action-btn comment-btn" onclick="toggleComments(${post.id})">
                    <i class="bi bi-chat-left-text-fill"></i> <span>${post.comentarios_lista ? post.comentarios_lista.length : 0}</span>
                </button>
                <button class="action-btn share-btn" onclick="sharePost(${post.id})">
                    <i class="bi bi-share-fill"></i> Compartilhar
                </button>
            </div>

            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                ${renderComments(post.comentarios_lista || [])}

                ${currentUser ? `
                    <form class="comment-form" onsubmit="handleAddComment(event, ${post.id})">
                        <input type="text" placeholder="Adicione um comentário..." required>
                        <button type="submit">Enviar</button>
                    </form>
                ` : `
                    <div class="guest-comment-message">
                        <p>Para comentar, <a href="login.html">faça login</a> ou <a href="cadastro.html">crie uma conta</a>.</p>
                    </div>
                `}
            </div>
        </article>
        `;
    }).join('');

    if (!document.getElementById('imageModal')) {
        addImageModal();
    }
}

function renderComments(comments) {
    if (!comments || comments.length === 0) {
        return '<p class="no-comments">Nenhum comentário ainda</p>';
    }

    return comments.map(comment => {
        const commentAvatarUrl = pickPhotoUrl({ foto_perfil_url: comment.foto_perfil_url, foto_perfil: comment.foto_perfil });

        return `
        <div class="comment">
            <div class="comment-avatar" onclick="openUserProfile(${comment.usuario_id})">
                ${commentAvatarUrl ?
                    `<img src="${commentAvatarUrl}" alt="Foto de ${escapeHtml(comment.usuario_nome || 'Usuário')}" onerror="this.remove();" />` :
                    `<div class="avatar-placeholder">${comment.usuario_nome ? escapeHtml(comment.usuario_nome.charAt(0).toUpperCase()) : 'U'}</div>`
                }
            </div>
            <div class="comment-content">
                <div class="comment-author" onclick="openUserProfile(${comment.usuario_id})">${escapeHtml(comment.usuario_nome || 'Usuário')}</div>
                <div class="comment-text">${escapeHtml(comment.conteudo)}</div>
                <div class="comment-time">${formatDate(comment.created_at)}</div>
            </div>
        </div>
        `;
    }).join('');
}

async function toggleLike(postId) {
    if (!currentUser) {
        showToast('Você precisa estar logado para curtir', 'error');
        return;
    }

    try {
        if (!window.Auth?.authFetch) {
            showToast('Atualize a página (Auth helper não carregou).', 'error');
            return;
        }

        const response = await window.Auth.authFetch(`${API_BASE_URL}/posts/curtir`, {
            method: 'POST',
            body: JSON.stringify({ postagem_id: postId })
        });

        const data = await response.json();

        if (data.success) {
            const likeBtn = document.querySelector(`[data-post-id="${postId}"] .like-btn`);
            const likeCount = likeBtn.querySelector('span');

            if (data.data.acao === 'curtiu') {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }

            likeCount.textContent = data.data.total_curtidas;
        } else {
            showToast(data.message || 'Erro ao curtir postagem', 'error');
        }
    } catch (error) {
        console.error('Erro ao curtir postagem:', error);
        showToast('Erro de conexão', 'error');
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (commentsSection) {
        commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
    }
}

async function handleAddComment(event, postId) {
    event.preventDefault();

    if (!currentUser) {
        showToast('Você precisa estar logado para comentar', 'error');
        return;
    }

    const form = event.target;
    const input = form.querySelector('input');
    const content = input.value.trim();

    if (!content) {
        showToast('Digite um comentário', 'error');
        return;
    }

    try {
        if (!window.Auth?.authFetch) {
            showToast('Atualize a página (Auth helper não carregou).', 'error');
            return;
        }

        const response = await window.Auth.authFetch(`${API_BASE_URL}/posts/comentar`, {
            method: 'POST',
            body: JSON.stringify({ postagem_id: postId, conteudo: content })
        });

        const data = await response.json();

        if (data.success) {
            form.reset();
            loadFeed();
            showToast('Comentário adicionado!', 'success');
        } else {
            showToast(data.message || 'Erro ao adicionar comentário', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        showToast('Erro de conexão', 'error');
    }
}

function sharePost(postId) {
    if (navigator.share) {
        navigator.share({
            title: 'NetworkUp - Postagem',
            text: 'Confira esta postagem no NetworkUp!',
            url: window.location.href
        });
    } else {
        showToast('Link copiado para área de transferência!', 'success');
    }
}

function canDeletePost(post) {
    if (!currentUser) return false;
    const isOwner = post.usuario_id === currentUser.id;
    const isAdmin = currentUser.email === 'admin@networkup.com' || currentUser.email === 'teste@teste.com';
    return isOwner || isAdmin;
}

async function deletePost(postId) {
    if (!currentUser) {
        showToast('Você precisa estar logado para deletar posts', 'error');
        return;
    }

    if (!confirm('Tem certeza que deseja deletar esta postagem? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        if (!window.Auth?.authFetch) {
            showToast('Atualize a página (Auth helper não carregou).', 'error');
            return;
        }

        const response = await window.Auth.authFetch(`${API_BASE_URL}/posts/deletar/${postId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showToast('Postagem deletada com sucesso!', 'success');
            loadFeed();
        } else {
            showToast(data.message || 'Erro ao deletar postagem', 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar postagem:', error);
        showToast('Erro de conexão', 'error');
    }
}

function updateCharacterCount() {
    const textarea = document.getElementById('postContent');
    const counter = document.querySelector('.character-count');

    if (textarea && counter) {
        const count = textarea.value.length;
        const max = textarea.getAttribute('maxlength') || 500;
        counter.textContent = `${count}/${max}`;

        if (count > max * 0.9) {
            counter.style.color = '#dc2626';
        } else {
            counter.style.color = '#9CA0A1';
        }
    }
}

function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            console.log('Usuário carregado do localStorage:', user.nome);
            console.log('Foto de perfil disponível:', pickPhotoUrl(user) || 'nenhuma');
            return user;
        }
        return null;
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

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;

    return date.toLocaleDateString('pt-BR');
}

function setButtonLoading(button, loading = true) {
    if (!button) return;

    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
        button.textContent = 'Postando...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.textContent = 'Postar';
    }
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
        background: ${type === 'success' ? 'var(--toast-success)' : type === 'error' ? 'var(--toast-error)' : 'var(--toast-info)'};
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
window.toggleLike = toggleLike;
window.toggleComments = toggleComments;
window.handleAddComment = handleAddComment;
window.sharePost = sharePost;
window.deletePost = deletePost;
window.openUserProfile = openUserProfile;

function openUserProfile(userId) {
    if (!userId) {
        console.error('ID do usuário não fornecido');
        return;
    }

    if (currentUser && currentUser.id == userId) {
        window.location.href = '/profile';
    } else {
        window.location.href = `/user-profile?user=${userId}`;
    }
}

function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('A imagem deve ter no máximo 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');

        previewImage.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const photoInput = document.getElementById('photoInput');
    const preview = document.getElementById('photoPreview');

    photoInput.value = '';
    preview.style.display = 'none';
}

function addImageModal() {
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <span class="close-modal" onclick="closeImageModal()">&times;</span>
        <div class="image-modal-content">
            <img id="modalImage" src="" alt="Imagem ampliada">
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeImageModal();
        }
    });
}

function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');

    modalImage.src = imageSrc;
    modal.style.display = 'block';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
}

window.removePhoto = removePhoto;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
