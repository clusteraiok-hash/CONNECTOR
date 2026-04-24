/**
 * Connector CRM — Tasks Module
 */
const Tasks = (() => {
    let _wsId = null;
    let _filter = 'all';

    function init(wsId) { _wsId = wsId; }

    function render() {
        return `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Tasks & Follow-ups</h1>
                <p class="text-sm text-gray-500 mt-1">Manage your to-do list and schedule</p>
            </div>
            <button onclick="Tasks.showAddModal()" class="flex items-center gap-2 px-5 py-2.5 bg-gray-900 rounded-xl text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Task
            </button>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-6 w-fit">
            ${['all', 'today', 'overdue', 'completed'].map(f =>
                `<button onclick="Tasks.setFilter('${f}')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${_filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}">${f.charAt(0).toUpperCase() + f.slice(1)}${f !== 'all' ? ` (${_countByFilter(f)})` : ` (${Store.getTasks(_wsId).length})`}</button>`
            ).join('')}
        </div>

        <!-- Task List -->
        <div class="space-y-2.5" id="tasksList">
            ${_renderTasks()}
        </div>`;
    }

    function _renderTasks() {
        const tasks = _getFilteredTasks();
        if (tasks.length === 0) return `<div class="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm shadow-sm">No tasks found.</div>`;

        return tasks.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const pOrder = { high: 0, medium: 1, low: 2 };
            return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
        }).map(t => _taskCard(t)).join('');
    }

    function _taskCard(t) {
        const contact = t.contactId ? Store.getContact(_wsId, t.contactId) : null;
        const deal = t.dealId ? Store.getDeal(_wsId, t.dealId) : null;
        const isOverdue = !t.completed && t.dueDate && new Date(t.dueDate + 'T23:59:59') < new Date();
        const isToday = t.dueDate === new Date().toISOString().split('T')[0];

        const pColors = { high: 'bg-red-50 text-red-600', medium: 'bg-amber-50 text-amber-600', low: 'bg-gray-100 text-gray-500' };

        return `
        <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-4 ${t.completed ? 'opacity-60' : ''}">
            <div class="pt-0.5 shrink-0">
                <button onclick="Tasks.toggle('${t.id}')" class="w-5 h-5 rounded border-2 ${t.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-gray-400'} flex items-center justify-center transition-colors">
                    ${t.completed ? '<i data-lucide="check" class="w-3 h-3 text-white" stroke-width="3"></i>' : ''}
                </button>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-1">
                    <h3 class="text-[15px] font-medium text-gray-900 leading-snug ${t.completed ? 'line-through text-gray-400' : ''}">${_esc(t.title)}</h3>
                    <div class="flex items-center gap-2 shrink-0 ml-3">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${pColors[t.priority]} text-xs font-medium">
                            <i data-lucide="flag" class="w-3 h-3"></i> ${t.priority}
                        </span>
                    </div>
                </div>
                ${t.description ? `<p class="text-sm text-gray-500 mb-3 ${t.completed ? 'line-through' : ''}">${_esc(t.description)}</p>` : ''}
                <div class="flex items-center text-xs text-gray-400 gap-4 flex-wrap">
                    ${t.dueDate ? `<span class="flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : isToday ? 'text-amber-600 font-medium' : ''}">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${_fmtDate(t.dueDate)}${isOverdue ? ' (overdue)' : isToday ? ' (today)' : ''}
                    </span>` : ''}
                    ${contact ? `<span class="flex items-center gap-1"><i data-lucide="user" class="w-3.5 h-3.5"></i> ${_esc(Store.getContactName(contact))}</span>` : ''}
                    ${deal ? `<span class="flex items-center gap-1"><i data-lucide="target" class="w-3.5 h-3.5"></i> ${_esc(deal.title)}</span>` : ''}
                </div>
            </div>
            <div class="flex gap-1 shrink-0 self-start">
                <button onclick="Tasks.showEditModal('${t.id}')" class="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                <button onclick="Tasks.remove('${t.id}')" class="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
        </div>`;
    }

    function _getFilteredTasks() {
        const tasks = Store.getTasks(_wsId);
        const today = new Date().toISOString().split('T')[0];
        switch (_filter) {
            case 'today': return tasks.filter(t => t.dueDate === today && !t.completed);
            case 'overdue': return tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
            case 'completed': return tasks.filter(t => t.completed);
            default: return tasks;
        }
    }

    function _countByFilter(f) {
        const tasks = Store.getTasks(_wsId);
        const today = new Date().toISOString().split('T')[0];
        switch (f) {
            case 'today': return tasks.filter(t => t.dueDate === today && !t.completed).length;
            case 'overdue': return tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
            case 'completed': return tasks.filter(t => t.completed).length;
            default: return tasks.length;
        }
    }

    function setFilter(f) { _filter = f; App.navigate('tasks'); }

    function toggle(id) {
        const t = Store.getTask(_wsId, id);
        if (!t) return;
        Store.updateTask(_wsId, id, { completed: !t.completed });
        App.navigate('tasks');
    }

    function showAddModal() {
        _showModal('Add Task', {}, (data) => {
            Store.addTask(_wsId, data);
            App.navigate('tasks');
        });
    }

    function showEditModal(id) {
        const t = Store.getTask(_wsId, id);
        if (!t) return;
        _showModal('Edit Task', t, (data) => {
            Store.updateTask(_wsId, id, data);
            App.navigate('tasks');
        });
    }

    function _showModal(title, data, onSave) {
        const contacts = Store.getContacts(_wsId);
        const deals = Store.getDeals(_wsId);
        const modal = document.createElement('div');
        modal.id = 'taskModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="fixed inset-0 bg-black/30" onclick="document.getElementById('taskModal').remove()"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-5">${title}</h2>
            <form id="taskForm" class="space-y-4">
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                    <input name="title" value="${_esc(data.title || '')}" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="2" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none">${_esc(data.description || '')}</textarea></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input name="dueDate" type="date" value="${data.dueDate || ''}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                            <option value="high" ${data.priority === 'high' ? 'selected' : ''}>🔴 High</option>
                            <option value="medium" ${data.priority === 'medium' || !data.priority ? 'selected' : ''}>🟡 Medium</option>
                            <option value="low" ${data.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                        </select></div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                        <select name="contactId" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                            <option value="">— None —</option>
                            ${contacts.map(c => `<option value="${c.id}" ${data.contactId === c.id ? 'selected' : ''}>${_esc(Store.getContactName(c))}</option>`).join('')}
                        </select></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Deal</label>
                        <select name="dealId" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                            <option value="">— None —</option>
                            ${deals.map(d => `<option value="${d.id}" ${data.dealId === d.id ? 'selected' : ''}>${_esc(d.title)}</option>`).join('')}
                        </select></div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="document.getElementById('taskModal').remove()" class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">Save</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('taskForm').onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            onSave({ title: fd.get('title'), description: fd.get('description'), dueDate: fd.get('dueDate'), priority: fd.get('priority'), contactId: fd.get('contactId'), dealId: fd.get('dealId') });
            modal.remove();
        };
    }

    function remove(id) {
        if (!confirm('Delete this task?')) return;
        Store.deleteTask(_wsId, id);
        App.navigate('tasks');
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return { init, render, setFilter, toggle, showAddModal, showEditModal, remove };
})();
