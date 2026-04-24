/**
 * Connector CRM — Spreadsheet-style Contacts Module
 */
const Contacts = (() => {
    let _wsId = null;
    let _sortBy = null;
    let _sortDir = 'asc';
    let _filterQuery = '';
    let _groupBy = null;

    function init(wsId) { 
        _wsId = wsId; 
        _sortBy = null;
        _sortDir = 'asc';
        _filterQuery = '';
        _groupBy = null;
    }

    function render() {
        const schema = Store.getSchema(_wsId);
        const contacts = _getProcessedContacts();

        return `
        <div class="mb-6 flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Contacts</h1>
                    <p class="text-sm text-gray-500 mt-0.5">${contacts.length} total records in this view</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="Contacts.showDedupeModal()" class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                        <i data-lucide="copy-minus" class="w-4 h-4"></i> Remove Duplicates
                    </button>
                    <div class="h-6 w-[1px] bg-gray-200 mx-1"></div>
                    <label class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#0E2925] text-white rounded-lg text-sm font-medium hover:bg-[#153A35] transition-colors">
                        <i data-lucide="upload" class="w-4 h-4"></i> Import CSV
                        <input type="file" accept=".csv" class="hidden" onchange="Contacts.handleImport(this)">
                    </label>
                    <button onclick="CSV.exportContacts('${_wsId}')" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        <i data-lucide="download" class="w-4 h-4"></i> Export
                    </button>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
                <div class="relative min-w-[240px]">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
                    <input type="text" placeholder="Filter records..." value="${_filterQuery}" oninput="Contacts.handleFilter(this.value)"
                        class="w-full pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-gray-200 outline-none">
                </div>
                
                <div class="h-6 w-[1px] bg-gray-100 mx-1"></div>
                
                <div class="flex items-center gap-1.5 whitespace-nowrap">
                    <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Group By:</span>
                    <select onchange="Contacts.handleGroup(this.value)" class="bg-transparent border-none text-sm font-medium text-gray-600 focus:ring-0 cursor-pointer">
                        <option value="">None</option>
                        ${schema.map(h => `<option value="${h}" ${_groupBy === h ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                </div>

                <div class="ml-auto flex items-center gap-2">
                    <button onclick="Contacts.resetSchema()" class="text-[11px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider px-2">Reset Grid</button>
                </div>
            </div>
        </div>

        <!-- Spreadsheet Grid -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm table-fixed">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200">
                            <th class="w-12 border-r border-gray-200 px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">#</th>
                            ${schema.map(h => `
                                <th class="w-48 min-w-[120px] border-r border-gray-200 px-3 py-2 text-left group relative">
                                    <div class="flex items-center justify-between cursor-pointer" onclick="Contacts.handleSort('${h}')">
                                        <span class="font-bold text-gray-500 uppercase tracking-tight text-[11px] truncate">${_esc(h)}</span>
                                        <span class="text-gray-300">
                                            ${_sortBy === h ? (_sortDir === 'asc' ? '↑' : '↓') : ''}
                                        </span>
                                    </div>
                                    <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"></div>
                                </th>
                            `).join('')}
                            <th class="w-16 px-2 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_groupBy ? _renderGroupedRows(contacts, schema) : _renderRows(contacts, schema)}
                        
                        <!-- New Row (Manual Add) -->
                        <tr class="bg-blue-50/30 border-b border-gray-100 group">
                            <td class="border-r border-gray-200 text-center text-gray-300 font-bold text-[10px]"><i data-lucide="plus" class="w-3 h-3 mx-auto"></i></td>
                            ${schema.map(h => `
                                <td class="border-r border-gray-200 p-0">
                                    <input type="text" placeholder="Add ${h}..." 
                                        onkeydown="Contacts.handleQuickAdd(event, this, '${h}')"
                                        class="w-full px-3 py-2 bg-transparent border-none text-sm focus:ring-0 placeholder-gray-300">
                                </td>
                            `).join('')}
                            <td class="px-2 py-2"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        `;
    }

    function _renderRows(contacts, schema) {
        if (contacts.length === 0) return '';
        return contacts.map((c, i) => `
            <tr class="border-b border-gray-100 hover:bg-gray-50/50 group">
                <td class="border-r border-gray-200 px-2 py-2 text-center text-gray-400 font-mono text-[10px] bg-gray-50/30">${i + 1}</td>
                ${schema.map(h => `
                    <td class="border-r border-gray-200 p-0 relative">
                        <input type="text" value="${_esc(c[h] || '')}" 
                            onblur="Contacts.updateCell('${c.id}', '${h}', this.value)"
                            onkeydown="if(event.key==='Enter') this.blur()"
                            class="w-full px-3 py-2 bg-transparent border-none text-sm focus:bg-white focus:shadow-[inset_0_0_0_2px_#3b82f6] outline-none transition-all">
                    </td>
                `).join('')}
                <td class="px-2 py-2 text-center opacity-0 group-hover:opacity-100">
                    <button onclick="Contacts.remove('${c.id}')" class="p-1 text-gray-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function _renderGroupedRows(contacts, schema) {
        const groups = {};
        contacts.forEach(c => {
            const val = c[_groupBy] || '(Empty)';
            if (!groups[val]) groups[val] = [];
            groups[val].push(c);
        });

        return Object.keys(groups).sort().map(groupKey => `
            <tr class="bg-gray-100/50 border-b border-gray-200">
                <td colspan="${schema.length + 2}" class="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                    <i data-lucide="layers" class="w-3 h-3"></i> ${_groupBy}: ${_esc(groupKey)} <span class="text-gray-400 font-normal">(${groups[groupKey].length})</span>
                </td>
            </tr>
            ${_renderRows(groups[groupKey], schema)}
        `).join('');
    }

    // ── Handlers ──

    function updateCell(id, field, value) {
        const c = Store.getContact(_wsId, id);
        if (c && c[field] !== value) {
            const update = {};
            update[field] = value;
            Store.updateContact(_wsId, id, update);
        }
    }

    function handleQuickAdd(e, input, field) {
        if (e.key === 'Enter') {
            const row = input.closest('tr');
            const inputs = row.querySelectorAll('input');
            const schema = Store.getSchema(_wsId);
            const data = {};
            inputs.forEach((inp, idx) => {
                data[schema[idx]] = inp.value.trim();
            });

            if (Object.values(data).some(v => v)) {
                Store.addContact(_wsId, data);
                inputs.forEach(inp => inp.value = '');
                _rerender();
            }
        }
    }

    function showDedupeModal() {
        const schema = Store.getSchema(_wsId);
        const modal = document.createElement('div');
        modal.id = 'dedupeModal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h3 class="text-lg font-bold text-gray-900 mb-2">Remove Duplicates</h3>
                <p class="text-sm text-gray-500 mb-6">Choose a unique field (key) to identify duplicates. Records with the same value in this field will be merged or removed.</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Identify duplicates by:</label>
                        <select id="dedupeKey" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-gray-200 outline-none">
                            ${schema.map(h => `<option value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="Contacts.performDedupe()" class="w-full py-3 bg-[#0E2925] text-white font-bold rounded-xl hover:bg-[#153A35] transition-shadow shadow-lg">Run De-duplication</button>
                    <button onclick="document.getElementById('dedupeModal').remove()" class="w-full py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
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
            } else {
                removed++;
            }
        });

        if (removed > 0) {
            localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(toKeep));
            alert(`Success! Removed ${removed} duplicate records based on "${key}".`);
            document.getElementById('dedupeModal').remove();
            _rerender();
        } else {
            alert('No duplicates found based on that field.');
        }
    }

    function _getProcessedContacts() {
        let contacts = Store.getContacts(_wsId);
        
        if (_filterQuery) {
            const q = _filterQuery.toLowerCase();
            contacts = contacts.filter(c => Object.values(c).some(v => String(v).toLowerCase().includes(q)));
        }

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

    function handleSort(h) {
        if (_sortBy === h) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortBy = h; _sortDir = 'asc'; }
        _rerender();
    }

    function handleFilter(q) {
        _filterQuery = q;
        _rerender();
    }

    function handleGroup(h) {
        _groupBy = h;
        _rerender();
    }

    function resetSchema() {
        if (!confirm('Reset grid? This will revert to default columns.')) return;
        Store.updateSchema(_wsId, ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes']);
        _rerender();
    }

    async function handleImport(input) {
        if (!input.files[0]) return;
        try {
            input.parentElement.classList.add('opacity-50', 'pointer-events-none');
            const count = await CSV.importContacts(_wsId, input.files[0]);
            alert(`Imported ${count} contacts!`);
            _rerender();
        } catch (err) {
            alert('Import failed: ' + err);
        } finally {
            input.parentElement.classList.remove('opacity-50', 'pointer-events-none');
            input.value = '';
        }
    }

    function remove(id) {
        if (confirm('Delete record?')) {
            Store.deleteContact(_wsId, id);
            _rerender();
        }
    }

    function _rerender() {
        const container = document.getElementById('mainContent');
        if (container) {
            container.innerHTML = render();
            lucide.createIcons();
        }
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    return { init, render, handleFilter, handleSort, handleGroup, updateCell, handleQuickAdd, showDedupeModal, performDedupe, resetSchema, remove, handleImport };
})();
