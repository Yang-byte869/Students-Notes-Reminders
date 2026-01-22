const API_URL = 'http://localhost:3000/api';

// -- ELEMENTS --
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const authBtn = document.getElementById('authBtn');
const authMessage = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Note Elements
const notesList = document.getElementById('notesList');
const noteForm = document.getElementById('noteForm');
const filterSelect = document.getElementById('filterCategory');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

// State
let isRegistering = false;
let isEditing = false;
let currentEditId = null;

// --- 1. AUTHENTICATION LOGIC ---

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    showApp();
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    fetchNotes(); // Load notes only after login
}

function showLogin() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    localStorage.removeItem('token'); // Clear token
}

// Handle Login / Register
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const endpoint = isRegistering ? '/register' : '/login';

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();

        if (response.ok) {
            if (isRegistering) {
                authMessage.style.color = 'green';
                authMessage.textContent = 'Success! Please login.';
                toggleMode(); // Switch back to login mode
            } else {
                // LOGIN SUCCESS
                localStorage.setItem('token', data.token);
                showApp();
            }
        } else {
            authMessage.style.color = 'red';
            authMessage.textContent = data.error || 'Something went wrong';
        }
    } catch (err) {
        console.error(err);
    }
});

// Toggle between Login and Register
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMode();
});

function toggleMode() {
    isRegistering = !isRegistering;
    authBtn.textContent = isRegistering ? 'Register' : 'Login';
    toggleAuth.textContent = isRegistering ? 'Already have an account? Login' : 'Create an account';
    authMessage.textContent = '';
}

logoutBtn.addEventListener('click', () => {
    showLogin();
});

// --- HELPER: Get Auth Headers ---
function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// --- 2. NOTES LOGIC (Protected) ---

async function fetchNotes() {
    const category = filterSelect.value;
    // Note: The backend filters by User ID automatically now!
    // We filter by category in JS or Backend (Backend query is simpler for now)
    
    try {
        const response = await fetch(`${API_URL}/notes`, { headers: getHeaders() });
        if (response.status === 401 || response.status === 403) return showLogin();
        
        let notes = await response.json();

        // Optional: Client-side filtering for Category
        if (category !== 'All') {
            notes = notes.filter(n => n.category === category);
        }

        renderNotes(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
    }
}

function renderNotes(notes) {
    notesList.innerHTML = '';
    notes.forEach(note => {
        const pinClass = note.is_pinned ? 'pinned' : '';
        const pinIcon = note.is_pinned ? '📍 Unpin' : '📌 Pin';
        
        const div = document.createElement('div');
        div.className = `note-card ${note.status} ${note.category} ${pinClass}`;
        div.innerHTML = `
            <div class="note-content">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3>${note.title}</h3>
                    <button onclick="togglePin(${note.id}, ${note.is_pinned})" class="pin-btn">${pinIcon}</button>
                </div>
                <div class="note-meta">
                    <span style="font-weight:bold;">${note.category}</span>
                </div>
                <p>${note.description || ''}</p>
            </div>
            <div class="note-actions">
                <button class="status-btn" onclick="toggleStatus(${note.id}, '${note.status}')">
                    ${note.status === 'pending' ? '✓ Done' : '↺ Undo'}
                </button>
                <button class="edit-btn" onclick="startEdit(${note.id}, '${note.title}', '${note.description}', '${note.category}', '${note.status}')">Edit</button>
                <button class="delete-btn" onclick="deleteNote(${note.id})">Del</button>
            </div>
        `;
        notesList.appendChild(div);
    });
}

// Add / Update Note
noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;

    if (isEditing) {
        await fetch(`${API_URL}/notes/${currentEditId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ title, description, category, status: currentEditStatus }) 
        });
        resetForm();
    } else {
        await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ title, description, category }) 
        });
        noteForm.reset();
    }
    fetchNotes();
});

async function deleteNote(id) {
    if(!confirm('Are you sure?')) return;
    await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE', headers: getHeaders() });
    fetchNotes();
}

async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }) // Only sending status is enough if backend supports it, but our backend might need full object.
        // For safety based on your backend code, let's just send what we need or update backend to accept partials. 
        // Actually, your backend code for PUT expects all fields. Let's do a quick fix:
        // Ideally we fetch the note details first, but to keep it simple, we assume the user clicks the button on a rendered note.
    });
    // RE-FETCHING is safer here.
    // For now, let's assume the previous full update logic. 
    // Wait, simpler approach: The backend update needs Title/Desc. 
    // Let's just re-fetch to be safe or update the backend to allow partial updates (PATCH). 
    // Since we didn't change backend for PATCH, let's rely on the previous method arguments or just refetch.
    
    // TRICK: We will just reload the list for now because we don't have the Title/Desc handy in this function 
    // unless we pass them all in. 
    // To fix this cleanly: Pass all args like before.
}

// Redefining toggleStatus to match the HTML onclick
window.toggleStatus = async (id, currentStatus) => {
    // We need title/desc/category to fulfill the backend requirement. 
    // Since we don't have them easily, let's just cheatingly find the note in the DOM or Fetch it.
    // BETTER FIX: Update the Backend to allow partial updates. 
    // But since I can't touch your backend right now, let's try to pass them in HTML.
    // *Correction*: In the renderNotes HTML above, I removed the extra args. Let's add them back to make it work.*
}

// --- FIXING THE TOGGLE STATUS FUNCTION ---
window.toggleStatus = async (id, currentStatus) => {
     // Fetch the single note first to get its details (since our backend requires all fields for PUT)
     // This is a bit slower but safer than passing 5 arguments in HTML
     const response = await fetch(`${API_URL}/notes`, { headers: getHeaders() });
     const notes = await response.json();
     const note = notes.find(n => n.id === id);

     const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

     await fetch(`${API_URL}/notes/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ 
            title: note.title, 
            description: note.description, 
            category: note.category, 
            status: newStatus 
        })
    });
    fetchNotes();
};

window.togglePin = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    await fetch(`${API_URL}/notes/${id}/pin`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ is_pinned: newStatus })
    });
    fetchNotes();
};

let currentEditStatus = 'pending';
window.startEdit = (id, title, desc, cat, status) => {
    isEditing = true;
    currentEditId = id;
    currentEditStatus = status;

    document.getElementById('noteId').value = id;
    document.getElementById('title').value = title;
    document.getElementById('description').value = desc;
    document.getElementById('category').value = cat;

    submitBtn.textContent = 'Update Note';
    cancelBtn.style.display = 'inline-block';
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
};

function resetForm() {
    isEditing = false;
    currentEditId = null;
    noteForm.reset();
    submitBtn.textContent = 'Add Note';
    cancelBtn.style.display = 'none';
}

cancelBtn.addEventListener('click', resetForm);
filterSelect.addEventListener('change', fetchNotes);