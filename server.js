const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'compliance_db' // Check your DB name!
});

db.connect(err => {
    if (err) console.error('DB Connection Failed:', err);
    else console.log('Connected to MySQL DB');
});

// SECRET KEY (In a real app, hide this in a .env file!)
const SECRET_KEY = 'super_secret_student_key';

// --- AUTH MIDDLEWARE (The Gatekeeper) ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) return res.sendStatus(401); // No token? Get out.

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token? Forbidden.
        req.user = user; // Save the user info (id) for the next step
        next();
    });
}

// --- 1. REGISTER USER ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    // Hash the password so it is secure
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(query, [username, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ error: 'User already exists' });
        res.json({ message: 'User registered!' });
    });
});

// --- 2. LOGIN USER ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (results.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = results[0];
        // Check if password matches
        if (await bcrypt.compare(password, user.password)) {
            // Create a token with the user's ID inside
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
            res.json({ token: token });
        } else {
            res.status(401).json({ error: 'Wrong password' });
        }
    });
});

// --- 3. GET NOTES (Protected!) ---
app.get('/api/notes', authenticateToken, (req, res) => {
    // Only get notes that belong to THIS user (req.user.id)
    const query = 'SELECT * FROM notes WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC';
    db.query(query, [req.user.id], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// --- 4. ADD NOTE (Protected!) ---
app.post('/api/notes', authenticateToken, (req, res) => {
    const { title, description, category } = req.body;
    // Force status to pending & attach the user_id
    const query = 'INSERT INTO notes (title, description, category, status, user_id) VALUES (?, ?, ?, "pending", ?)';
    db.query(query, [title, description, category, req.user.id], (err, result) => {
        if (err) throw err;
        res.json({ id: result.insertId, title, status: 'pending' });
    });
});

// --- 5. UPDATE NOTE (Protected!) ---
app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const { title, description, category, status } = req.body;
    const { id } = req.params;
    // Ensure user only updates THEIR OWN note
    const query = 'UPDATE notes SET title=?, description=?, category=?, status=? WHERE id=? AND user_id=?';
    db.query(query, [title, description, category, status, id, req.user.id], (err) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

// --- 6. DELETE NOTE (Protected!) ---
app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    const query = 'DELETE FROM notes WHERE id = ? AND user_id = ?';
    db.query(query, [req.params.id, req.user.id], (err) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

// --- 7. TOGGLE PIN (Protected!) ---
app.put('/api/notes/:id/pin', authenticateToken, (req, res) => {
    const { is_pinned } = req.body;
    const query = 'UPDATE notes SET is_pinned = ? WHERE id = ? AND user_id = ?';
    db.query(query, [is_pinned, req.params.id, req.user.id], (err, result) => {
        if (err) throw err;
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});