/**
 * Connector CRM — CSV Import/Export
 */
const CSV = (() => {
    function exportContacts(wsId) {
        const contacts = Store.getContacts(wsId);
        if (contacts.length === 0) { alert('No contacts to export.'); return; }
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes'];
        const rows = contacts.map(c => [
            c.name, c.email, c.phone, c.company, (c.tags || []).join(';'), c.notes
        ].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'contacts_export.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importContacts(wsId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/).filter(l => l.trim());
                    if (lines.length < 2) { reject('CSV file is empty or has no data rows.'); return; }

                    // Parse header
                    const headers = _parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
                    const nameIdx = headers.findIndex(h => h.includes('name'));
                    const emailIdx = headers.findIndex(h => h.includes('email'));
                    const phoneIdx = headers.findIndex(h => h.includes('phone'));
                    const companyIdx = headers.findIndex(h => h.includes('company'));
                    const tagsIdx = headers.findIndex(h => h.includes('tag'));
                    const notesIdx = headers.findIndex(h => h.includes('note'));

                    if (nameIdx === -1) { reject('CSV must have a "Name" column.'); return; }

                    let imported = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const cols = _parseCSVLine(lines[i]);
                        const name = (cols[nameIdx] || '').trim();
                        if (!name) continue;
                        Store.addContact(wsId, {
                            name,
                            email: emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '',
                            phone: phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '',
                            company: companyIdx >= 0 ? (cols[companyIdx] || '').trim() : '',
                            tags: tagsIdx >= 0 ? (cols[tagsIdx] || '').split(';').map(t => t.trim()).filter(Boolean) : [],
                            notes: notesIdx >= 0 ? (cols[notesIdx] || '').trim() : ''
                        });
                        imported++;
                    }
                    resolve(imported);
                } catch (err) {
                    reject('Failed to parse CSV: ' + err.message);
                }
            };
            reader.onerror = () => reject('Failed to read file.');
            reader.readAsText(file);
        });
    }

    function _parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
                else if (ch === '"') { inQuotes = false; }
                else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { result.push(current); current = ''; }
                else { current += ch; }
            }
        }
        result.push(current);
        return result;
    }

    return { exportContacts, importContacts };
})();
