const storageKey = 'bus-duty-app-state';
const app = document.getElementById('app');
const form = document.getElementById('duty-form');

const state = loadState();
const rowTypes = {
    tours: { container: 'tours-body', fields: ['from', 'to', 'start', 'destination', 'line', 'note'] },
    breaks: { container: 'breaks-body', label: 'Pause', fields: ['from', 'to', 'note'] },
    deadheads: { container: 'deadheads-body', label: 'Leerfahrt', fields: ['from', 'to', 'note'] },
    maintenance: { container: 'maintenance-body', label: 'Pflege', fields: ['from', 'to', 'note'] },
    checks: { container: 'checks-body', label: 'Kontrolle', fields: ['time', 'item', 'status'] }
};

function defaultState() {
    return {
        date: new Date().toISOString().slice(0, 10),
        serviceNumber: '',
        driver: '',
        vehicle: '',
        shiftStart: '',
        shiftEnd: '',
        notes: '',
        tours: [emptyRow('tours')],
        breaks: [emptyRow('breaks')],
        deadheads: [emptyRow('deadheads')],
        maintenance: [emptyRow('maintenance')],
        checks: [emptyRow('checks', { item: 'Reifen, Licht, Bremsen, Türen', status: 'OK' })]
    };
}

function emptyRow(type, overrides = {}) {
    const row = { id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) };
    rowTypes[type].fields.forEach((field) => row[field] = '');
    return { ...row, ...overrides };
}

function loadState() {
    try {
        return { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
    } catch (error) {
        return defaultState();
    }
}

function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
}

function render() {
    Object.keys(rowTypes).forEach(renderRows);
    Object.entries(state).forEach(([key, value]) => {
        const field = form.elements[key];
        if (field && typeof value === 'string') field.value = value;
    });
}

function renderRows(type) {
    const config = rowTypes[type];
    const container = document.getElementById(config.container);
    container.innerHTML = '';
    state[type].forEach((row) => {
        container.appendChild(type === 'tours' ? tourRow(row) : compactRow(type, row));
    });
}

function tourRow(row) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        ${timeCell('from', row.from)}
        ${timeCell('to', row.to)}
        ${textCell('start', row.start, 'Startort')}
        ${textCell('destination', row.destination, 'Zielort')}
        ${textCell('line', row.line, 'Linie / Kurs')}
        ${textCell('note', row.note, 'Notiz')}
        <td class="no-print"><button type="button" class="danger" data-remove="tours" data-id="${row.id}">Löschen</button></td>`;
    tr.querySelectorAll('input').forEach(bindRowInput('tours', row.id));
    return tr;
}

function compactRow(type, row) {
    const div = document.createElement('div');
    div.className = `entry-card ${type === 'checks' ? 'check-card' : ''}`;
    if (type === 'checks') {
        div.innerHTML = `
            ${fieldMarkup('time', 'Zeit', row.time, 'time')}
            ${fieldMarkup('item', 'Prüfpunkt', row.item, 'text')}
            <label>Status<select data-field="status"><option ${row.status === 'OK' ? 'selected' : ''}>OK</option><option ${row.status === 'Mangel' ? 'selected' : ''}>Mangel</option><option ${row.status === 'Erledigt' ? 'selected' : ''}>Erledigt</option></select></label>
            <button type="button" class="danger no-print" data-remove="${type}" data-id="${row.id}">Löschen</button>`;
    } else {
        div.innerHTML = `
            ${fieldMarkup('from', 'Von', row.from, 'time')}
            ${fieldMarkup('to', 'Bis', row.to, 'time')}
            ${fieldMarkup('note', rowTypes[type].label, row.note, 'text')}
            <button type="button" class="danger no-print" data-remove="${type}" data-id="${row.id}">Löschen</button>`;
    }
    div.querySelectorAll('input, select').forEach(bindRowInput(type, row.id));
    return div;
}

function fieldMarkup(field, label, value, type) {
    return `<label>${label}<input data-field="${field}" type="${type}" value="${escapeHtml(value)}"></label>`;
}

function timeCell(field, value) {
    return `<td><input data-field="${field}" type="time" value="${escapeHtml(value)}"></td>`;
}

function textCell(field, value, placeholder) {
    return `<td><input data-field="${field}" type="text" placeholder="${placeholder}" value="${escapeHtml(value)}"></td>`;
}

function bindRowInput(type, id) {
    return (input) => input.addEventListener('input', () => {
        const row = state[type].find((item) => item.id === id);
        row[input.dataset.field] = input.value;
        saveState();
    });
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

form.addEventListener('input', (event) => {
    if (event.target.name) {
        state[event.target.name] = event.target.value;
        saveState();
    }
});

document.addEventListener('click', (event) => {
    const addType = event.target.dataset.addType || event.target.dataset.type;
    if (event.target.classList.contains('add-row') && addType) {
        state[addType].push(emptyRow(addType));
        saveState();
        renderRows(addType);
    }

    const removeType = event.target.dataset.remove;
    if (removeType) {
        state[removeType] = state[removeType].filter((row) => row.id !== event.target.dataset.id);
        if (state[removeType].length === 0) state[removeType].push(emptyRow(removeType));
        saveState();
        renderRows(removeType);
    }
});

document.getElementById('print-button').addEventListener('click', () => window.print());
document.getElementById('new-day-button').addEventListener('click', () => {
    Object.assign(state, defaultState());
    saveState();
    render();
});
document.getElementById('close-button').addEventListener('click', closeApp);

document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') closeApp();
});

window.addEventListener('message', (event) => {
    if (event.data.type === 'open') app.classList.add('is-open');
    if (event.data.type === 'close') app.classList.remove('is-open');
});

function closeApp() {
    app.classList.remove('is-open');
    if (window.invokeNative && typeof GetParentResourceName === 'function') {
        fetch(`https://${GetParentResourceName()}/close`, { method: 'POST', body: '{}' }).catch(() => undefined);
    }
}

render();
if (!window.invokeNative) app.classList.add('is-open');
