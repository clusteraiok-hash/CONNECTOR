/**
 * Connector CRM — CSV Import/Export
 * Robust implementation handling quoted fields, newlines, and dynamic schema.
 */
const CSV = (() => {
    
    /**
     * Exports contacts to a CSV file based on the workspace schema.
     */
    function exportContacts(wsId) {
        const contacts = Store.getContacts(wsId);
        const schema = Store.getSchema(wsId);
        if (contacts.length === 0) { alert('No contacts to export.'); return; }
        
        const rows = contacts.map(c => 
            schema.map(header => {
                const val = c[header] || '';
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            }).join(',')
        );

        const csvContent = [schema.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Imports contacts from a CSV file and dynamically updates the workspace schema.
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

                    // Extract headers (Schema)
                    const headers = data[0].map(h => h.trim()).filter(Boolean);
                    
                    // Update workspace schema if new columns are found
                    const currentSchema = Store.getSchema(wsId);
                    const mergedSchema = Array.from(new Set([...currentSchema, ...headers]));
                    Store.updateSchema(wsId, mergedSchema);

                    let imported = 0;
                    for (let i = 1; i < data.length; i++) {
                        const row = data[i];
                        if (row.length === 0) continue;

                        const fields = {};
                        headers.forEach((header, idx) => {
                            fields[header] = (row[idx] || '').trim();
                        });

                        // Basic validation: ensure at least one field has data
                        if (Object.values(fields).some(v => v)) {
                            Store.addContact(wsId, fields);
                            imported++;
                        }
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

        const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        for (let i = 0; i < cleanText.length; i++) {
            const char = cleanText[i];
            const nextChar = cleanText[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentField);
                    currentField = '';
                } else if (char === '\n') {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }
        
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows.filter(r => r.some(f => f.trim() !== ''));
    }

    return { exportContacts, importContacts };
})();
