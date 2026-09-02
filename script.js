const API_BASE = window.JOGO_ALEX_API_BASE || 'http://localhost:4000';
const isHostedDemo = window.location.hostname !== 'localhost' && !window.JOGO_ALEX_API_BASE;
let appSession = null;
let authenticatedUser = null;
let authMode = 'login';

function formatCurrency(value) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function getDemoAccounts() {
  return JSON.parse(localStorage.getItem('jogo-alex-demo-accounts') || '[]');
}

function saveDemoAccounts(accounts) {
  localStorage.setItem('jogo-alex-demo-accounts', JSON.stringify(accounts));
}

function getDemoAdminUsers() {
  return [
    { name: 'Ana Demo', email: 'ana.demo@jogoalex.local', status: 'active', wallet: { balance: 1280.5 } },
    { name: 'Bruno Demo', email: 'bruno.demo@jogoalex.local', status: 'active', wallet: { balance: 745.25 } },
    { name: 'Carla Demo', email: 'carla.demo@jogoalex.local', status: 'pending', wallet: { balance: 0 } }
  ];
}

function openHostedAdminDemo() {
  if (!isHostedDemo) {
    window.alert('O painel demonstrativo está disponível apenas na apresentação hospedada.');
    return;
  }

  authenticatedUser = { name: 'Painel do investidor', email: 'admin.demo@jogoalex.local', role: 'admin', balance: 0 };
  localStorage.setItem('jogo-alex-demo-session', JSON.stringify(authenticatedUser));
  closeLogin();
  openDrawer('admin');
}

function applyAuthenticatedUser(user) {
  authenticatedUser = user;
  document.body.classList.add('is-authenticated');
  const userBalance = document.querySelector('#userPanel .user-balance strong');
  if (userBalance) userBalance.textContent = formatCurrency(user.balance || 0);
  const userPanel = document.getElementById('userPanel');
  if (userPanel) userPanel.setAttribute('title', user.name || user.email || 'Jogador');
}

function authenticateHostedDemo({ email, password, name }) {
  const accounts = getDemoAccounts();
  let account = accounts.find((item) => item.email === email);

  if (authMode === 'register') {
    if (account) throw new Error('Já existe uma conta demo com este acesso. Entre para continuar.');
    account = { email, name, password, balance: 250, role: 'player' };
    accounts.push(account);
    saveDemoAccounts(accounts);
  } else if (!account || account.password !== password) {
    throw new Error('Conta demo não encontrada ou senha incorreta. Crie uma conta para continuar.');
  }

  localStorage.setItem('jogo-alex-demo-session', JSON.stringify(account));
  applyAuthenticatedUser(account);
  return account;
}

function normalizeIdentifierToEmail(value) {
  const candidate = String(value || '').trim();

  if (!candidate) {
    return '';
  }

  if (candidate.includes('@')) {
    return candidate.toLowerCase();
  }

  const digits = candidate.replace(/\D/g, '');
  return digits ? `demo+${digits}@gmail.com` : '';
}

