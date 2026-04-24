/**
 * Connector CRM — Contacts Module (Dynamic Airtable-style)
 */
const Contacts = (() => {
    let _wsId = null;
    let _sortBy = null;
    let _sortDir = 'asc';
    let _filterQuery = '';

    function init(wsId) { 
        _wsId = wsId; 
        _sortBy = null;
        _sortDir = 'asc';
        _filterQuery = '';
    }

    function render() {
        const schema = Store.getSchema(_wsId);
        const contacts = _getProcessedContacts();

        return `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Contacts</h1>
                <p class="text-sm text-gray-500 mt-1">${contacts.length} filtered contacts</p>
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

        <!-- Search & Tools -->
        <div class="mb-5 flex items-center justify-between gap-4">
            <div class="relative max-w-md flex-1">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><i data-lucide="search" class="w-4 h-4 text-gray-400"></i></div>
                <input type="text" id="contactSearch" placeholder="Filter by any field..." value="${_filterQuery}" oninput="Contacts.handleFilter(this.value)"
                    class="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm">
            </div>
            <div class="flex items-center gap-2">
                <button onclick="Contacts.resetSchema()" class="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1">Reset Columns</button>
            </div>
        </div>

        <!-- Dynamic Table -->
        <div class="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-sm">
            <table class="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr class="border-b border-gray-100 bg-gray-50/50">
                        <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">#</th>
                        ${schema.map(header => `
                            <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                                onclick="Contacts.handleSort('${header}')">
                                <div class="flex items-center gap-1.5">
                                    ${_esc(header)}
                                    <span class="opacity-0 group-hover:opacity-100 transition-opacity">
                                        ${_sortBy === header ? 
                                            (_sortDir === 'asc' ? '<i data-lucide="arrow-up" class="w-3 h-3 text-gray-900"></i>' : '<i data-lucide="arrow-down" class="w-3 h-3 text-gray-900"></i>') 
                                            : '<i data-lucide="chevrons-up-down" class="w-3 h-3 text-gray-300"></i>'}
                                    </span>
                                </div>
                            </th>
                        `).join('')}
                        <th class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody id="contactsTableBody">
                    ${contacts.length === 0 ? `<tr><td colspan="${schema.length + 2}" class="px-6 py-12 text-center text-gray-400 text-sm">
                        No contacts found matching your criteria. Try importing a CSV or adding one manually.
                    </td></tr>` : 
                    contacts.map((c, idx) => _contactRow(c, idx, schema)).join('')}
                </tbody>
            </table>
        </div>

        <!-- Detail Panels -->
        <div id="contactDetailPanel" class="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl border-l border-gray-100 transform translate-x-full transition-transform duration-300 z-50 flex flex-col"></div>
        <div id="contactDetailOverlay" class="fixed inset-0 bg-black/20 z-40 hidden" onclick="Contacts.closeDetail()"></div>
        `;
    }

    function _getProcessedContacts() {
        let contacts = Store.getContacts(_wsId);
        
        // Filtering
        if (_filterQuery) {
            const q = _filterQuery.toLowerCase();
            contacts = contacts.filter(c => {
                return Object.values(c).some(val => String(val).toLowerCase().includes(q));
            });
        }

        // Sorting
        if (_sortBy) {
            contacts.sort((a, b) => {
                const valA = String(a[_sortBy] || '').toLowerCase();
                const valB = String(b[_sortBy] || '').toLowerCase();
                if (valA < valB) return _sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return _sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return contacts;
    }

    function _contactRow(c, index, schema) {
        const nameVal = c['Name'] || Object.values(c)[0] || 'Unknown';
        const initials = String(nameVal).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        return `
        <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onclick="Contacts.showDetail('${c.id}')">
            <td class="px-6 py-4">
                <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-xs font-medium">${index + 1}</div>
            </td>
            ${schema.map(header => {
                const val = c[header] || '';
                const isEmail = String(header).toLowerCase().includes('email');
                const isTags = String(header).toLowerCase().includes('tag');
                
                if (isTags && val) {
                    const tags = String(val).split(/[;|,]/).map(t => t.trim()).filter(Boolean);
                    return `<td class="px-6 py-4"><div class="flex flex-wrap gap-1">${tags.map(t => `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-md border border-gray-200">${_esc(t)}</span>`).join('')}</div></td>`;
                }

                return `
                <td class="px-6 py-4 max-w-[200px] truncate">
                    <span class="text-sm ${isEmail ? 'text-blue-600 hover:underline' : 'text-gray-600'}">${_esc(val)}</span>
                </td>`;
            }).join('')}
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1">
                    <button onclick="event.stopPropagation(); Contacts.showEditModal('${c.id}')" class="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button onclick="event.stopPropagation(); Contacts.remove('${c.id}')" class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`;
    }

    function handleSort(header) {
        if (_sortBy === header) {
            _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            _sortBy = header;
            _sortDir = 'asc';
        }
        _rerender();
    }

    function handleFilter(q) {
        _filterQuery = q;
        _rerender();
    }

    function _rerender() {
        const container = document.getElementById('mainContent');
        container.innerHTML = render();
        lucide.createIcons();
    }

    function showAddModal() {
        const schema = Store.getSchema(_wsId);
        _showModal('Add New Contact', schema, {}, (data) => {
            Store.addContact(_wsId, data);
            _rerender();
        });
    }

    function showEditModal(id) {
        const c = Store.getContact(_wsId, id);
        if (!c) return;
        const schema = Store.getSchema(_wsId);
        _showModal('Edit Contact', schema, c, (data) => {
            Store.updateContact(_wsId, id, data);
            _rerender();
        });
    }

    function _showModal(title, schema, data, onSave) {
        const modal = document.createElement('div');
        modal.id = 'contactModal';
        modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" onclick="document.getElementById('contactModal').remove()"></div>
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 class="text-xl font-bold text-gray-900">${title}</h2>
                <button onclick="document.getElementById('contactModal').remove()" class="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <form id="contactForm" class="flex-1 overflow-y-auto p-8">
                <div class="grid grid-cols-2 gap-6">
                    ${schema.map(header => `
                        <div class="${header.toLowerCase().includes('note') ? 'col-span-2' : ''}">
                            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">${_esc(header)}</label>
                            ${header.toLowerCase().includes('note') ? 
                                `<textarea name="${header}" rows="4" class="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none">${_esc(data[header] || '')}</textarea>` :
                                `<input name="${header}" value="${_esc(data[header] || '')}" class="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">`
                            }
                        </div>
                    `).join('')}
                </div>
            </form>
            <div class="px-8 py-6 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
                <button type="button" onclick="document.getElementById('contactModal').remove()" class="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" form="contactForm" class="flex-1 px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-lg">Save Changes</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
        lucide.createIcons();

        document.getElementById('contactForm').onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const entry = {};
            schema.forEach(h => entry[h] = fd.get(h));
            onSave(entry);
            modal.remove();
        };
    }

    function showDetail(id) {
        const c = Store.getContact(_wsId, id);
        if (!c) return;
        const schema = Store.getSchema(_wsId);
        const activities = Store.getActivitiesForContact(_wsId, id);
        
        const nameVal = c['Name'] || Object.values(c)[0] || 'Unknown';
        const initials = String(nameVal).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        const panel = document.getElementById('contactDetailPanel');
        panel.innerHTML = `
        <div class="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h2 class="text-lg font-bold text-gray-900">Contact Details</h2>
            <button onclick="Contacts.closeDetail()" class="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div class="flex-1 overflow-y-auto p-8 space-y-8">
            <!-- Header -->
            <div class="flex items-center gap-5">
                <div class="w-16 h-16 bg-gray-900 text-white rounded-[24px] flex items-center justify-center text-xl font-bold shadow-xl shadow-gray-200">${initials}</div>
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${_esc(nameVal)}</h3>
                    <p class="text-sm text-gray-400 font-medium">${_esc(c['Company'] || c['Organization'] || '')}</p>
                </div>
            </div>

            <!-- Dynamic Fields (Grid) -->
            <div class="grid grid-cols-2 gap-y-6 gap-x-4">
                ${schema.map(header => {
                    const val = c[header] || '—';
                    return `
                    <div class="${header.toLowerCase().includes('note') ? 'col-span-2' : ''}">
                        <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">${_esc(header)}</span>
                        <div class="text-sm text-gray-900 font-medium ${header.toLowerCase().includes('note') ? 'bg-gray-50 p-4 rounded-2xl border border-gray-100' : ''}">${_esc(val)}</div>
                    </div>`;
                }).join('')}
            </div>

            <!-- Activity Log -->
            <div class="pt-6 border-t border-gray-100">
                <h4 class="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i data-lucide="activity" class="w-4 h-4 text-emerald-500"></i> Activity Timeline
                </h4>
                <div class="flex gap-2 mb-6">
                    <input id="actContent" placeholder="Log a note or update..." class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                    <button onclick="Contacts.logActivity('${c.id}')" class="px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-shadow">Log</button>
                </div>
                <div class="space-y-4">
                    ${activities.length === 0 ? '<p class="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">No activity logged yet.</p>' :
                    activities.map(a => `
                        <div class="flex gap-4 items-start relative group">
                            <div class="w-1 h-full bg-gray-50 absolute left-[15px] top-4 -z-10"></div>
                            <div class="w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                <i data-lucide="message-square" class="w-3.5 h-3.5 text-gray-400"></i>
                            </div>
                            <div class="flex-1 min-w-0 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                                <p class="text-sm text-gray-700 leading-relaxed">${_esc(a.content)}</p>
                                <p class="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-wider">${_relTime(a.createdAt)}</p>
                            </div>
                        </div>`).join('')}
                </div>
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
        const content = document.getElementById('actContent').value.trim();
        if (!content) return;
        Store.addActivity(_wsId, { type: 'note', contactId, content });
        showDetail(contactId);
    }

    function resetSchema() {
        if (!confirm('This will reset the columns to the default (Name, Email, Phone...). Continue?')) return;
        Store.updateSchema(_wsId, ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes']);
        _rerender();
    }

    async function handleImport(input) {
        if (!input.files[0]) return;
        const file = input.files[0];
        try {
            input.parentElement.classList.add('opacity-50', 'pointer-events-none');
            const count = await CSV.importContacts(_wsId, file);
            alert(`Successfully imported ${count} contacts and updated the column schema!`);
            _rerender();
        } catch (err) {
            console.error('Import Error:', err);
            alert('Import failed: ' + err);
        } finally {
            input.parentElement.classList.remove('opacity-50', 'pointer-events-none');
            input.value = '';
        }
    }

    function remove(id) {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        Store.deleteContact(_wsId, id);
        _rerender();
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _relTime(iso) {
        const diff = (Date.now() - new Date(iso).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        return Math.floor(diff / 86400) + 'd ago';
    }

    return { init, render, handleFilter, handleSort, showAddModal, showEditModal, remove, showDetail, closeDetail, logActivity, handleImport, resetSchema };
})();
