/**
 * Connector CRM — Contacts Module
 */
const Contacts = (() => {
    let _wsId = null;

    function init(wsId) { _wsId = wsId; }

    function render() {
        const contacts = Store.getContacts(_wsId);
        return `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Contacts</h1>
                <p class="text-sm text-gray-500 mt-1">${contacts.length} total contacts</p>
            </div>
            <div class="flex items-center gap-3">
                <label class="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm text-gray-700 text-sm font-medium border border-gray-100 hover:bg-gray-50 transition-colors">
                    <i data-lucide="upload" class="w-4 h-4"></i> Import CSV
                    <input type="file" accept=".csv" class="hidden" onchange="Contacts.handleImport(this)">
                </label>
                <button onclick="CSV.exportContacts('${_wsId}')" class="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm text-gray-700 text-sm font-medium border border-gray-100 hover:bg-gray-50 transition-colors">
                    <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                </button>
                <button onclick="Contacts.showAddModal()" class="flex items-center gap-2 px-5 py-2.5 bg-gray-900 rounded-xl text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Contact
                </button>
            </div>
        </div>

        <!-- Search -->
        <div class="mb-5">
            <div class="relative max-w-md">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i data-lucide="search" class="w-4 h-4 text-gray-400"></i></div>
                <input type="text" id="contactSearch" placeholder="Search contacts..." oninput="Contacts.filterList(this.value)"
                    class="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200">
            </div>
        </div>

        <!-- Contacts Table -->
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-100">
                        <th class="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th class="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                        <th class="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
                        <th class="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody id="contactsTableBody">
                    ${contacts.length === 0 ? `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 text-sm">No contacts yet. Add your first contact or import a CSV.</td></tr>` :
                    contacts.map(c => _contactRow(c)).join('')}
                </tbody>
            </table>
        </div>

        <!-- Contact Detail Panel (hidden by default) -->
        <div id="contactDetailPanel" class="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-gray-100 transform translate-x-full transition-transform duration-300 z-50 flex flex-col"></div>
        <div id="contactDetailOverlay" class="fixed inset-0 bg-black/20 z-40 hidden" onclick="Contacts.closeDetail()"></div>
        `;
    }

    function _contactRow(c) {
        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
        const color = colors[c.name.charCodeAt(0) % colors.length];
        const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        return `
        <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onclick="Contacts.showDetail('${c.id}')">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">${initials}</div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${_esc(c.name)}</p>
                        <p class="text-xs text-gray-400">${_esc(c.phone)}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">${_esc(c.email)}</td>
            <td class="px-6 py-4 text-sm text-gray-600">${_esc(c.company)}</td>
            <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1">
                    ${(c.tags || []).map(t => `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">${_esc(t)}</span>`).join('')}
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="event.stopPropagation(); Contacts.showEditModal('${c.id}')" class="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button onclick="event.stopPropagation(); Contacts.remove('${c.id}')" class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>`;
    }

    function filterList(q) {
        const contacts = Store.getContacts(_wsId).filter(c =>
            !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase()) || c.company.toLowerCase().includes(q.toLowerCase())
        );
        document.getElementById('contactsTableBody').innerHTML = contacts.length === 0
            ? `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-400 text-sm">No contacts found.</td></tr>`
            : contacts.map(c => _contactRow(c)).join('');
        lucide.createIcons();
    }

    function showAddModal() {
        _showModal('Add Contact', {}, (data) => {
            Store.addContact(_wsId, data);
            App.navigate('contacts');
        });
    }

    function showEditModal(id) {
        const c = Store.getContact(_wsId, id);
        if (!c) return;
        _showModal('Edit Contact', c, (data) => {
            Store.updateContact(_wsId, id, data);
            App.navigate('contacts');
        });
    }

    function _showModal(title, data, onSave) {
        const modal = document.createElement('div');
        modal.id = 'contactModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="fixed inset-0 bg-black/30" onclick="document.getElementById('contactModal').remove()"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-5">${title}</h2>
            <form id="contactForm" class="space-y-4">
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input name="name" value="${_esc(data.name || '')}" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" value="${_esc(data.email || '')}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input name="phone" value="${_esc(data.phone || '')}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input name="company" value="${_esc(data.company || '')}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input name="tags" value="${_esc((data.tags || []).join(', '))}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" rows="3" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none">${_esc(data.notes || '')}</textarea></div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="document.getElementById('contactModal').remove()" class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">Save</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('contactForm').onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            onSave({
                name: fd.get('name'),
                email: fd.get('email'),
                phone: fd.get('phone'),
                company: fd.get('company'),
                tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean),
                notes: fd.get('notes')
            });
            modal.remove();
        };
    }

    function remove(id) {
        if (!confirm('Delete this contact and all related activities?')) return;
        Store.deleteContact(_wsId, id);
        App.navigate('contacts');
    }

    function showDetail(id) {
        const c = Store.getContact(_wsId, id);
        if (!c) return;
        const activities = Store.getActivitiesForContact(_wsId, id);
        const deals = Store.getDeals(_wsId).filter(d => d.contactId === id);
        const tasks = Store.getTasks(_wsId).filter(t => t.contactId === id);
        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
        const color = colors[c.name.charCodeAt(0) % colors.length];
        const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        const actIcons = { call: 'phone', email: 'mail', meeting: 'users', note: 'sticky-note' };
        const actColors = { call: 'text-emerald-600 bg-emerald-50', email: 'text-blue-600 bg-blue-50', meeting: 'text-purple-600 bg-purple-50', note: 'text-amber-600 bg-amber-50' };

        const panel = document.getElementById('contactDetailPanel');
        panel.innerHTML = `
        <div class="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Contact Details</h2>
            <button onclick="Contacts.closeDetail()" class="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white text-lg font-semibold">${initials}</div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${_esc(c.name)}</h3>
                    <p class="text-sm text-gray-500">${_esc(c.company)}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><span class="text-gray-400 block mb-1">Email</span><span class="text-gray-900 font-medium">${_esc(c.email) || '—'}</span></div>
                <div><span class="text-gray-400 block mb-1">Phone</span><span class="text-gray-900 font-medium">${_esc(c.phone) || '—'}</span></div>
            </div>
            ${c.tags.length ? `<div class="flex flex-wrap gap-1.5">${c.tags.map(t => `<span class="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">${_esc(t)}</span>`).join('')}</div>` : ''}
            ${c.notes ? `<div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">${_esc(c.notes)}</div>` : ''}

            <!-- Linked Deals -->
            ${deals.length ? `
            <div>
                <h4 class="text-sm font-semibold text-gray-900 mb-2">Deals (${deals.length})</h4>
                <div class="space-y-2">${deals.map(d => `
                    <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                        <div><p class="text-sm font-medium text-gray-900">${_esc(d.title)}</p><p class="text-xs text-gray-400 capitalize">${d.stage}</p></div>
                        <span class="text-sm font-semibold text-gray-900">$${Number(d.value).toLocaleString()}</span>
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <!-- Linked Tasks -->
            ${tasks.length ? `
            <div>
                <h4 class="text-sm font-semibold text-gray-900 mb-2">Tasks (${tasks.length})</h4>
                <div class="space-y-2">${tasks.map(t => `
                    <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <div class="w-4 h-4 rounded border ${t.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}"></div>
                        <p class="text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-900'}">${_esc(t.title)}</p>
                    </div>`).join('')}
                </div>
            </div>` : ''}

            <!-- Log Activity -->
            <div>
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Log Activity</h4>
                <div class="flex gap-2 mb-3">
                    <select id="actType" class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                        <option value="call">📞 Call</option><option value="email">📧 Email</option><option value="meeting">👥 Meeting</option><option value="note">📝 Note</option>
                    </select>
                    <input id="actContent" placeholder="What happened?" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                    <button onclick="Contacts.logActivity('${c.id}')" class="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Log</button>
                </div>
            </div>

            <!-- Activity Timeline -->
            <div>
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h4>
                ${activities.length === 0 ? '<p class="text-sm text-gray-400">No activities logged yet.</p>' :
                `<div class="space-y-3">${activities.map(a => `
                    <div class="flex gap-3 items-start">
                        <div class="w-8 h-8 rounded-lg ${actColors[a.type] || 'text-gray-600 bg-gray-100'} flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="${actIcons[a.type] || 'activity'}" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm text-gray-700">${_esc(a.content)}</p>
                            <p class="text-xs text-gray-400 mt-1">${_relTime(a.createdAt)}</p>
                        </div>
                        <button onclick="Store.deleteActivity('${_wsId}','${a.id}'); Contacts.showDetail('${c.id}')" class="p-1 text-gray-300 hover:text-red-500 shrink-0"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                    </div>`).join('')}
                </div>`}
            </div>
        </div>`;
        panel.classList.remove('translate-x-full');
        document.getElementById('contactDetailOverlay').classList.remove('hidden');
        lucide.createIcons();
    }

    function closeDetail() {
        document.getElementById('contactDetailPanel').classList.add('translate-x-full');
        document.getElementById('contactDetailOverlay').classList.add('hidden');
    }

    function logActivity(contactId) {
        const type = document.getElementById('actType').value;
        const content = document.getElementById('actContent').value.trim();
        if (!content) return;
        Store.addActivity(_wsId, { type, contactId, content });
        showDetail(contactId);
    }

    async function handleImport(input) {
        if (!input.files[0]) return;
        try {
            const count = await CSV.importContacts(_wsId, input.files[0]);
            alert(`Successfully imported ${count} contacts!`);
            App.navigate('contacts');
        } catch (err) {
            alert('Import failed: ' + err);
        }
        input.value = '';
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _relTime(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    return { init, render, filterList, showAddModal, showEditModal, remove, showDetail, closeDetail, logActivity, handleImport };
})();
