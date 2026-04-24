/**
 * Connector CRM — Advanced Spreadsheet Contacts Module
 * Supports multi-selection, bulk delete, and column management.
 */
const Contacts = (() => {
    let _wsId = null;
    let _sortBy = null;
    let _sortDir = 'asc';
    let _filterQuery = '';
    let _groupBy = null;
    let _selectedIds = new Set();
    let _selectedHeaders = new Set();

    function init(wsId) { 
        _wsId = wsId; 
        _sortBy = null;
        _sortDir = 'asc';
        _filterQuery = '';
        _groupBy = null;
        _selectedIds.clear();
        _selectedHeaders.clear();
    }

    function render() {
        const schema = Store.getSchema(_wsId);
        const contacts = _getProcessedContacts();
        const hasSelection = _selectedIds.size > 0 || _selectedHeaders.size > 0;

        return `
        <div class="mb-6 flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Contacts</h1>
                    <p class="text-sm text-gray-500 mt-0.5">${contacts.length} records · ${hasSelection ? `<span class="text-[#0E2925] font-bold">${_selectedIds.size} rows, ${_selectedHeaders.size} columns selected</span>` : 'spreadsheet mode'}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${hasSelection ? `
                        <button onclick="Contacts.bulkDelete()" class="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors border border-red-100">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Selected
                        </button>
                        <button onclick="Contacts.clearSelection()" class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600">Cancel</button>
                    ` : `
                        <button onclick="Contacts.showDedupeModal()" class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                            <i data-lucide="copy-minus" class="w-4 h-4"></i> Dedupe
                        </button>
                        <div class="h-6 w-[1px] bg-gray-200 mx-1"></div>
                        <label class="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#0E2925] text-white rounded-lg text-sm font-medium hover:bg-[#153A35] transition-colors">
                            <i data-lucide="upload" class="w-4 h-4"></i> Import
                            <input type="file" accept=".csv" class="hidden" onchange="Contacts.handleImport(this)">
                        </label>
                        <button onclick="CSV.exportContacts('${_wsId}')" class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            <i data-lucide="download" class="w-4 h-4"></i> Export
                        </button>
                    `}
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

                <div class="h-6 w-[1px] bg-gray-100 mx-1"></div>

                <button onclick="Contacts.showAddColumnModal()" class="flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-gray-900 transition-colors">
                    <i data-lucide="plus-square" class="w-4 h-4"></i> <span class="text-xs font-bold uppercase tracking-wider">New Column</span>
                </button>

                <div class="ml-auto flex items-center gap-2">
                    <button onclick="Contacts.resetSchema()" class="text-[11px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider px-2">Reset Grid</button>
                </div>
            </div>
        </div>

        <!-- Spreadsheet Grid -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm table-fixed min-w-full">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-200 select-none">
                            <th class="w-10 border-r border-gray-200 px-2 py-2 text-center">
                                <input type="checkbox" onchange="Contacts.toggleSelectAll(this.checked)" ${contacts.length > 0 && _selectedIds.size === contacts.length ? 'checked' : ''} class="rounded border-gray-300 text-[#0E2925] focus:ring-[#0E2925]">
                            </th>
                            <th class="w-12 border-r border-gray-200 px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">#</th>
                            ${schema.map(h => `
                                <th class="w-48 min-w-[160px] border-r border-gray-200 p-0 relative group ${_selectedHeaders.has(h) ? 'bg-blue-50' : ''}">
                                    <div class="flex flex-col h-full">
                                        <div class="flex items-center justify-between px-3 py-2 cursor-pointer border-b border-gray-100" onclick="Contacts.handleSort('${h}')">
                                            <span class="font-bold text-gray-500 uppercase tracking-tight text-[11px] truncate">${_esc(h)}</span>
                                            <span class="text-gray-400">
                                                ${_sortBy === h ? (_sortDir === 'asc' ? '↑' : '↓') : ''}
                                            </span>
                                        </div>
                                        <div class="flex items-center justify-center gap-4 py-1 bg-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="Contacts.toggleHeaderSelect('${h}')" title="Select Column" class="p-1 ${_selectedHeaders.has(h) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-600'}"><i data-lucide="check-square" class="w-3.5 h-3.5"></i></button>
                                            <button onclick="Contacts.deleteColumn('${h}')" title="Delete Column" class="p-1 text-gray-300 hover:text-red-500"><i data-lucide="x-circle" class="w-3.5 h-3.5"></i></button>
                                        </div>
                                    </div>
                                    <div class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"></div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${_groupBy ? _renderGroupedRows(contacts, schema) : _renderRows(contacts, schema)}
                        
                        <!-- New Row -->
                        <tr class="bg-blue-50/20 border-b border-gray-100">
                            <td class="border-r border-gray-200"></td>
                            <td class="border-r border-gray-200 text-center text-gray-300 font-bold text-[10px]"><i data-lucide="plus" class="w-3 h-3 mx-auto"></i></td>
                            ${schema.map(h => `
                                <td class="border-r border-gray-200 p-0">
                                    <input type="text" placeholder="New ${h}..." 
                                        onkeydown="Contacts.handleQuickAdd(event, this, '${h}')"
                                        class="w-full px-3 py-2.5 bg-transparent border-none text-sm focus:ring-0 placeholder-gray-300">
                                </td>
                            `).join('')}
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
            <tr class="border-b border-gray-100 hover:bg-gray-50/50 group ${_selectedIds.has(c.id) ? 'bg-blue-50/50' : ''}">
                <td class="border-r border-gray-200 px-2 py-2 text-center">
                    <input type="checkbox" onchange="Contacts.toggleSelect('${c.id}')" ${_selectedIds.has(c.id) ? 'checked' : ''} class="rounded border-gray-300 text-[#0E2925] focus:ring-[#0E2925]">
                </td>
                <td class="border-r border-gray-200 px-2 py-2 text-center text-gray-400 font-mono text-[10px] bg-gray-50/30">${i + 1}</td>
                ${schema.map(h => `
                    <td class="border-r border-gray-200 p-0 relative ${_selectedHeaders.has(h) ? 'bg-blue-50/30' : ''}">
                        <input type="text" value="${_esc(c[h] || '')}" 
                            onblur="Contacts.updateCell('${c.id}', '${h}', this.value)"
                            onkeydown="if(event.key==='Enter') this.blur()"
                            class="w-full px-3 py-2 bg-transparent border-none text-sm focus:bg-white focus:shadow-[inset_0_0_0_2px_#3b82f6] outline-none transition-all">
                    </td>
                `).join('')}
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
            <tr class="bg-gray-50 border-b border-gray-200">
                <td colspan="${schema.length + 2}" class="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <i data-lucide="layers" class="w-3 h-3"></i> ${_groupBy}: <span class="text-gray-900">${_esc(groupKey)}</span> <span class="font-normal lowercase">(${groups[groupKey].length} records)</span>
                </td>
            </tr>
            ${_renderRows(groups[groupKey], schema)}
        `).join('');
    }

    // ── Selection Logic ──

    function toggleSelect(id) {
        if (_selectedIds.has(id)) _selectedIds.delete(id);
        else _selectedIds.add(id);
        _rerender();
    }

    function toggleSelectAll(checked) {
        if (checked) {
            const contacts = _getProcessedContacts();
            contacts.forEach(c => _selectedIds.add(c.id));
        } else {
            _selectedIds.clear();
        }
        _rerender();
    }

    function toggleHeaderSelect(h) {
        if (_selectedHeaders.has(h)) _selectedHeaders.delete(h);
        else _selectedHeaders.add(h);
        _rerender();
    }

    function clearSelection() {
        _selectedIds.clear();
        _selectedHeaders.clear();
        _rerender();
    }

    // ── Bulk Actions ──

    function bulkDelete() {
        const rowCount = _selectedIds.size;
        const colCount = _selectedHeaders.size;
        
        let msg = `Are you sure you want to:`;
        if (rowCount > 0) msg += `\n- Delete ${rowCount} rows`;
        if (colCount > 0) msg += `\n- CLEAR data in ${colCount} columns`;
        
        if (!confirm(msg)) return;

        // Delete rows
        if (rowCount > 0) {
            const allContacts = Store.getContacts(_wsId);
            const remaining = allContacts.filter(c => !_selectedIds.has(c.id));
            localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(remaining));
            _selectedIds.clear();
        }

        // Clear columns
        if (colCount > 0) {
            const allContacts = Store.getContacts(_wsId);
            const headersToClear = Array.from(_selectedHeaders);
            const updated = allContacts.map(c => {
                const newC = { ...c };
                headersToClear.forEach(h => newC[h] = '');
                return newC;
            });
            localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(updated));
            _selectedHeaders.clear();
        }

        _rerender();
    }

    function deleteColumn(h) {
        if (!confirm(`Permanently delete the entire column "${h}"? This will remove the column from the workspace and delete all data within it.`)) return;
        
        const schema = Store.getSchema(_wsId);
        const newSchema = schema.filter(header => header !== h);
        Store.updateSchema(_wsId, newSchema);

        // Optional: clean up data in contacts objects
        const contacts = Store.getContacts(_wsId);
        const cleaned = contacts.map(c => {
            const newC = { ...c };
            delete newC[h];
            return newC;
        });
        localStorage.setItem('connector_contacts_' + _wsId, JSON.stringify(cleaned));
        
        _rerender();
    }

    function showAddColumnModal() {
        const name = prompt('Enter new column name:');
        if (name && name.trim()) {
            const schema = Store.getSchema(_wsId);
            if (schema.some(h => h.toLowerCase() === name.trim().toLowerCase())) {
                alert('Column already exists!');
                return;
            }
            schema.push(name.trim());
            Store.updateSchema(_wsId, schema);
            _rerender();
        }
    }

    // ── Existing Handlers ──

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

    function handleFilter(q) { _filterQuery = q; _rerender(); }
    function handleGroup(h) { _groupBy = h; _rerender(); }
    
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

    function _rerender() {
        const container = document.getElementById('mainContent');
        if (container) {
            container.innerHTML = render();
            lucide.createIcons();
        }
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    return { init, render, handleFilter, handleSort, handleGroup, updateCell, handleQuickAdd, toggleSelect, toggleSelectAll, toggleHeaderSelect, clearSelection, bulkDelete, deleteColumn, showAddColumnModal, resetSchema, handleImport };
})();
