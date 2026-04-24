/**
 * Connector CRM — Main App Controller
 * Handles sidebar nav, view routing, workspace context, and global search.
 */
const App = (() => {
    let _wsId = null;
    let _currentView = 'dashboard';

    function init() {
        const params = new URLSearchParams(window.location.search);
        _wsId = params.get('ws');

        if (!_wsId || !Store.getWorkspace(_wsId)) {
            window.location.href = 'index.html';
            return;
        }

        Store.setActiveWorkspace(_wsId);

        // Init modules
        Contacts.init(_wsId);
        Deals.init(_wsId);
        Tasks.init(_wsId);
        Reports.init(_wsId);

        // Render default view
        navigate('dashboard');
        
        // Setup Search Listener
        const searchInput = document.querySelector('header input');
        if (searchInput) {
            searchInput.oninput = (e) => handleSearch(e.target.value);
        }
    }

    function navigate(view) {
        _currentView = view;
        _updateSidebarActive();
        
        const container = document.getElementById('mainContent');
        if (!container) return;

        let html = '';
        switch (view) {
            case 'dashboard': html = Reports.render(); break;
            case 'contacts':  html = Contacts.render(); break;
            case 'pipeline':  html = Deals.render(); break;
            case 'tasks':     html = Tasks.render(); break;
            case 'analytics': html = _renderAnalytics(); break;
            default:          html = Reports.render(); break;
        }
        
        container.innerHTML = html;
        lucide.createIcons();
    }

    function _updateSidebarActive() {
        document.querySelectorAll('aside nav button').forEach(btn => {
            const nav = btn.dataset.nav;
            if (nav === _currentView) {
                btn.classList.add('sidebar-active');
                btn.classList.remove('text-gray-500');
            } else {
                btn.classList.remove('sidebar-active');
                btn.classList.add('text-gray-500');
            }
        });
    }

    function handleSearch(q) {
        // Simple search result display could be added here
        console.log('Search:', q);
    }

    function _renderAnalytics() {
        return `
        <div class="max-w-5xl mx-auto py-12 text-center">
            <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i data-lucide="bar-chart-2" class="w-10 h-10"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Analytics coming soon</h1>
            <p class="text-sm text-gray-500">Advanced reporting and data visualization for your client workspaces.</p>
        </div>`;
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    return { init, navigate, handleSearch };
})();

// Auto-init on load
window.onload = () => App.init();
