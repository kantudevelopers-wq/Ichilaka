const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'zambrew-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Ensure database directory exists
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database setup
const db = new sqlite3.Database(path.join(dbDir, 'zambrew.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        payment_number TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT DEFAULT 'sale',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    const adminPassword = bcrypt.hashSync('Careless', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, name) VALUES (?, ?, ?)`, 
        ['username', adminPassword, 'ZamBrew Admin']);
});

function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// ============ PUBLIC API ============
app.post('/api/orders', (req, res) => {
    const { customer_name, customer_phone, items, total, payment_method, payment_number } = req.body;
    const orderId = 'ZB-' + Date.now().toString(36).toUpperCase();

    db.run(
        `INSERT INTO orders (order_id, customer_name, customer_phone, items, total, payment_method, payment_number, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, customer_name, customer_phone, JSON.stringify(items), total, payment_method, payment_number, 'pending'],
        function(err) {
            if (err) {
                console.error('Order error:', err);
                return res.status(500).json({ error: err.message });
            }

            db.run(
                `INSERT INTO sales (order_id, amount, type, description) VALUES (?, ?, ?, ?)`,
                [orderId, total, 'sale', `Order from ${customer_name}`]
            );

            res.json({ 
                success: true, 
                order_id: orderId,
                message: 'Order placed successfully'
            });
        }
    );
});

app.get('/api/orders/:orderId', (req, res) => {
    db.get(`SELECT * FROM orders WHERE order_id = ?`, [req.params.orderId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Order not found' });
        row.items = JSON.parse(row.items);
        res.json(row);
    });
});

// ============ ADMIN API ============
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true, name: user.name });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/admin/orders', requireAuth, (req, res) => {
    const { status, date_from, date_to } = req.query;
    let query = `SELECT * FROM orders WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
        query += ` AND status = ?`;
        params.push(status);
    }
    if (date_from) {
        query += ` AND DATE(created_at) >= ?`;
        params.push(date_from);
    }
    if (date_to) {
        query += ` AND DATE(created_at) <= ?`;
        params.push(date_to);
    }

    query += ` ORDER BY created_at DESC`;

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(row => {
            try { row.items = JSON.parse(row.items); } catch(e) { row.items = []; }
        });
        res.json(rows);
    });
});

app.put('/api/admin/orders/:orderId/status', requireAuth, (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;

    db.run(
        `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
        [status, orderId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });

            if (status === 'cancelled') {
                db.get(`SELECT total FROM orders WHERE order_id = ?`, [orderId], (err, row) => {
                    if (row) {
                        db.run(
                            `INSERT INTO sales (order_id, amount, type, description) VALUES (?, ?, ?, ?)`,
                            [orderId, -row.total, 'refund', `Refund for cancelled order ${orderId}`]
                        );
                    }
                });
            }

            res.json({ success: true, message: 'Status updated' });
        }
    );
});

app.get('/api/admin/stats', requireAuth, (req, res) => {
    const { period } = req.query;

    let dateFilter = '';
    if (period === 'day') {
        dateFilter = "DATE(created_at) = DATE('now')";
    } else if (period === 'month') {
        dateFilter = "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    } else if (period === 'year') {
        dateFilter = "strftime('%Y', created_at) = strftime('%Y', 'now')";
    } else {
        dateFilter = "1=1";
    }

    const stats = {};

    db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE type = 'sale' AND ${dateFilter}`, [], (err, row) => {
        stats.totalSales = row.total;

        db.get(`SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM sales WHERE type = 'refund' AND ${dateFilter}`, [], (err, row) => {
            stats.totalRefunds = row.total;
            stats.netRevenue = stats.totalSales - stats.totalRefunds;

            db.get(`SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND ${dateFilter}`, [], (err, row) => {
                stats.completedOrders = row.count;

                db.get(`SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND ${dateFilter}`, [], (err, row) => {
                    stats.pendingOrders = row.count;

                    db.get(`SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled' AND ${dateFilter}`, [], (err, row) => {
                        stats.cancelledOrders = row.count;

                        db.all(`SELECT items FROM orders WHERE status != 'cancelled' AND ${dateFilter}`, [], (err, rows) => {
                            const itemCounts = {};
                            rows.forEach(row => {
                                try {
                                    const items = JSON.parse(row.items);
                                    items.forEach(item => {
                                        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
                                    });
                                } catch(e) {}
                            });

                            stats.bestSellers = Object.entries(itemCounts)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([name, count]) => ({ name, count }));

                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/admin/chart', requireAuth, (req, res) => {
    const { type } = req.query;

    let query;
    if (type === 'daily') {
        query = `SELECT DATE(created_at) as label, SUM(amount) as value 
                 FROM sales WHERE type = 'sale' 
                 AND created_at >= date('now', '-30 days')
                 GROUP BY DATE(created_at) 
                 ORDER BY label`;
    } else {
        query = `SELECT strftime('%Y-%m', created_at) as label, SUM(amount) as value 
                 FROM sales WHERE type = 'sale' 
                 AND created_at >= date('now', '-12 months')
                 GROUP BY strftime('%Y-%m', created_at) 
                 ORDER BY label`;
    }

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/admin/activity', requireAuth, (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 10`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows.forEach(row => {
            try { row.items = JSON.parse(row.items); } catch(e) { row.items = []; }
        });
        res.json(rows);
    });
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZamBrew Server running on port ${PORT}`);
});
