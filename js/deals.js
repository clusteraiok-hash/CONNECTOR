/**
 * Connector CRM — Deals / Pipeline Module (Kanban)
 */
const Deals = (() => {
    let _wsId = null;
    let _draggedId = null;

    const STAGE_META = {
        lead:      { label: 'Lead',      color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
        qualified: { label: 'Qualified',  color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
        proposal:  { label: 'Proposal',   color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
        won:       { label: 'Won',        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
        lost:      { label: 'Lost',       color: 'bg-red-50 text-red-700 border-red-200',       dot: 'bg-red-500' }
    };

    function init(wsId) { _wsId = wsId; }

    function render() {
        const deals = Store.getDeals(_wsId);
        const totalValue = deals.filter(d => d.stage !== 'lost').reduce((s, d) => s + d.value, 0);

        return `
        <div class="mb-6 flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Pipeline</h1>
                <p class="text-sm text-gray-500 mt-1">${deals.length} deals · $${totalValue.toLocaleString()} total value</p>
            </div>
            <button onclick="Deals.showAddModal()" class="flex items-center gap-2 px-5 py-2.5 bg-gray-900 rounded-xl text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Deal
            </button>
        </div>

        <div class="flex gap-4 overflow-x-auto pb-4" id="pipelineBoard">
            ${Store.DEAL_STAGES.map(stage => _renderColumn(stage, deals.filter(d => d.stage === stage))).join('')}
        </div>`;
    }

    function _renderColumn(stage, deals) {
        const meta = STAGE_META[stage];
        const total = deals.reduce((s, d) => s + d.value, 0);
        return `
        <div class="min-w-[260px] flex-1 flex flex-col"
             ondragover="event.preventDefault(); this.querySelector('.drop-zone').classList.add('border-gray-400','bg-gray-50')"
             ondragleave="this.querySelector('.drop-zone').classList.remove('border-gray-400','bg-gray-50')"
             ondrop="Deals.handleDrop(event, '${stage}'); this.querySelector('.drop-zone').classList.remove('border-gray-400','bg-gray-50')">
            <!-- Column Header -->
            <div class="flex items-center justify-between mb-3 px-1">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full ${meta.dot}"></div>
                    <span class="text-sm font-semibold text-gray-700">${meta.label}</span>
                    <span class="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">${deals.length}</span>
                </div>
                <span class="text-xs font-medium text-gray-400">$${total.toLocaleString()}</span>
            </div>
            <!-- Cards Container -->
            <div class="drop-zone flex-1 space-y-2.5 p-1.5 rounded-xl border-2 border-dashed border-transparent transition-all min-h-[120px]">
                ${deals.map(d => _dealCard(d)).join('')}
            </div>
        </div>`;
    }

    function _dealCard(d) {
        const contact = d.contactId ? Store.getContact(_wsId, d.contactId) : null;
        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
        return `
        <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
             draggable="true"
             ondragstart="Deals.handleDragStart(event, '${d.id}')"
             ondragend="Deals.handleDragEnd(event)">
            <div class="flex items-start justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-900 leading-snug">${_esc(d.title)}</h4>
                <div class="flex gap-1 shrink-0 ml-2">
                    <button onclick="event.stopPropagation(); Deals.showEditModal('${d.id}')" class="p-1 text-gray-300 hover:text-gray-600 rounded"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
                    <button onclick="event.stopPropagation(); Deals.remove('${d.id}')" class="p-1 text-gray-300 hover:text-red-500 rounded"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </div>
            <p class="text-lg font-semibold text-gray-900 mb-3">$${Number(d.value).toLocaleString()}</p>
            <div class="flex items-center justify-between">
                ${contact ? `<div class="flex items-center gap-2">
                    <div class="w-6 h-6 ${colors[Store.getContactName(contact).charCodeAt(0) % colors.length]} rounded-full flex items-center justify-center text-white text-[10px] font-bold">${Store.getContactName(contact).split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                    <span class="text-xs text-gray-500">${_esc(Store.getContactName(contact))}</span>
                </div>` : '<span></span>'}
                ${d.closeDate ? `<span class="text-xs text-gray-400">${_fmtDate(d.closeDate)}</span>` : ''}
            </div>
        </div>`;
    }

    function handleDragStart(e, id) {
        _draggedId = id;
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    }
    function handleDragEnd(e) { e.target.style.opacity = '1'; _draggedId = null; }

    function handleDrop(e, stage) {
        e.preventDefault();
        if (!_draggedId) return;
        Store.updateDeal(_wsId, _draggedId, { stage });
        _draggedId = null;
        App.navigate('pipeline');
    }

    function showAddModal() {
        _showModal('Add Deal', {}, (data) => {
            Store.addDeal(_wsId, data);
            App.navigate('pipeline');
        });
    }

    function showEditModal(id) {
        const d = Store.getDeal(_wsId, id);
        if (!d) return;
        _showModal('Edit Deal', d, (data) => {
            Store.updateDeal(_wsId, id, data);
            App.navigate('pipeline');
        });
    }

    function _showModal(title, data, onSave) {
        const contacts = Store.getContacts(_wsId);
        const modal = document.createElement('div');
        modal.id = 'dealModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
        <div class="fixed inset-0 bg-black/30" onclick="document.getElementById('dealModal').remove()"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-5">${title}</h2>
            <form id="dealForm" class="space-y-4">
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Deal Title *</label>
                    <input name="title" value="${_esc(data.title || '')}" required class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                        <input name="value" type="number" step="0.01" value="${data.value || 0}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                        <select name="stage" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                            ${Store.DEAL_STAGES.map(s => `<option value="${s}" ${data.stage === s ? 'selected' : ''}>${STAGE_META[s].label}</option>`).join('')}
                        </select></div>
                </div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                    <select name="contactId" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
                        <option value="">— None —</option>
                        ${contacts.map(c => `<option value="${c.id}" ${data.contactId === c.id ? 'selected' : ''}>${_esc(Store.getContactName(c))}</option>`).join('')}
                    </select></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Close Date</label>
                    <input name="closeDate" type="date" value="${data.closeDate || ''}" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea name="notes" rows="2" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none">${_esc(data.notes || '')}</textarea></div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="document.getElementById('dealModal').remove()" class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                    <button type="submit" class="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">Save</button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('dealForm').onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            onSave({ title: fd.get('title'), value: fd.get('value'), stage: fd.get('stage'), contactId: fd.get('contactId'), closeDate: fd.get('closeDate'), notes: fd.get('notes') });
            modal.remove();
        };
    }

    function remove(id) {
        if (!confirm('Delete this deal?')) return;
        Store.deleteDeal(_wsId, id);
        App.navigate('pipeline');
    }

    function _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function _fmtDate(d) {
        if (!d) return '';
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return { init, render, showAddModal, showEditModal, remove, handleDragStart, handleDragEnd, handleDrop };
})();
