const validCredentials = {
  phone: '11986468935',
  password: 'Teste123*'
};

const API_BASE = 'http://localhost:4000';
let appSession = null;

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
  { id: 'Quente', label: '🎰 Jogos' }
];

const sections = {
  Quente: [
    { title: 'Fortune Tiger', badge: 'Real', art: 'fortune-tiger', url: 'fortune-tiger.html' },
    { title: 'Neon Dice', badge: 'Demo', art: 'neon-dice', url: 'demo-game.html?game=neon-dice' },
    { title: 'Moon Crash', badge: 'Demo', art: 'moon-crash', url: 'demo-game.html?game=moon-crash' },
    { title: 'Gem Forge', badge: 'Demo', art: 'gem-forge', url: 'demo-game.html?game=gem-forge' },
    { title: 'Rocket Rumble', badge: 'Demo', art: 'rocket-rumble', url: 'demo-game.html?game=rocket-rumble' },
    { title: 'Lucky Lantern', badge: 'Demo', art: 'lucky-lantern', url: 'demo-game.html?game=lucky-lantern' }
  ]
};

const providerTabsEl = document.getElementById('providerTabs');
const loginModal = document.getElementById('loginModal');
const loginButton = document.getElementById('loginButton');
const phoneInput = document.getElementById('phoneInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');
const quickFill = document.getElementById('quickFill');
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

async function saveAdminSettings() {
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

function renderAdminConfig() {
  return `
    <div class="admin-grid">
      <div><span>Usuários demo</span><strong>128</strong></div>
      <div><span>Sessões ativas</span><strong>24</strong></div>
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
    <div class="demo-callout">Estas configurações ficam em memória do navegador e simulam o painel administrativo de uma casa de apostas. Sem gateway, chaves ou fins de produção.</div>
    <button class="primary-button wide" data-action="saveAdminConfig">Salvar regras</button>
  `;
}

function openDrawer(view) {
  const content = {
    account: {
      eyebrow: 'Carteira fictícia', title: 'Minha conta', html: `
        <div class="balance-card"><span>Saldo disponível</span><strong>R$ 2.480,90</strong><small>Valor ilustrativo, sem movimentação real</small></div>
        <div class="drawer-actions"><button class="primary-button" data-view="deposit">Depositar</button><button class="ghost-button" data-view="withdraw">Sacar</button></div>
        <h3>Resumo</h3><div class="summary-row"><span>Bônus de demonstração</span><b>R$ 100,00</b></div><div class="summary-row"><span>Saldo utilizado</span><b>R$ 0,00</b></div>
        <button class="secondary-button wide" data-view="history">Abrir histórico</button><button class="secondary-button wide" data-view="admin">Painel administrativo</button>`
    },
    deposit: {
      eyebrow: 'Modo demonstração', title: 'Depósito', html: `<div class="demo-callout">Nenhum pagamento será processado nesta versão. O gateway será conectado somente após a definição da API autorizada.</div><label class="field"><span>Valor ilustrativo</span><input type="number" value="100" min="1" /></label><button class="primary-button wide" data-action="demoDeposit">Simular crédito</button>`
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
      eyebrow: 'Painel local', title: 'Administração', html: renderAdminConfig()
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

let activeGame = null;

function openGame(game) {
  activeGame = game;
  gameModalTitle.textContent = game.title;
  gameModalBadge.textContent = game.badge;
  gameResult.textContent = game.badge === 'Real'
    ? 'Jogo real em desenvolvimento e conectado ao backend.'
    : 'Jogo de demonstração, saldo e resultados são fictícios.';
  startDemoGameButton.textContent = `Abrir ${game.title}`;
  const previewArt = document.getElementById('gamePreviewArt');
  previewArt.style.backgroundImage = `url('assets/games/${game.art}.png')`;
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
            <div class="game-art" style="background-image: url('assets/games/${game.art}.png')"></div>
            <div class="game-content">
              <span class="game-badge">${game.badge}</span>
              <h3 class="game-title">${game.title}</h3>
              <div class="game-meta">
                <span>RTP 96.8%</span>
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

    document.body.classList.add('is-authenticated');
    const userBalance = document.querySelector('#userPanel .user-balance strong');
    if (userBalance) {
      userBalance.textContent = `R$ ${Number(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const userPanel = document.getElementById('userPanel');
    if (userPanel) {
      userPanel.setAttribute('title', userName);
    }

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

  if (!rawPhone || !password) {
    loginError.textContent = 'Informe seu e-mail ou telefone e a senha.';
    return;
  }

  const email = normalizeIdentifierToEmail(rawPhone);

  if (!email) {
    loginError.textContent = 'Use um telefone válido ou um e-mail real para autenticar.';
    return;
  }

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, phone: rawPhone, password })
    });

    appSession = data.session;
    await loadAuthenticatedState();
    closeLogin();
    loginError.textContent = '';
    phoneInput.value = rawPhone;
    passwordInput.value = password;
    return;
  } catch (error) {
    try {
      const created = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          phone: rawPhone,
          password,
          name: rawPhone || 'Jogador Demo'
        })
      });

      appSession = created.session;
      await loadAuthenticatedState();
      closeLogin();
      loginError.textContent = '';
      phoneInput.value = rawPhone;
      passwordInput.value = password;
      return;
    } catch (registerError) {
      loginError.textContent = 'Credenciais inválidas ou backend indisponível. Use outro acesso.';
      return;
    }
  }
}

openLoginBtn.addEventListener('click', showLogin);
closeLoginBtn.addEventListener('click', closeLogin);
openRegisterBtn.addEventListener('click', showLogin);
loginButton.addEventListener('click', () => authenticate());
quickFill.addEventListener('click', () => {
  phoneInput.value = validCredentials.phone;
  passwordInput.value = validCredentials.password;
  loginError.textContent = '';
  phoneInput.focus();
});

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
  if (action === 'demoDeposit') { activities.unshift({ icon: '💳', title: 'Crédito simulado', detail: 'Operação local', time: 'Agora', amount: '+ R$ 100 fictícios' }); renderActivity(); }
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
  if (!activeGame) return;
  const separator = activeGame.url.includes('?') ? '&' : '?';
  window.open(`http://localhost:8000/${activeGame.url}${separator}bet=${selectedDemoBet}`, '_blank');
  gameOverlay.classList.remove('visible');
});

createTabs();
renderGames();
renderActivity();
loadAdminSettings();
showLogin();
