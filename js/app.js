/**
 * Connector CRM — Main App Controller
 * Handles sidebar nav, view routing, workspace context, global search.
 */
const App = (() => {
    let _wsId = null;
    let _currentView = 'dashboard';

    function init() {
        // Get workspace ID from URL
        const params = new URLSearchParams(window.location.search);
        _wsId = params.get('ws');

        if (!_wsId || !Store.getWorkspace(_wsId)) {
            // No valid workspace — redirect to selector
            window.location.href = 'index.html';
            return;
        }

        Store.setActiveWorkspace(_wsId);

        // Seed demo data if workspace is empty
        Store.seedDemoData(_wsId);

        // Init modules
        Contacts.init(_wsId);
        Deals.init(_wsId);
        Tasks.init(_wsId);
        Reports.init(_wsId);

        // Render shell
        _renderSidebar();
        _renderHeader();

        // Navigate to default view
        navigate('dashboard');
    }

    function navigate(view) {
        _currentView = view;
        _updateSidebarActive();
        const container = document.getElementById('mainContent');
        let html = '';
        switch (view) {
            case 'dashboard': html = Reports.render(); break;
            case 'contacts':  html = Contacts.render(); break;
            case 'pipeline':  html = Deals.render(); break;
            case 'tasks':     html = Tasks.render(); break;
            default:          html = Reports.render(); break;
        }
        container.innerHTML = html;
        lucide.createIcons();
    }

    function _renderSidebar() {
        const ws = Store.getWorkspace(_wsId);
        const allWs = Store.getWorkspaces();

        document.getElementById('sidebar').innerHTML = `
        <!-- Workspace Header -->
        <div class="h-16 px-5 flex items-center gap-3 border-b border-gray-100">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style="background:${ws.color}">${ws.initials}</div>
            <div class="flex-1 min-w-0 relative">
                <button onclick="document.getElementById('wsDropdown').classList.toggle('hidden')" class="flex items-center gap-1 w-full text-left">
                    <span class="text-sm font-semibold text-gray-900 truncate">${_esc(ws.name)}</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-gray-400 shrink-0"></i>
                </button>
                <!-- Workspace Dropdown -->
                <div id="wsDropdown" class="hidden absolute top-8 left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1.5">
                    <div class="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workspaces</div>
                    ${allWs.map(w => `
                        <a href="crm.html?ws=${w.id}" class="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors ${w.id === _wsId ? 'bg-gray-50' : ''}">
                            <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style="background:${w.color}">${w.initials}</div>
                            <span class="text-sm text-gray-700 truncate">${_esc(w.name)}</span>
                            ${w.id === _wsId ? '<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0"></i>' : ''}
                        </a>`).join('')}
                    <div class="border-t border-gray-100 mt-1.5 pt-1.5">
                        <a href="index.html" class="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm text-gray-500">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i> All Workspaces
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            <button onclick="App.navigate('dashboard')" data-nav="dashboard"
                class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left">
                <i data-lucide="layout-dashboard" class="w-[18px] h-[18px]"></i> Dashboard
            </button>
            <button onclick="App.navigate('contacts')" data-nav="contacts"
                class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left">
                <i data-lucide="users" class="w-[18px] h-[18px]"></i> Contacts
            </button>
            <button onclick="App.navigate('pipeline')" data-nav="pipeline"
                class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left">
                <i data-lucide="kanban" class="w-[18px] h-[18px]"></i> Pipeline
            </button>
            <button onclick="App.navigate('tasks')" data-nav="tasks"
                class="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left">
                <i data-lucide="check-square" class="w-[18px] h-[18px]"></i> Tasks
            </button>
        </nav>

        <!-- Bottom -->
        <div class="p-3 border-t border-gray-100">
            <a href="index.html" class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
                <i data-lucide="arrow-left" class="w-[18px] h-[18px]"></i> Back to Workspaces
            </a>
        </div>`;
        lucide.createIcons();
    }

    function _renderHeader() {
        document.getElementById('topHeader').innerHTML = `
        <div class="relative w-full max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><i data-lucide="search" class="w-4 h-4 text-gray-400"></i></div>
            <input type="text" id="globalSearch" placeholder="Search contacts, deals, tasks..."
                oninput="App.handleSearch(this.value)"
                class="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm">
            <div id="searchResults" class="hidden absolute top-12 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto"></div>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-500">NOMAN GAZI</span>
        </div>`;
        lucide.createIcons();

        // Close search results on click outside
        document.addEventListener('click', (e) => {
            const sr = document.getElementById('searchResults');
            if (sr && !sr.contains(e.target) && e.target.id !== 'globalSearch') {
                sr.classList.add('hidden');
            }
        });
    }

    function _updateSidebarActive() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            const nav = btn.dataset.nav;
            if (nav === _currentView) {
                btn.className = 'nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-900 bg-white shadow-sm border border-gray-100 text-left';
            } else {
                btn.className = 'nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors text-left';
            }
        });
    }

    function handleSearch(q) {
        const sr = document.getElementById('searchResults');
        if (!q.trim()) { sr.classList.add('hidden'); return; }

        const results = Store.globalSearch(_wsId, q);
        const hasResults = results.contacts.length || results.deals.length || results.tasks.length;

        if (!hasResults) {
            sr.innerHTML = '<div class="p-4 text-sm text-gray-400 text-center">No results found.</div>';
            sr.classList.remove('hidden');
            return;
        }

        let html = '';
        if (results.contacts.length) {
            html += `<div class="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">Contacts</div>`;
            html += results.contacts.slice(0, 5).map(c => `
                <button onclick="App.navigate('contacts'); setTimeout(() => Contacts.showDetail('${c.id}'), 100); document.getElementById('searchResults').classList.add('hidden')"
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left">
                    <i data-lucide="user" class="w-4 h-4 text-gray-400"></i>
                    <div><p class="text-sm text-gray-900">${_esc(c.name)}</p><p class="text-xs text-gray-400">${_esc(c.company)}</p></div>
                </button>`).join('');
        }
        if (results.deals.length) {
            html += `<div class="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">Deals</div>`;
            html += results.deals.slice(0, 5).map(d => `
                <button onclick="App.navigate('pipeline'); document.getElementById('searchResults').classList.add('hidden')"
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left">
                    <i data-lucide="target" class="w-4 h-4 text-gray-400"></i>
                    <div><p class="text-sm text-gray-900">${_esc(d.title)}</p><p class="text-xs text-gray-400">$${Number(d.value).toLocaleString()}</p></div>
                </button>`).join('');
        }
        if (results.tasks.length) {
            html += `<div class="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">Tasks</div>`;
            html += results.tasks.slice(0, 5).map(t => `
                <button onclick="App.navigate('tasks'); document.getElementById('searchResults').classList.add('hidden')"
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left">
                    <i data-lucide="check-square" class="w-4 h-4 text-gray-400"></i>
                    <div><p class="text-sm text-gray-900">${_esc(t.title)}</p><p class="text-xs text-gray-400">${t.priority} priority</p></div>
                </button>`).join('');
        }

        sr.innerHTML = html;
        sr.classList.remove('hidden');
        lucide.createIcons();
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    return { init, navigate, handleSearch };
})();
