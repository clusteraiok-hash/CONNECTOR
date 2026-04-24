/**
 * Connector CRM — Data Store (localStorage)
 * All data operations are workspace-scoped and support dynamic schemas.
 */
const Store = (() => {
    const PREFIX = 'connector_';

    // ── Helpers ──
    function _get(key) {
        try { return JSON.parse(localStorage.getItem(PREFIX + key)) || null; }
        catch { return null; }
    }
    function _set(key, val) {
        localStorage.setItem(PREFIX + key, JSON.stringify(val));
    }
    function _uid() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    // ── Workspaces ──
    function getWorkspaces() { return _get('workspaces') || []; }

    function createWorkspace({ name, type = 'client', color = '#1A1A1A' }) {
        const ws = getWorkspaces();
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const workspace = { 
            id: 'ws_' + _uid(), 
            name, 
            type, 
            color, 
            initials, 
            createdAt: new Date().toISOString() 
        };
        ws.push(workspace);
        _set('workspaces', ws);
        
        // Initialize default schema
        updateSchema(workspace.id, ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes']);
        
        return workspace;
    }

    function deleteWorkspace(id) {
        _set('workspaces', getWorkspaces().filter(w => w.id !== id));
        localStorage.removeItem(PREFIX + 'contacts_' + id);
        localStorage.removeItem(PREFIX + 'deals_' + id);
        localStorage.removeItem(PREFIX + 'tasks_' + id);
        localStorage.removeItem(PREFIX + 'activities_' + id);
        localStorage.removeItem(PREFIX + 'schema_' + id);
    }

    function getWorkspace(id) { return getWorkspaces().find(w => w.id === id) || null; }

    function setActiveWorkspace(id) { _set('active_ws', id); }
    function getActiveWorkspace() { return _get('active_ws'); }

    // ── Schema ──
    function getSchema(wsId) { 
        return _get('schema_' + wsId) || ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes']; 
    }

    function updateSchema(wsId, headers) {
        // Normalize headers: trim and filter out empties, but keep original case
        const cleanHeaders = Array.from(new Set(headers.map(h => h.trim()).filter(Boolean)));
        if (cleanHeaders.length > 0) {
            _set('schema_' + wsId, cleanHeaders);
        }
    }

    // ── Contacts (Dynamic Fields) ──
    function getContacts(wsId) { return _get('contacts_' + wsId) || []; }

    function addContact(wsId, fields) {
        const contacts = getContacts(wsId);
        const contact = { 
            id: 'c_' + _uid(), 
            ...fields, 
            createdAt: new Date().toISOString() 
        };
        contacts.push(contact);
        _set('contacts_' + wsId, contacts);
        return contact;
    }

    function updateContact(wsId, id, data) {
        const contacts = getContacts(wsId).map(c => c.id === id ? { ...c, ...data } : c);
        _set('contacts_' + wsId, contacts);
    }

    function deleteContact(wsId, id) {
        _set('contacts_' + wsId, getContacts(wsId).filter(c => c.id !== id));
        _set('activities_' + wsId, getActivities(wsId).filter(a => a.contactId !== id));
    }

    function getContact(wsId, id) { return getContacts(wsId).find(c => c.id === id) || null; }

    function getContactName(contact) {
        if (!contact) return 'Unknown';
        return contact.Name || contact.name || Object.values(contact).find(v => v && typeof v === 'string') || 'Unnamed Contact';
    }

    // ── Deals ──
    const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'won', 'lost'];
    function getDeals(wsId) { return _get('deals_' + wsId) || []; }
    function addDeal(wsId, { title, value = 0, stage = 'lead', contactId = '', closeDate = '', notes = '' }) {
        const deals = getDeals(wsId);
        const deal = { id: 'd_' + _uid(), title, value: Number(value), stage, contactId, closeDate, notes, createdAt: new Date().toISOString() };
        deals.push(deal);
        _set('deals_' + wsId, deals);
        return deal;
    }
    function updateDeal(wsId, id, data) {
        if (data.value !== undefined) data.value = Number(data.value);
        const deals = getDeals(wsId).map(d => d.id === id ? { ...d, ...data } : d);
        _set('deals_' + wsId, deals);
    }
    function deleteDeal(wsId, id) {
        _set('deals_' + wsId, getDeals(wsId).filter(d => d.id !== id));
    }
    function getDeal(wsId, id) { return getDeals(wsId).find(d => d.id === id) || null; }
    function getDealsByStage(wsId, stage) { return getDeals(wsId).filter(d => d.stage === stage); }

    // ── Tasks ──
    function getTasks(wsId) { return _get('tasks_' + wsId) || []; }
    function addTask(wsId, { title, description = '', dueDate = '', priority = 'medium', contactId = '', dealId = '', completed = false }) {
        const tasks = getTasks(wsId);
        const task = { id: 't_' + _uid(), title, description, dueDate, priority, contactId, dealId, completed, createdAt: new Date().toISOString() };
        tasks.push(task);
        _set('tasks_' + wsId, tasks);
        return task;
    }
    function updateTask(wsId, id, data) {
        const tasks = getTasks(wsId).map(t => t.id === id ? { ...t, ...data } : t);
        _set('tasks_' + wsId, tasks);
    }
    function deleteTask(wsId, id) {
        _set('tasks_' + wsId, getTasks(wsId).filter(t => t.id !== id));
    }
    function getTask(wsId, id) { return getTasks(wsId).find(t => t.id === id) || null; }

    // ── Activities ──
    function getActivities(wsId) { return _get('activities_' + wsId) || []; }
    function addActivity(wsId, { type = 'note', contactId = '', content = '', pinned = false }) {
        const acts = getActivities(wsId);
        const activity = { id: 'a_' + _uid(), type, contactId, content, pinned, createdAt: new Date().toISOString() };
        acts.push(activity);
        _set('activities_' + wsId, acts);
        return activity;
    }
    function deleteActivity(wsId, id) {
        _set('activities_' + wsId, getActivities(wsId).filter(a => a.id !== id));
    }
    function getActivitiesForContact(wsId, contactId) {
        return getActivities(wsId).filter(a => a.contactId === contactId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // ── Search (Dynamic) ──
    function globalSearch(wsId, query) {
        const q = query.toLowerCase().trim();
        if (!q) return { contacts: [], deals: [], tasks: [] };
        const contacts = getContacts(wsId).filter(c => {
            return Object.values(c).some(val => String(val).toLowerCase().includes(q));
        });
        return {
            contacts,
            deals: getDeals(wsId).filter(d => d.title.toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q)),
            tasks: getTasks(wsId).filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
        };
    }

    function seedDemoData(wsId) {
        if (getContacts(wsId).length > 0) return;
        const c1 = addContact(wsId, { Name: 'Sarah Chen', Email: 'sarah@techcorp.com', Phone: '+1 555-0101', Company: 'TechCorp Industries', Tags: 'enterprise, priority', Notes: 'Key decision maker' });
        const c2 = addContact(wsId, { Name: 'Michael Ross', Email: 'michael@globalsol.com', Phone: '+1 555-0102', Company: 'Global Solutions', Tags: 'mid-market', Notes: 'Referred by Sarah' });
        addDeal(wsId, { title: 'TechCorp Annual License', value: 45000, stage: 'proposal', contactId: c1.id });
        addTask(wsId, { title: 'Follow-up call', dueDate: new Date().toISOString().split('T')[0], contactId: c1.id });
    }

    return {
        getWorkspaces, createWorkspace, deleteWorkspace, getWorkspace,
        setActiveWorkspace, getActiveWorkspace,
        getSchema, updateSchema,
        getContacts, addContact, updateContact, deleteContact, getContact,
        DEAL_STAGES, getDeals, addDeal, updateDeal, deleteDeal, getDeal, getDealsByStage,
        getTasks, addTask, updateTask, deleteTask, getTask,
        getActivities, addActivity, deleteActivity, getActivitiesForContact,
        globalSearch, seedDemoData
    };
})();
