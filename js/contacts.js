/**
 * Connector CRM — Premium Card-based Contacts Module
 * Matches the modern, card-based aesthetic from the reference image.
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
    }

    function render() {
        const contacts = _getProcessedContacts();
        const stats = _getStats();

        return `
        <div class="max-w-5xl mx-auto">
            <!-- Tabs & Actions -->
            <div class="mb-8 flex items-center justify-between">
                <div class="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    ${_renderTab('all', `All Contacts (${stats.all})`)}
                    ${_renderTab('recent', `Recent (${stats.recent})`)}
                    ${_renderTab('tagged', `Tagged (${stats.tagged})`)}
                </div>
                
                <div class="flex items-center gap-3">
                    <button onclick="Contacts.showDedupeModal()" class="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl text-sm font-semibold text-gray-600 border border-gray-100 hover:bg-gray-50 transition-all shadow-sm">
                        <i data-lucide="filter" class="w-4 h-4"></i> Filter
                    </button>
                    <button onclick="Contacts.handleImportPrompt()" class="flex items-center gap-2 px-5 py-2.5 bg-[#FFF9E5] rounded-xl text-sm font-bold text-[#D9A600] hover:bg-[#FFF4D0] transition-all shadow-sm">
                        <i data-lucide="plus" class="w-4 h-4"></i> Add Contact
                    </button>
                </div>
            </div>

            <!-- Bulk Actions (Floating) -->
            ${_selectedIds.size > 0 ? `
            <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
                <span class="text-sm font-bold">${_selectedIds.size} contacts selected</span>
                <div class="h-4 w-[1px] bg-gray-700"></div>
                <div class="flex items-center gap-4">
                    <button onclick="Contacts.bulkDelete()" class="text-sm font-bold text-red-400 hover:text-red-300 flex items-center gap-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                    </button>
                    <button onclick="Contacts.clearSelection()" class="text-sm font-bold text-gray-400 hover:text-white">Cancel</button>
                </div>
            </div>
            ` : ''}

            <!-- Search & Tools -->
            <div class="mb-6 flex items-center justify-between">
                <div class="relative flex-1 max-w-md">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"></i>
                    <input type="text" placeholder="Filter by any field..." value="${_filterQuery}" oninput="Contacts.handleFilter(this.value)"
                        class="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-gray-50 outline-none transition-all card-shadow">
                </div>
                <div class="flex items-center gap-4 ml-4">
                    <button onclick="Contacts.showDedupeModal()" class="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">Remove Duplicates</button>
                    <div class="h-4 w-[1px] bg-gray-200"></div>
                    <button onclick="CSV.exportContacts('${_wsId}')" class="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">Export CSV</button>
                </div>
            </div>

            <!-- Contacts List (Cards) -->
            <div class="space-y-4">
                ${contacts.length === 0 ? `
                    <div class="bg-white rounded-[32px] p-20 text-center border border-dashed border-gray-200">
                        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i data-lucide="users" class="w-10 h-10 text-gray-300"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-900 mb-2">No contacts found</h3>
                        <p class="text-sm text-gray-500 max-w-xs mx-auto mb-8">Import a CSV file to populate your workspace with client data.</p>
                        <button onclick="Contacts.handleImportPrompt()" class="px-8 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl">Import your first CSV</button>
                    </div>
                ` : contacts.map(c => _renderContactCard(c)).join('')}
            </div>
        </div>

        <!-- Hidden input for imports -->
        <input type="file" id="contactImportInput" accept=".csv" class="hidden" onchange="Contacts.handleImport(this)">
        `;
    }

    function _renderTab(id, label) {
        const active = _activeTab === id;
        return `
        <button onclick="Contacts.setTab('${id}')" class="px-6 py-2.5 rounded-[14px] text-sm font-bold transition-all ${active ? 'bg-[#FFF9E5] text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
            ${label}
        </button>`;
    }

    function _renderContactCard(c) {
        const isSelected = _selectedIds.has(c.id);
        const name = Store.getContactName(c);
        const company = c.Company || c.Organization || c.company || 'Private Contact';
        const notes = c.Notes || c.notes || c.Description || 'No additional notes recorded.';
        const tags = Array.isArray(c.Tags) ? c.Tags : (String(c.Tags || '').split(/[;|,]/).map(t => t.trim()).filter(Boolean));
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        // Use a consistent color for the avatar based on name
        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
        const avatarColor = colors[name.charCodeAt(0) % colors.length];

        return `
        <div class="bg-white rounded-[24px] p-6 border border-gray-100 card-shadow group transition-all hover:border-gray-200 hover:shadow-md relative">
            <div class="flex items-start gap-5">
                <!-- Selection -->
                <div class="pt-1">
                    <button onclick="Contacts.toggleSelect('${c.id}')" class="w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-200 hover:border-gray-300'}">
                        ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5 text-white" stroke-width="3"></i>' : ''}
                    </button>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between mb-1">
                        <h3 class="text-[17px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer" onclick="Contacts.showDetail('${c.id}')">${_esc(name)}</h3>
                        
                        <div class="flex items-center gap-2">
                            ${tags.slice(0, 2).map(t => `<span class="px-2.5 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-gray-100">${_esc(t)}</span>`).join('')}
                            ${tags.length > 2 ? `<span class="text-[10px] font-bold text-gray-400">+${tags.length - 2}</span>` : ''}
                        </div>
                    </div>
                    
                    <p class="text-sm text-gray-500 line-clamp-1 mb-4 leading-relaxed">${_esc(notes)}</p>
                    
                    <div class="flex items-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            ${_fmtDate(c.createdAt)}
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="text-gray-300">Related to:</span>
                            <span class="text-amber-500">${_esc(company)}</span>
                        </div>
                    </div>
                </div>

                <!-- Avatar -->
                <div class="shrink-0 flex items-center gap-3">
                    <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-gray-100">${initials}</div>
                </div>
            </div>
        </div>`;
    }

    function _getProcessedContacts() {
        let contacts = Store.getContacts(_wsId);
        
        if (_activeTab === 'recent') {
            contacts = contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
        } else if (_activeTab === 'tagged') {
            contacts = contacts.filter(c => {
                const tags = Array.isArray(c.Tags) ? c.Tags : (String(c.Tags || '').split(/[;|,]/).filter(Boolean));
                return tags.length > 0;
            });
        }

        if (_filterQuery) {
            const q = _filterQuery.toLowerCase();
            contacts = contacts.filter(c => Object.values(c).some(v => String(v).toLowerCase().includes(q)));
        }

        return contacts;
    }

    function _getStats() {
        const all = Store.getContacts(_wsId);
        return {
            all: all.length,
            recent: Math.min(all.length, 20),
            tagged: all.filter(c => (c.Tags || c.tags)).length
        };
    }

    function setTab(tab) { _activeTab = tab; _rerender(); }
    function handleFilter(q) { _filterQuery = q; _rerender(); }
    function toggleSelect(id) { if (_selectedIds.has(id)) _selectedIds.delete(id); else _selectedIds.add(id); _rerender(); }
    function clearSelection() { _selectedIds.clear(); _rerender(); }
    
    function handleImportPrompt() {
        document.getElementById('contactImportInput').click();
    }

    async function handleImport(input) {
        if (!input.files[0]) return;
        try {
            const count = await CSV.importContacts(_wsId, input.files[0]);
            alert(`Success! Imported ${count} contacts.`);
            _rerender();
        } catch (err) {
            alert('Import failed: ' + err);
        } finally {
            input.value = '';
        }
    }

    function showDedupeModal() {
        const schema = Store.getSchema(_wsId);
        const modal = document.createElement('div');
        modal.id = 'dedupeModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                <h3 class="text-xl font-bold text-gray-900 mb-2">Clean your data</h3>
                <p class="text-sm text-gray-500 mb-8 leading-relaxed">Choose a field to identify duplicates. We'll merge records that share the same value.</p>
                
                <div class="space-y-6">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Matching Field</label>
                        <select id="dedupeKey" class="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-gray-50 outline-none">
                            ${schema.map(h => `<option value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="Contacts.performDedupe()" class="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">Remove Duplicates</button>
                    <button onclick="document.getElementById('dedupeModal').remove()" class="w-full py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
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
            if (!val || !seen.has(val)) {
                if (val) seen.add(val);
                toKeep.push(c);
            } else { removed++; }
        });

        if (removed > 0) {
            localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(toKeep));
            alert(`Removed ${removed} duplicates based on "${key}".`);
            document.getElementById('dedupeModal').remove();
            _rerender();
        } else {
            alert('Perfect! No duplicates found.');
        }
    }

    function bulkDelete() {
        if (!confirm(`Delete ${_selectedIds.size} contacts forever?`)) return;
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

    function showDetail(id) {
        // We'll keep the detail panel as a side drawer for a premium feel
        const c = Store.getContact(_wsId, id);
        if (!c) return;
        
        // This is a placeholder for a richer detail view if needed later
        alert(`Details for ${Store.getContactName(c)}:\n\n${Object.entries(c).map(([k,v])=>`${k}: ${v}`).join('\n')}`);
    }

    function _rerender() {
        const container = document.getElementById('mainContent');
        if (container) { container.innerHTML = render(); lucide.createIcons(); }
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _fmtDate(iso) {
        if (!iso) return 'Unknown';
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return { init, render, handleFilter, setTab, toggleSelect, clearSelection, bulkDelete, remove, performDedupe, showDedupeModal, handleImport, handleImportPrompt, showDetail };
})();
