/**
 * Connector CRM — CSV Import/Export
 * Robust implementation handling quoted fields, newlines, and flexible headers.
 */
const CSV = (() => {
    
    /**
     * Exports contacts to a CSV file.
     */
    function exportContacts(wsId) {
        const contacts = Store.getContacts(wsId);
        if (contacts.length === 0) { alert('No contacts to export.'); return; }
        
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Tags', 'Notes'];
        const rows = contacts.map(c => [
            c.name, 
            c.email, 
            c.phone, 
            c.company, 
            (c.tags || []).join(';'), 
            c.notes
        ].map(v => {
            const str = String(v || '').replace(/"/g, '""');
            return `"${str}"`;
        }).join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Imports contacts from a CSV file.
     */
    function importContacts(wsId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const data = _parseFullCSV(text);
                    
                    if (data.length < 2) {
                        reject('CSV file is empty or has no data rows.');
                        return;
                    }

                    const headers = data[0].map(h => h.toLowerCase().trim());
                    
                    // Flexible header mapping
                    const findIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
                    
                    const nameIdx = findIdx(['name', 'contact', 'person', 'full name']);
                    const emailIdx = findIdx(['email', 'mail', 'e-mail']);
                    const phoneIdx = findIdx(['phone', 'mobile', 'tel', 'cell']);
                    const companyIdx = findIdx(['company', 'organization', 'account', 'business', 'firm']);
                    const tagsIdx = findIdx(['tag', 'category', 'label', 'group']);
                    const notesIdx = findIdx(['note', 'comment', 'description', 'detail', 'bio']);

                    if (nameIdx === -1) {
                        reject('Could not find a "Name" column. Please ensure your CSV has a header row.');
                        return;
                    }

                    let imported = 0;
                    for (let i = 1; i < data.length; i++) {
                        const row = data[i];
                        if (row.length === 0 || !row[nameIdx]) continue;

                        const name = row[nameIdx].trim();
                        if (!name) continue;

                        Store.addContact(wsId, {
                            name,
                            email: emailIdx >= 0 ? (row[emailIdx] || '').trim() : '',
                            phone: phoneIdx >= 0 ? (row[phoneIdx] || '').trim() : '',
                            company: companyIdx >= 0 ? (row[companyIdx] || '').trim() : '',
                            tags: tagsIdx >= 0 ? (row[tagsIdx] || '').split(/[;|,]/).map(t => t.trim()).filter(Boolean) : [],
                            notes: notesIdx >= 0 ? (row[notesIdx] || '').trim() : ''
                        });
                        imported++;
                    }
                    resolve(imported);
                } catch (err) {
                    console.error('CSV Import Error:', err);
                    reject('Failed to parse CSV: ' + err.message);
                }
            };
            reader.onerror = () => reject('Failed to read file.');
            reader.readAsText(file);
        });
    }

    /**
     * Robust CSV parser that handles multiline fields and quoted values.
     */
    function _parseFullCSV(text) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        // Normalize line endings
        const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const nextChar = cleanText[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    // Closing quote
                    inQuotes = false;
                } else {
                    // Character inside quotes
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    // Opening quote
                    inQuotes = true;
                } else if (char === ',') {
                    // Field separator
                    currentRow.push(currentField);
                    currentField = '';
                } else if (char === '\n') {
                    // Row separator
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    // Normal character
                    currentField += char;
                }
            }
        }
        
        // Push last field/row if exists
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows.filter(r => r.some(f => f.trim() !== ''));
    }

    return { exportContacts, importContacts };
})();
