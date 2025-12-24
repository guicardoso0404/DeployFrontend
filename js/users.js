// 🦟👀
const API_BASE_URL = 'https://deploy-back-end-chi.vercel.app/api';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function getInitials(name) {
    const safe = (name || '').toString().trim();
    return safe ? safe.charAt(0).toUpperCase() : 'U';
}

function renderUserCard(user) {
    const nome = (user.nome || 'Usuário').toString();
    const iniciais = getInitials(nome);
    const foto = user.foto_perfil_url || user.foto_perfil || '';

    const avatar = foto
        ? `<img src="${foto}" alt="Foto de ${escapeHtml(nome)}" onerror="this.remove();" />`
        : `<span aria-hidden="true">${escapeHtml(iniciais)}</span>`;

    return `
        <div class="user-card post-card">
            <div class="user-left">
                <div class="user-avatar" aria-hidden="true">${avatar}</div>
                <div class="user-meta">
                    <div class="user-name">${escapeHtml(nome)}</div>
                    <div class="user-sub">Ver perfil</div>
                </div>
            </div>
            <button class="user-action" type="button" onclick="openUserProfile(${user.id})">
                <i class="bi bi-person"></i> Perfil
            </button>
        </div>
    `;
}

function openUserProfile(userId) {
    if (!userId) return;
    window.location.href = `/user-profile?user=${encodeURIComponent(userId)}`;
}

async function loadUsers() {
    const usersGrid = document.getElementById('usersGrid');
    const usersLoading = document.getElementById('usersLoading');
    const usersEmpty = document.getElementById('usersEmpty');
    const usersError = document.getElementById('usersError');

    const setLoading = (isLoading) => {
        if (usersLoading) usersLoading.style.display = isLoading ? 'block' : 'none';
    };
    const setEmpty = (isEmpty) => {
        if (usersEmpty) usersEmpty.style.display = isEmpty ? 'block' : 'none';
    };
    const setError = (message) => {
        if (!usersError) return;
        if (!message) {
            usersError.style.display = 'none';
            usersError.textContent = '';
            return;
        }
        usersError.style.display = 'block';
        usersError.textContent = message;
    };

    try {
        setError('');
        setEmpty(false);
        setLoading(true);
        if (usersGrid) usersGrid.innerHTML = '';

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
            .filter(u => (u.status || '').toLowerCase() !== 'banido');

        setLoading(false);

        if (filtered.length === 0) {
            setEmpty(true);
            return;
        }

        // Ordenar por nome pra ficar estável
        filtered.sort((a, b) => (a.nome || '').localeCompare((b.nome || ''), 'pt-BR'));

        if (usersGrid) {
            usersGrid.innerHTML = filtered.map(renderUserCard).join('');
        }
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
        setLoading(false);
        setEmpty(false);
        setError('Não foi possível carregar a lista de perfis agora.');
    }
}

window.openUserProfile = openUserProfile;

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});
