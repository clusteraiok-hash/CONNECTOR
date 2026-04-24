/**
 * Connector CRM — Data Store (localStorage)
 * All data operations are workspace-scoped.
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
        const workspace = { id: 'ws_' + _uid(), name, type, color, initials, createdAt: new Date().toISOString() };
        ws.push(workspace);
        _set('workspaces', ws);
        return workspace;
    }

    function deleteWorkspace(id) {
        _set('workspaces', getWorkspaces().filter(w => w.id !== id));
        // Clean up workspace data
        localStorage.removeItem(PREFIX + 'contacts_' + id);
        localStorage.removeItem(PREFIX + 'deals_' + id);
        localStorage.removeItem(PREFIX + 'tasks_' + id);
        localStorage.removeItem(PREFIX + 'activities_' + id);
    }

    function getWorkspace(id) { return getWorkspaces().find(w => w.id === id) || null; }

    function setActiveWorkspace(id) { _set('active_ws', id); }
    function getActiveWorkspace() { return _get('active_ws'); }

    // ── Contacts (per workspace) ──
    function getContacts(wsId) { return _get('contacts_' + wsId) || []; }

    function addContact(wsId, { name, email = '', phone = '', company = '', tags = [], notes = '' }) {
        const contacts = getContacts(wsId);
        const contact = { id: 'c_' + _uid(), name, email, phone, company, tags, notes, createdAt: new Date().toISOString() };
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
        // Also remove linked activities
        _set('activities_' + wsId, getActivities(wsId).filter(a => a.contactId !== id));
    }

    function getContact(wsId, id) { return getContacts(wsId).find(c => c.id === id) || null; }

    // ── Deals (per workspace) ──
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

    // ── Tasks (per workspace) ──
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

    // ── Activities (per workspace) ──
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

    // ── Search ──
    function globalSearch(wsId, query) {
        const q = query.toLowerCase().trim();
        if (!q) return { contacts: [], deals: [], tasks: [] };
        return {
            contacts: getContacts(wsId).filter(c =>
                c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q))
            ),
            deals: getDeals(wsId).filter(d =>
                d.title.toLowerCase().includes(q) || d.notes.toLowerCase().includes(q)
            ),
            tasks: getTasks(wsId).filter(t =>
                t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
            )
        };
    }

    // ── Seed demo data ──
    function seedDemoData(wsId) {
        // Only seed if workspace is empty
        if (getContacts(wsId).length > 0) return;

        const c1 = addContact(wsId, { name: 'Sarah Chen', email: 'sarah@techcorp.com', phone: '+1 555-0101', company: 'TechCorp Industries', tags: ['enterprise', 'priority'], notes: 'Key decision maker' });
        const c2 = addContact(wsId, { name: 'Michael Ross', email: 'michael@globalsol.com', phone: '+1 555-0102', company: 'Global Solutions', tags: ['mid-market'], notes: 'Referred by Sarah' });
        const c3 = addContact(wsId, { name: 'Emily Davis', email: 'emily@startuphub.io', phone: '+1 555-0103', company: 'StartupHub', tags: ['startup', 'hot-lead'], notes: 'Met at conference' });
        const c4 = addContact(wsId, { name: 'James Wilson', email: 'james@enterprise.com', phone: '+1 555-0104', company: 'Enterprise Systems', tags: ['enterprise'], notes: 'Legal review pending' });

        addDeal(wsId, { title: 'TechCorp Annual License', value: 45000, stage: 'proposal', contactId: c1.id, closeDate: '2024-12-15' });
        addDeal(wsId, { title: 'Global Solutions Onboarding', value: 12000, stage: 'qualified', contactId: c2.id, closeDate: '2024-12-20' });
        addDeal(wsId, { title: 'StartupHub Pilot Program', value: 5000, stage: 'lead', contactId: c3.id, closeDate: '2025-01-10' });
        addDeal(wsId, { title: 'Enterprise Systems Contract', value: 78000, stage: 'proposal', contactId: c4.id, closeDate: '2024-12-30' });
        addDeal(wsId, { title: 'TechCorp Add-on Package', value: 8000, stage: 'won', contactId: c1.id, closeDate: '2024-11-30' });

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        addTask(wsId, { title: 'Follow-up call with TechCorp', description: 'Discuss contract terms and pricing', dueDate: today, priority: 'high', contactId: c1.id });
        addTask(wsId, { title: 'Send proposal to Global Solutions', description: 'Include pricing and implementation timeline', dueDate: tomorrow, priority: 'high', contactId: c2.id });
        addTask(wsId, { title: 'Product demo for StartupHub', description: 'Showcase new features and integrations', dueDate: tomorrow, priority: 'medium', contactId: c3.id });
        addTask(wsId, { title: 'Contract review with legal', description: 'Review and approve Enterprise Systems contract', dueDate: today, priority: 'medium', contactId: c4.id });
        addTask(wsId, { title: 'Follow-up email to TechCorp', description: 'Check status of proposal submission', dueDate: yesterday, priority: 'high', contactId: c1.id, completed: true });

        addActivity(wsId, { type: 'call', contactId: c1.id, content: 'Discussed Q4 budget allocation and timeline for license renewal' });
        addActivity(wsId, { type: 'email', contactId: c2.id, content: 'Sent initial proposal with pricing breakdown' });
        addActivity(wsId, { type: 'meeting', contactId: c3.id, content: 'Product demo - showed new dashboard features, very interested' });
        addActivity(wsId, { type: 'note', contactId: c4.id, content: 'Legal team reviewing contract, expect feedback by Friday' });
    }

    return {
        getWorkspaces, createWorkspace, deleteWorkspace, getWorkspace,
        setActiveWorkspace, getActiveWorkspace,
        getContacts, addContact, updateContact, deleteContact, getContact,
        DEAL_STAGES, getDeals, addDeal, updateDeal, deleteDeal, getDeal, getDealsByStage,
        getTasks, addTask, updateTask, deleteTask, getTask,
        getActivities, addActivity, deleteActivity, getActivitiesForContact,
        globalSearch, seedDemoData
    };
})();
