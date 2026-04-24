/**
 * Connector CRM — Reports / Dashboard Module
 */
const Reports = (() => {
    let _wsId = null;

    function init(wsId) { _wsId = wsId; }

    function render() {
        const contacts = Store.getContacts(_wsId);
        const deals = Store.getDeals(_wsId);
        const tasks = Store.getTasks(_wsId);
        const activities = Store.getActivities(_wsId);
        const today = new Date().toISOString().split('T')[0];

        const openDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
        const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
        const wonDeals = deals.filter(d => d.stage === 'won');
        const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
        const lostDeals = deals.filter(d => d.stage === 'lost');
        const tasksDueToday = tasks.filter(t => t.dueDate === today && !t.completed);
        const tasksOverdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
        const tasksCompleted = tasks.filter(t => t.completed);

        const recentActivities = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

        return `
        <div class="mb-6">
            <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
            <p class="text-sm text-gray-500 mt-1">Overview of your CRM workspace</p>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-4 gap-4 mb-8">
            ${_statCard('Total Contacts', contacts.length, 'users', 'bg-blue-50 text-blue-600')}
            ${_statCard('Pipeline Value', '$' + pipelineValue.toLocaleString(), 'trending-up', 'bg-emerald-50 text-emerald-600')}
            ${_statCard('Due Today', tasksDueToday.length, 'clock', 'bg-amber-50 text-amber-600')}
            ${_statCard('Overdue Tasks', tasksOverdue.length, 'alert-triangle', 'bg-red-50 text-red-600')}
        </div>

        <div class="grid grid-cols-3 gap-6 mb-8">
            <!-- Pipeline by Stage -->
            <div class="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Pipeline by Stage</h3>
                <div class="space-y-3">
                    ${_pipelineBar('Lead', deals.filter(d => d.stage === 'lead'), pipelineValue || 1, 'bg-blue-500')}
                    ${_pipelineBar('Qualified', deals.filter(d => d.stage === 'qualified'), pipelineValue || 1, 'bg-amber-500')}
                    ${_pipelineBar('Proposal', deals.filter(d => d.stage === 'proposal'), pipelineValue || 1, 'bg-purple-500')}
                    ${_pipelineBar('Won', wonDeals, pipelineValue || wonValue || 1, 'bg-emerald-500')}
                    ${_pipelineBar('Lost', lostDeals, pipelineValue || 1, 'bg-red-400')}
                </div>
            </div>

            <!-- Task Summary -->
            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Task Summary</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-amber-500"></div><span class="text-sm text-gray-600">Pending</span></div>
                        <span class="text-sm font-semibold text-gray-900">${tasks.filter(t => !t.completed).length}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-red-500"></div><span class="text-sm text-gray-600">Overdue</span></div>
                        <span class="text-sm font-semibold text-gray-900">${tasksOverdue.length}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full bg-emerald-500"></div><span class="text-sm text-gray-600">Completed</span></div>
                        <span class="text-sm font-semibold text-gray-900">${tasksCompleted.length}</span>
                    </div>
                    <div class="pt-3 border-t border-gray-100">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-900">Completion Rate</span>
                            <span class="text-sm font-semibold text-gray-900">${tasks.length ? Math.round((tasksCompleted.length / tasks.length) * 100) : 0}%</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2 mt-2">
                            <div class="bg-emerald-500 h-2 rounded-full transition-all" style="width: ${tasks.length ? (tasksCompleted.length / tasks.length) * 100 : 0}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-3 gap-6">
            <!-- Today's Tasks -->
            <div class="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Today's Tasks</h3>
                ${tasksDueToday.length === 0 ? '<p class="text-sm text-gray-400">No tasks due today. 🎉</p>' :
                `<div class="space-y-2">${tasksDueToday.map(t => {
                    const contact = t.contactId ? Store.getContact(_wsId, t.contactId) : null;
                    const pColors = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-gray-400' };
                    return `<div class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <button onclick="Tasks.toggle('${t.id}'); App.navigate('dashboard')" class="w-4 h-4 rounded border-2 border-gray-300 hover:border-gray-400 shrink-0"></button>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">${_esc(t.title)}</p>
                            ${contact ? `<p class="text-xs text-gray-400">${_esc(contact.name)}</p>` : ''}
                        </div>
                        <i data-lucide="flag" class="w-3.5 h-3.5 ${pColors[t.priority]} shrink-0"></i>
                    </div>`;
                }).join('')}</div>`}
            </div>

            <!-- Recent Activity -->
            <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                ${recentActivities.length === 0 ? '<p class="text-sm text-gray-400">No activity yet.</p>' :
                `<div class="space-y-3">${recentActivities.map(a => {
                    const contact = a.contactId ? Store.getContact(_wsId, a.contactId) : null;
                    const icons = { call: 'phone', email: 'mail', meeting: 'users', note: 'sticky-note' };
                    const colors = { call: 'text-emerald-500', email: 'text-blue-500', meeting: 'text-purple-500', note: 'text-amber-500' };
                    return `<div class="flex gap-2.5 items-start">
                        <i data-lucide="${icons[a.type] || 'activity'}" class="w-4 h-4 ${colors[a.type] || 'text-gray-400'} shrink-0 mt-0.5"></i>
                        <div class="min-w-0">
                            <p class="text-xs text-gray-600 truncate">${_esc(a.content)}</p>
                            <p class="text-[10px] text-gray-400">${contact ? _esc(contact.name) + ' · ' : ''}${_relTime(a.createdAt)}</p>
                        </div>
                    </div>`;
                }).join('')}</div>`}
            </div>
        </div>`;
    }

    function _statCard(label, value, icon, colorClass) {
        return `
        <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
            </div>
            <p class="text-2xl font-semibold text-gray-900">${value}</p>
            <p class="text-xs text-gray-500 mt-1">${label}</p>
        </div>`;
    }

    function _pipelineBar(label, deals, maxVal, barColor) {
        const val = deals.reduce((s, d) => s + d.value, 0);
        const pct = Math.max((val / maxVal) * 100, 2);
        return `
        <div>
            <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-gray-600">${label} <span class="text-gray-400">(${deals.length})</span></span>
                <span class="text-sm font-medium text-gray-900">$${val.toLocaleString()}</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2.5">
                <div class="${barColor} h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
        </div>`;
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _relTime(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    return { init, render };
})();