async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (appSession?.access_token) {
    headers.Authorization = `Bearer ${appSession.access_token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || 'Erro na API');
  }

  return json;
}

const providerTabs = [
  { id: 'Quente', label: 'Em destaque' }
];

const sections = {
  Quente: [
    { title: 'Fortune Tiger', badge: 'Demo', slug: 'fortune-tiger', rtp: '96.8%' },
    { title: 'Neon Dice', badge: 'Novo', slug: 'neon-dice', rtp: '97.1%' },
    { title: 'Moon Crash', badge: 'Novo', slug: 'moon-crash', rtp: '96.4%' },
    { title: 'Gem Forge', badge: 'Demo', slug: 'gem-forge', rtp: '96.9%' },
    { title: 'Rocket Rumble', badge: 'Demo', slug: 'rocket-rumble', rtp: '97.3%' },
    { title: 'Lucky Lantern', badge: 'Novo', slug: 'lucky-lantern', rtp: '96.7%' }
  ]
};

const providerTabsEl = document.getElementById('providerTabs');
const loginModal = document.getElementById('loginModal');
const loginButton = document.getElementById('loginButton');
const phoneInput = document.getElementById('phoneInput');
const passwordInput = document.getElementById('passwordInput');
const nameInput = document.getElementById('nameInput');
const nameField = document.getElementById('nameField');
const authTitle = document.getElementById('authTitle');
const loginError = document.getElementById('loginError');
const authModeButton = document.getElementById('authModeButton');
const openAdminDemo = document.getElementById('openAdminDemo');
const openAdminDemoTop = document.getElementById('openAdminDemoTop');
const openLoginBtn = document.getElementById('openLogin');
const closeLoginBtn = document.getElementById('closeLogin');
const openRegisterBtn = document.getElementById('openRegister');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerTitle = document.getElementById('drawerTitle');
const drawerContent = document.getElementById('drawerContent');
const gameOverlay = document.getElementById('gameOverlay');
const gameModalTitle = document.getElementById('gameModalTitle');
const gameModalBadge = document.getElementById('gameModalBadge');
const activityList = document.getElementById('activityList');
const gameResult = document.getElementById('gameResult');
const startDemoGameButton = document.getElementById('startDemoGame');

let adminSettings = {
  houseEdge: 3.4,
  payoutRate: 96.8,
  minBet: 1,
  maxBet: 5000,
  dailyLimit: 20000,
  autoPayout: true,
  vipAccess: true,
  gameBoost: 1.2
};

if (isHostedDemo) {
  try {
    adminSettings = { ...adminSettings, ...JSON.parse(localStorage.getItem('jogo-alex-demo-settings') || '{}') };
  } catch (error) {
    localStorage.removeItem('jogo-alex-demo-settings');
  }
}

async function loadAdminSettings() {
  if (!appSession?.access_token) return;

  try {
    const response = await apiRequest('/admin/settings');
    if (response?.data) {
      adminSettings = { ...adminSettings, ...response.data };
    }
  } catch (error) {
    console.warn('Não foi possível carregar configurações do admin:', error.message);
  }
}

async function loadAdminUsers() {
  if (!appSession?.access_token) return [];

  try {
    const response = await apiRequest('/admin/users');
    return response?.data || [];
  } catch (error) {
    console.warn('Não foi possível carregar usuários do admin:', error.message);
    return [];
  }
}

async function saveAdminSettings() {
  if (isHostedDemo) {
    localStorage.setItem('jogo-alex-demo-settings', JSON.stringify(adminSettings));
    activities.unshift({ icon: '⚙️', title: 'Regras salvas', detail: 'Configuração local da demo', time: 'Agora', amount: `RTP: ${adminSettings.payoutRate}%` });
    renderActivity();
    window.alert('Configurações salvas apenas nesta demonstração.');
    return;
  }

  if (!appSession?.access_token) {
    window.alert('Faça login antes de salvar as regras de administração.');
    return;
  }

  const payload = {};

  Object.entries(adminSettings).forEach(([key, value]) => {
    payload[key] = value;
  });

  try {
    const response = await apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (response?.data) {
      adminSettings = { ...adminSettings, ...response.data };
    }

    activities.unshift({
      icon: '⚙️',
      title: 'Regras salvas',
      detail: 'Administração conectada',
      time: 'Agora',
      amount: 'Taxa: ' + adminSettings.houseEdge + '%'
    });
    renderActivity();
    window.alert('Configurações salvas no banco do Supabase.');
  } catch (error) {
    console.error('Erro ao salvar admin settings:', error.message);
    window.alert('Não foi possível salvar as regras de administração.');
  }
}

const activities = [
  { icon: '🎮', title: 'Demonstração aberta', detail: 'Fortune Gems', time: 'Hoje, 19:24', amount: 'Sessão local' },
  { icon: '🎁', title: 'Bônus visual reservado', detail: 'Oferta de boas-vindas', time: 'Hoje, 18:40', amount: '+ R$ 100 fictícios' },
  { icon: '💳', title: 'Saldo inicial', detail: 'Carteira de demonstração', time: 'Hoje, 18:32', amount: 'R$ 2.480,90' }
];

function renderActivity() {
  activityList.innerHTML = activities.map((item) => `
    <div class="activity-item">
      <span class="activity-icon">${item.icon}</span>
      <div class="activity-copy"><strong>${item.title}</strong><span>${item.detail} · ${item.time}</span></div>
      <b>${item.amount}</b>
    </div>
  `).join('');
}

function renderAdminConfig(users = []) {
  const totalBalance = users.reduce((total, user) => total + Number(user.wallet?.balance || 0), 0);
  const userRows = users.length
    ? users.map((user) => `<tr><td>${escapeHtml(user.name || 'Jogador')}</td><td>${escapeHtml(user.email || '-')}</td><td>${formatCurrency(user.wallet?.balance || 0)}</td><td>${escapeHtml(user.status || 'active')}</td></tr>`).join('')
    : '<tr><td colspan="4">Nenhum usuário conectado ainda.</td></tr>';

  return `
    <div class="admin-grid">
      <div><span>Usuários cadastrados</span><strong>${users.length}</strong></div>
      <div><span>Saldo agregado</span><strong>${formatCurrency(totalBalance)}</strong></div>
      <div><span>Jogos no catálogo</span><strong>${Object.values(sections).flat().length}</strong></div>
      <div><span>Gateway</span><strong>Pendente</strong></div>
    </div>
    <div class="config-grid">
      <div class="field-inline">
        <span>Taxa da casa (%)</span>
        <input type="number" data-setting="houseEdge" value="${adminSettings.houseEdge}" step="0.1" min="0" max="50" />
      </div>
      <div class="field-inline">
        <span>Retorno ao jogador (%)</span>
        <input type="number" data-setting="payoutRate" value="${adminSettings.payoutRate}" step="0.1" min="70" max="99.9" />
      </div>
      <div class="field-inline">
        <span>Aposta mínima</span>
        <input type="number" data-setting="minBet" value="${adminSettings.minBet}" min="1" step="1" />
      </div>
      <div class="field-inline">
        <span>Aposta máxima</span>
        <input type="number" data-setting="maxBet" value="${adminSettings.maxBet}" min="100" step="10" />
      </div>
      <div class="field-inline">
        <span>Limite diário</span>
        <input type="number" data-setting="dailyLimit" value="${adminSettings.dailyLimit}" min="100" step="100" />
      </div>
      <div class="field-inline">
        <span>Boost de jogo</span>
        <input type="number" data-setting="gameBoost" value="${adminSettings.gameBoost}" step="0.1" min="0.5" max="5" />
      </div>
    </div>
    <div class="switch-row">
      <span>Pagamento automático</span>
      <button class="switch ${adminSettings.autoPayout ? 'on' : ''}" data-toggle="autoPayout" aria-label="Pagamento automático"><span></span></button>
    </div>
    <div class="switch-row">
      <span>VIP habilitada</span>
      <button class="switch ${adminSettings.vipAccess ? 'on' : ''}" data-toggle="vipAccess" aria-label="VIP habilitada"><span></span></button>
    </div>
    <div class="demo-callout">${isHostedDemo ? 'Painel demonstrativo local: dados fictícios e configurações salvas apenas neste navegador.' : 'Painel conectado às configurações do backend. Pagamentos e métricas financeiras ainda não estão ativos.'}</div>
    <div class="admin-table-wrap"><h3>Usuários e saldos</h3><table class="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Saldo</th><th>Status</th></tr></thead><tbody>${userRows}</tbody></table></div>
    <button class="primary-button wide" data-action="saveAdminConfig">Salvar regras</button>
  `;
}

async function openDrawer(view) {
  if (view === 'admin' && authenticatedUser?.role !== 'admin') {
    window.alert('Acesso restrito ao administrador.');
    return;
  }

  let adminUsers = [];
  if (view === 'admin') {
    await loadAdminSettings();
    adminUsers = await loadAdminUsers();
    if (!adminUsers.length && isHostedDemo) adminUsers = getDemoAdminUsers();
  }

  const content = {
    account: {
      eyebrow: 'Carteira fictícia', title: 'Minha conta', html: `
        <div class="balance-card"><span>Saldo disponível</span><strong>${formatCurrency(authenticatedUser?.balance || 0)}</strong><small>Valor ilustrativo, sem movimentação real</small></div>
        <div class="drawer-actions"><button class="primary-button" data-view="deposit">Depositar</button><button class="ghost-button" data-view="withdraw">Sacar</button></div>
        <h3>Resumo</h3><div class="summary-row"><span>Bônus de demonstração</span><b>R$ 100,00</b></div><div class="summary-row"><span>Saldo utilizado</span><b>R$ 0,00</b></div>
        <button class="secondary-button wide" data-view="history">Abrir histórico</button>${authenticatedUser?.role === 'admin' ? '<button class="secondary-button wide" data-view="admin">Painel administrativo</button>' : ''}`
    },
    deposit: {
      eyebrow: 'Modo demonstração', title: 'Depósito', html: `<div class="demo-callout">Nenhum pagamento será processado nesta versão. Este crédito usa a API interna apenas para demonstrar o fluxo da carteira.</div><label class="field"><span>Valor ilustrativo</span><input type="number" value="100" min="1" /></label><button class="primary-button wide" data-action="demoDeposit">Simular crédito</button>`
    },
    withdraw: {
      eyebrow: 'Modo demonstração', title: 'Saque', html: `<div class="demo-callout">Dados bancários não são solicitados neste protótipo. Esta tela apenas representa o fluxo futuro.</div><label class="field"><span>Valor ilustrativo</span><input type="number" value="50" min="1" /></label><button class="primary-button wide" data-action="demoWithdraw">Simular solicitação</button>`
    },
    promotions: {
      eyebrow: 'Benefícios fictícios', title: 'Promoções', html: `<div class="offer-card"><span class="offer-tag">NOVO</span><h3>Boas-vindas</h3><p>R$ 100 em saldo demonstrativo para explorar a interface.</p><button class="primary-button small" data-action="claimOffer">Reservar oferta</button></div><div class="offer-card"><span class="offer-tag">CASHBACK</span><h3>Jogue com responsabilidade</h3><p>Experimente o catálogo sem dinheiro real e sem integração externa.</p></div>`
    },
    support: {
      eyebrow: 'Atendimento local', title: 'Suporte', html: `<div class="support-options"><button class="secondary-button wide" data-action="supportMessage">Enviar mensagem</button><button class="secondary-button wide" data-action="supportFaq">Abrir perguntas frequentes</button></div><p class="muted-copy">O suporte desta demonstração não envia mensagens para serviços externos.</p>`
    },
    history: {
      eyebrow: 'Somente leitura', title: 'Histórico', html: `<div class="drawer-history">${activities.map((item) => `<div class="summary-row"><span>${item.icon} ${item.title}</span><b>${item.amount}</b></div>`).join('')}</div><p class="muted-copy">Todos os registros são criados no navegador e podem ser apagados ao recarregar a página.</p>`
    },
    admin: {
      eyebrow: 'Painel local', title: 'Administração', html: renderAdminConfig(adminUsers)
    }
  }[view] || null;
  if (!content) return;
  drawerTitle.textContent = content.title;
  document.getElementById('drawerEyebrow').textContent = content.eyebrow;
  drawerContent.innerHTML = content.html;
  drawerOverlay.classList.add('visible');
  drawerOverlay.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  drawerOverlay.classList.remove('visible');
  drawerOverlay.setAttribute('aria-hidden', 'true');
}

function openGame(game) {
  gameModalTitle.textContent = game.title;
  gameModalBadge.textContent = game.badge;
  gameResult.textContent = 'Demo pronta para explorar no navegador.';
  startDemoGameButton.textContent = `Abrir ${game.title}`;
  startDemoGameButton.dataset.slug = game.slug;
  document.querySelector('.muted-copy').textContent = 'Experiência demonstrativa com saldo fictício. Nenhuma aposta ou conexão externa é realizada.';
  const selectedGradient = 'linear-gradient(135deg, rgba(251, 191, 36, 0.8), rgba(244, 63, 94, 0.72))';
  document.getElementById('gamePreviewArt').style.background = selectedGradient;
  gameOverlay.classList.add('visible');
  gameOverlay.setAttribute('aria-hidden', 'false');
}

function createTabs() {
  providerTabs.forEach((tab, index) => {
    const button = document.createElement('button');
    button.className = `tab-btn ${index === 0 ? 'active' : ''}`;
    button.textContent = tab.label;
    button.type = 'button';
    button.dataset.tab = tab.id;
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');
      document.querySelectorAll('.section-block').forEach((block) => block.classList.remove('active'));
      const section = document.getElementById(`section${tab.id}`);
      if (section) section.classList.add('active');
    });
    providerTabsEl.appendChild(button);
  });
}

function renderGames() {
  Object.entries(sections).forEach(([provider, items]) => {
    const grid = document.getElementById(`games${provider}`);
    if (!grid) return;
    grid.innerHTML = items
      .map(
        (game) => `
          <article class="game-card" aria-label="${game.title}">
            <div class="game-art"></div>
            <div class="game-content">
                <span class="game-badge">${game.badge}</span>
              <h3 class="game-title">${game.title}</h3>
              <div class="game-meta">
                  <span>RTP ${game.rtp || '96.8%'}</span>
                <span>Play</span>
              </div>
            </div>
          </article>
        `
      )
      .join('');
    grid.querySelectorAll('.game-card').forEach((card, index) => {
      card.addEventListener('click', () => openGame(items[index]));
    });
  });
}

function showLogin() {
  loginModal.classList.add('visible');
  loginModal.setAttribute('aria-hidden', 'false');
  phoneInput.focus();
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === 'register';
  authTitle.textContent = registering ? 'Criar conta' : 'Entrar';
  loginButton.textContent = registering ? 'Criar conta' : 'Entrar';
  authModeButton.textContent = registering ? 'Já tenho uma conta' : 'Criar uma conta';
  nameField.hidden = !registering;
  loginError.textContent = '';
}

function closeLogin() {
  loginModal.classList.remove('visible');
  loginModal.setAttribute('aria-hidden', 'true');
}

async function loadAuthenticatedState() {
  if (!appSession?.access_token) return;

  try {
    const profileData = await apiRequest('/users/me');
    const walletData = await apiRequest('/wallet/balance');
    const userName = profileData?.user?.name || profileData?.user?.email || 'Jogador';
    const balance = walletData?.data?.balance ?? 0;
    authenticatedUser = profileData?.user || null;

    applyAuthenticatedUser({ ...profileData.user, name: userName, balance });

    const formName = document.querySelector('#loginModal h2');
    if (formName) {
      formName.textContent = 'Conta conectada';
    }
  } catch (error) {
    console.error('Erro ao carregar estado autenticado:', error.message);
  }
}

async function authenticate() {
  const rawPhone = phoneInput.value.trim();
  const password = passwordInput.value.trim();
  const name = nameInput.value.trim();

  if (!rawPhone || !password) {
    loginError.textContent = 'Informe seu e-mail ou telefone e a senha.';
    return;
  }

  if (authMode === 'register' && !name) {
    loginError.textContent = 'Informe seu nome para criar a conta.';
    return;
  }

  const email = normalizeIdentifierToEmail(rawPhone);

  if (!email) {
    loginError.textContent = 'Use um telefone válido ou um e-mail real para autenticar.';
    return;
  }

  if (isHostedDemo) {
    try {
      authenticateHostedDemo({ email, password, name });
      closeLogin();
    } catch (error) {
      loginError.textContent = error.message;
    }
    return;
  }

  try {
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    const payload = { email, phone: rawPhone, password };
    if (authMode === 'register') payload.name = name;
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    appSession = data.session;
    if (appSession) localStorage.setItem('jogo-alex-session', JSON.stringify(appSession));
    await loadAuthenticatedState();
    closeLogin();
    loginError.textContent = '';
    phoneInput.value = rawPhone;
    passwordInput.value = password;
    return;
  } catch (error) {
    loginError.textContent = error.message || 'Não foi possível concluir a autenticação.';
  }
}

openLoginBtn.addEventListener('click', () => { setAuthMode('login'); showLogin(); });
closeLoginBtn.addEventListener('click', closeLogin);
openRegisterBtn.addEventListener('click', () => { setAuthMode('register'); showLogin(); });
authModeButton.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
openAdminDemo.addEventListener('click', openHostedAdminDemo);
openAdminDemoTop.addEventListener('click', openHostedAdminDemo);
loginButton.addEventListener('click', () => authenticate());

passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') authenticate();
});

phoneInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') authenticate();
});

loginModal.addEventListener('click', (event) => {
  if (event.target === loginModal) closeLogin();
});

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    openDrawer(viewButton.dataset.view);
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  const toggle = event.target.closest('[data-toggle]');

  if (toggle) {
    const key = toggle.dataset.toggle;
    adminSettings[key] = !adminSettings[key];
    openDrawer('admin');
    return;
  }

  if (!action) return;
  if (action === 'demoDeposit') {
    const amountInput = drawerContent.querySelector('input[type="number"]');
    const amount = Number(amountInput?.value || 0);
    if (!appSession?.access_token && !isHostedDemo) {
      window.alert('Entre na conta para simular um crédito na carteira.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Informe um valor maior que zero.');
      return;
    }
    const applyDemoDeposit = (response) => {
      const formattedAmount = Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      activities.unshift({ icon: '💳', title: 'Crédito simulado', detail: 'Registrado na carteira demo', time: 'Agora', amount: `+ R$ ${formattedAmount}` });
      renderActivity();
      const balance = response?.balance ?? response?.wallet?.balance ?? 0;
      authenticatedUser.balance = Number(balance);
      const userBalance = document.querySelector('#userPanel .user-balance strong');
      if (userBalance) userBalance.textContent = formatCurrency(balance);
      closeDrawer();
    };

    if (isHostedDemo) {
      authenticatedUser.balance = Number(authenticatedUser.balance || 0) + amount;
      const accounts = getDemoAccounts().map((account) => account.email === authenticatedUser.email ? authenticatedUser : account);
      saveDemoAccounts(accounts);
      localStorage.setItem('jogo-alex-demo-session', JSON.stringify(authenticatedUser));
      applyDemoDeposit({ balance: authenticatedUser.balance });
      return;
    }

    apiRequest('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount })
    }).then(applyDemoDeposit).catch((error) => window.alert(error.message || 'Não foi possível simular o crédito.'));
  }
  if (action === 'demoWithdraw') { activities.unshift({ icon: '↗', title: 'Saque simulado', detail: 'Nenhum dado enviado', time: 'Agora', amount: 'Aguardando gateway' }); renderActivity(); }
  if (action === 'claimOffer') activities.unshift({ icon: '🎁', title: 'Oferta reservada', detail: 'Bônus demonstrativo', time: 'Agora', amount: '+ R$ 100 fictícios' });
  if (action === 'supportMessage') window.alert('Demonstração: mensagem não enviada.');
  if (action === 'supportFaq') window.alert('Demonstração: FAQ em construção.');
  if (action === 'exportDemo') window.alert('Demonstração: relatório fictício pronto para exportação.');
  if (action === 'saveAdminConfig') {
    document.querySelectorAll('[data-setting]').forEach((input) => {
      const key = input.dataset.setting;
      const value = Number(input.value);
      if (!Number.isNaN(value) && key in adminSettings) {
        adminSettings[key] = value;
      }
    });

    saveAdminSettings();
  }
});

document.querySelectorAll('.mini-action').forEach((button) => {
  const action = button.textContent.trim();
  if (action === 'Depósito') button.addEventListener('click', () => openDrawer('deposit'));
  if (action === 'Saque') button.addEventListener('click', () => openDrawer('withdraw'));
  if (action === 'Minha conta') button.addEventListener('click', () => openDrawer('account'));
  if (action === 'Ganhe R$100 de graça') button.addEventListener('click', () => openDrawer('promotions'));
  if (action === 'Suporte ao vivo') button.addEventListener('click', () => openDrawer('support'));
});

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((node) => node.classList.remove('active'));
    button.classList.add('active');
    if (button.textContent.trim() === 'Promoções') openDrawer('promotions');
    if (button.textContent.trim() === 'Suporte') openDrawer('support');
  });
});

document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
document.getElementById('closeGame').addEventListener('click', () => gameOverlay.classList.remove('visible'));
drawerOverlay.addEventListener('click', (event) => { if (event.target === drawerOverlay) closeDrawer(); });
gameOverlay.addEventListener('click', (event) => { if (event.target === gameOverlay) gameOverlay.classList.remove('visible'); });

let selectedDemoBet = 5;
document.querySelectorAll('.bet-option').forEach((button) => {
  button.addEventListener('click', () => {
    selectedDemoBet = Number(button.dataset.bet);
    document.querySelectorAll('.bet-option').forEach((node) => node.classList.toggle('active', node === button));
    gameResult.textContent = `Aposta selecionada: R$${selectedDemoBet}.`;
  });
});

startDemoGameButton.addEventListener('click', () => {
  const slug = startDemoGameButton.dataset.slug || 'fortune-tiger';
  const target = slug === 'fortune-tiger'
    ? `${window.location.origin}/fortune-tiger.html`
    : `${window.location.origin}/demo-game.html?game=${encodeURIComponent(slug)}`;
  window.open(target, '_blank');
  gameOverlay.classList.remove('visible');
});

createTabs();
renderGames();
renderActivity();
const storedSession = localStorage.getItem('jogo-alex-session');
const storedDemoSession = localStorage.getItem('jogo-alex-demo-session');
if (isHostedDemo && storedDemoSession) {
  try {
    applyAuthenticatedUser(JSON.parse(storedDemoSession));
  } catch (error) {
    localStorage.removeItem('jogo-alex-demo-session');
  }
} else if (storedSession) {
  try {
    appSession = JSON.parse(storedSession);
    loadAuthenticatedState();
  } catch (error) {
    localStorage.removeItem('jogo-alex-session');
  }
}
