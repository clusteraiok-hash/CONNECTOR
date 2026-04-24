/**
 * Connector CRM — Dynamic Premium Contacts Module
 * Fully adaptive cards that display all CSV fields dynamically.
 */
const Contacts = (() => {
    let _wsId = null;
    let _sortBy = 'createdAt';
    let _sortDir = 'desc';
    let _filterQuery = '';
    let _selectedIds = new Set();
    let _activeTab = 'all';

    function init(wsId) { 
        _wsId = wsId; 
        _selectedIds.clear();
        _filterQuery = '';
        _sortBy = 'createdAt';
    }

    function render() {
        const schema = Store.getSchema(_wsId);
        const contacts = _getProcessedContacts();
        const stats = _getStats();

        return `
        <div class="max-w-6xl mx-auto">
            <!-- Header Tabs & Main Actions -->
            <div class="mb-8 flex items-center justify-between">
                <div class="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                    ${_renderTab('all', `All Contacts (${stats.all})`)}
                    ${_renderTab('recent', `Recent`)}
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="Contacts.deleteAll()" class="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 hover:bg-red-100 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Delete All
                    </button>
                    <div class="w-[1px] h-6 bg-gray-200 mx-1"></div>
                    <button onclick="Contacts.handleImportPrompt()" class="flex items-center gap-2 px-5 py-2.5 bg-[#FFF9E5] rounded-xl text-sm font-bold text-[#D9A600] hover:bg-[#FFF4D0] transition-all shadow-sm">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Contact
                    </button>
                </div>
            </div>

            <!-- Toolbar: Search & Sort -->
            <div class="mb-6 bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"></i>
                    <input type="text" placeholder="Search across all fields..." value="${_filterQuery}" oninput="Contacts.handleFilter(this.value)"
                        class="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-100 outline-none transition-all">
                </div>
                
                <div class="flex items-center gap-3 whitespace-nowrap">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort by:</span>
                    <select onchange="Contacts.handleSort(this.value)" class="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer">
                        <option value="createdAt" ${_sortBy === 'createdAt' ? 'selected' : ''}>Date Added</option>
                        ${schema.map(h => `<option value="${h}" ${_sortBy === h ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                    <button onclick="Contacts.toggleSortDir()" class="p-2 text-gray-400 hover:text-gray-900">
                        <i data-lucide="${_sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="w-4 h-4"></i>
                    </button>
                </div>

                <div class="h-6 w-[1px] bg-gray-100 hidden md:block"></div>

                <div class="flex items-center gap-4">
                    <button onclick="Contacts.showDedupeModal()" class="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">Remove Duplicates</button>
                    <button onclick="CSV.exportContacts('${_wsId}')" class="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">Export</button>
                </div>
            </div>

            <!-- Selection Toolbar (Floating) -->
            ${_selectedIds.size > 0 ? `
            <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-5 rounded-[32px] shadow-2xl flex items-center gap-8 z-50 animate-in slide-in-from-bottom-8 duration-500">
                <div class="flex flex-col">
                    <span class="text-sm font-bold">${_selectedIds.size} Selected</span>
                    <span class="text-[10px] text-gray-500 uppercase tracking-widest">Bulk Actions</span>
                </div>
                <div class="flex items-center gap-4">
                    <button onclick="Contacts.bulkDelete()" class="px-5 py-2.5 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                    </button>
                    <button onclick="Contacts.clearSelection()" class="text-sm font-bold text-gray-400 hover:text-white transition-colors">Deselect All</button>
                </div>
            </div>
            ` : ''}

            <!-- Contacts Grid -->
            <div class="grid grid-cols-1 gap-4">
                ${contacts.length === 0 ? `
                    <div class="bg-white rounded-[40px] p-24 text-center border border-dashed border-gray-200">
                        <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <i data-lucide="users" class="w-12 h-12 text-gray-300"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900 mb-2">Workspace is Empty</h2>
                        <p class="text-gray-400 mb-10 max-w-sm mx-auto">Your CRM will automatically adapt to any CSV you upload. All columns will be converted into dynamic cards.</p>
                        <button onclick="Contacts.handleImportPrompt()" class="px-10 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200">Import CSV File</button>
                    </div>
                ` : contacts.map(c => _renderDynamicCard(c, schema)).join('')}
            </div>
        </div>

        <input type="file" id="contactImportInput" accept=".csv" class="hidden" onchange="Contacts.handleImport(this)">
        `;
    }

    function _renderTab(id, label) {
        const active = _activeTab === id;
        return `
        <button onclick="Contacts.setTab('${id}')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}">
            ${label}
        </button>`;
    }

    function _renderDynamicCard(c, schema) {
        const isSelected = _selectedIds.has(c.id);
        const name = _getBestName(c, schema);
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        // Pick primary info (first 3 fields that aren't name)
        const otherFields = schema.filter(h => h !== name && !['id', 'createdAt'].includes(h.toLowerCase()));
        const highlights = otherFields.slice(0, 3);
        const remaining = otherFields.slice(3);

        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
        const avatarColor = colors[name.charCodeAt(0) % colors.length];

        return `
        <div class="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm group transition-all hover:border-gray-300 hover:shadow-xl relative overflow-hidden">
            <div class="flex flex-col md:flex-row gap-8 items-start">
                
                <!-- Left: Selection & Avatar -->
                <div class="flex items-center gap-6 shrink-0">
                    <button onclick="Contacts.toggleSelect('${c.id}')" class="w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-200 hover:border-gray-400'}">
                        ${isSelected ? '<i data-lucide="check" class="w-4 h-4 text-white" stroke-width="3"></i>' : ''}
                    </button>
                    <div class="w-16 h-16 ${avatarColor} rounded-[24px] flex items-center justify-center text-white text-xl font-bold shadow-xl shadow-gray-100">${initials}</div>
                </div>

                <!-- Middle: Primary Info -->
                <div class="flex-1 min-w-0">
                    <h3 class="text-2xl font-bold text-gray-900 mb-4 truncate">${_esc(name)}</h3>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                        ${highlights.map(h => `
                            <div>
                                <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">${_esc(h)}</span>
                                <p class="text-sm font-semibold text-gray-700 truncate">${_esc(c[h] || '—')}</p>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Additional Fields Grid (Adaptive) -->
                    ${remaining.length > 0 ? `
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 pt-6 border-t border-gray-50">
                        ${remaining.map(h => `
                            <div>
                                <span class="block text-[9px] font-bold text-gray-300 uppercase tracking-wider mb-1">${_esc(h)}</span>
                                <p class="text-xs text-gray-500 truncate">${_esc(c[h] || '—')}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}
                </div>

                <!-- Right: Meta -->
                <div class="shrink-0 flex flex-col items-end gap-2 self-stretch justify-between">
                    <div class="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-gray-400"></i>
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">${_fmtDate(c.createdAt)}</span>
                    </div>
                    <button onclick="Contacts.remove('${c.id}')" class="p-2.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }

    function _getBestName(c, schema) {
        // Find the "Name" field or the first field that looks like a name
        const nameKey = schema.find(h => h.toLowerCase() === 'name' || h.toLowerCase() === 'full name' || h.toLowerCase() === 'contact');
        if (nameKey && c[nameKey]) return c[nameKey];
        
        // Otherwise, skip technical IDs and find the first non-empty string
        const val = Object.entries(c).find(([k, v]) => {
            return !['id', 'createdAt'].includes(k.toLowerCase()) && v && typeof v === 'string' && v.length > 2;
        });
        return val ? val[1] : 'Unnamed Contact';
    }

    function _getProcessedContacts() {
        let contacts = Store.getContacts(_wsId);
        
        if (_activeTab === 'recent') {
            contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            contacts = contacts.slice(0, 20);
        }

        // Filtering
        if (_filterQuery) {
            const q = _filterQuery.toLowerCase();
            contacts = contacts.filter(c => {
                return Object.entries(c).some(([k, v]) => {
                    if (['id', 'createdat'].includes(k.toLowerCase())) return false;
                    return String(v).toLowerCase().includes(q);
                });
            });
        }

        // Sorting
        if (_sortBy) {
            contacts.sort((a, b) => {
                let valA = a[_sortBy] || '';
                let valB = b[_sortBy] || '';
                
                if (_sortBy === 'createdAt') {
                    valA = new Date(valA);
                    valB = new Date(valB);
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }

                if (valA < valB) return _sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return _sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return contacts;
    }

    function _getStats() {
        return { all: Store.getContacts(_wsId).length };
    }

    function setTab(tab) { _activeTab = tab; _rerender(); }
    function handleFilter(q) { _filterQuery = q; _rerender(); }
    function handleSort(s) { _sortBy = s; _rerender(); }
    function toggleSortDir() { _sortDir = _sortDir === 'asc' ? 'desc' : 'asc'; _rerender(); }
    function toggleSelect(id) { if (_selectedIds.has(id)) _selectedIds.delete(id); else _selectedIds.add(id); _rerender(); }
    function clearSelection() { _selectedIds.clear(); _rerender(); }
    
    function deleteAll() {
        if (!confirm('EXTREME ACTION: Permanently delete ALL contacts in this workspace? This cannot be undone.')) return;
        localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify([]));
        _rerender();
    }

    function bulkDelete() {
        if (!confirm(`Delete ${_selectedIds.size} contacts?`)) return;
        const all = Store.getContacts(_wsId);
        const remaining = all.filter(c => !_selectedIds.has(c.id));
        localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(remaining));
        _selectedIds.clear();
        _rerender();
    }

    function remove(id) {
        if (!confirm('Delete this contact?')) return;
        Store.deleteContact(_wsId, id);
        _rerender();
    }

    function showDedupeModal() {
        const schema = Store.getSchema(_wsId);
        const modal = document.createElement('div');
        modal.id = 'dedupeModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-10 animate-in fade-in zoom-in duration-300">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Smart Deduplication</h3>
                <p class="text-sm text-gray-500 mb-8 leading-relaxed">Choose a primary key to identify duplicates. We'll merge records that share the same value in this column.</p>
                
                <div class="space-y-6">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Primary Key</label>
                        <select id="dedupeKey" class="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-gray-50 outline-none">
                            ${schema.map(h => `<option value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="Contacts.performDedupe()" class="w-full py-5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-2xl">Clean Data Now</button>
                    <button onclick="document.getElementById('dedupeModal').remove()" class="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Dismiss</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons();
    }

    function performDedupe() {
        const key = document.getElementById('dedupeKey').value;
        const contacts = Store.getContacts(_wsId);
        const seen = new Set();
        const toKeep = [];
        let removed = 0;
        contacts.forEach(c => {
            const val = String(c[key] || '').trim().toLowerCase();
            if (!val || !seen.has(val)) { if (val) seen.add(val); toKeep.push(c); } else { removed++; }
        });
        if (removed > 0) {
            localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(toKeep));
            alert(`Cleaned! Removed ${removed} duplicates.`);
            document.getElementById('dedupeModal').remove();
            _rerender();
        } else { alert('Data is already clean!'); }
    }

    function handleImportPrompt() { document.getElementById('contactImportInput').click(); }

    async function handleImport(input) {
        if (!input.files[0]) return;
        try {
            const count = await CSV.importContacts(_wsId, input.files[0]);
            alert(`Success! ${count} records added.`);
            _rerender();
        } catch (err) { alert('Import failed: ' + err); } finally { input.value = ''; }
    }

    function _rerender() {
        const container = document.getElementById('mainContent');
        if (container) { container.innerHTML = render(); lucide.createIcons(); }
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _fmtDate(iso) {
        if (!iso) return 'Just now';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return { init, render, handleFilter, handleSort, toggleSortDir, setTab, toggleSelect, clearSelection, bulkDelete, remove, deleteAll, performDedupe, showDedupeModal, handleImport, handleImportPrompt };
})();
