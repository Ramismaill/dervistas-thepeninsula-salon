// server.js - SQLite VERSION
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const __dirname = path.dirname(require.main.filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// SESSION STORE (In-memory for simplicity)
// ======================================
const sessions = {};

// ======================================
// 1. DATABASE CONNECTION (SQLite)
// ======================================
const dbPath = path.join(__dirname, 'database.sqlite');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    console.log('Database not found. Initializing...');
    require('./scripts/init_db.js');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('SQLite veritabanına başarıyla bağlandı.');

// ======================================
// 2. EMAIL CONFIGURATION (Gmail)
// ======================================
const emailConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

if (!emailConfigured) {
    console.warn('⚠️  WARNING: EMAIL_USER or EMAIL_PASS not set. Email notifications will not work.');
    console.warn('Set these environment variables on Render dashboard to enable email functionality.');
}

let transporter = null;
if (emailConfigured) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 10000,
        socketTimeout: 10000
    });
}

// ======================================
// 3. MIDDLEWARE
// ======================================
// CORS and security headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

// Use __dirname for reliable path resolution on Render
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve subdirectories to ensure they are found
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// ======================================
// AUTHENTICATION MIDDLEWARE
// ======================================
const checkAdminSession = (req, res, next) => {
    const sessionId = req.headers['authorization']?.replace('Bearer ', '');
    if (sessionId && sessions[sessionId]) {
        req.admin = sessions[sessionId];
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please login first.' });
    }
};

// ======================================
// 4. API ROUTES
// ======================================

// ROUTE: Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin') {
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessions[sessionId] = { username, loggedInAt: new Date() };
        res.json({ success: true, sessionId, message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// ROUTE: Admin Logout
app.post('/api/admin/logout', (req, res) => {
    const sessionId = req.headers['authorization']?.replace('Bearer ', '');
    if (sessionId) {
        delete sessions[sessionId];
    }
    res.json({ success: true, message: 'Logged out' });
});

// ROUTE: Check Admin Session
app.get('/api/admin/session', (req, res) => {
    const sessionId = req.headers['authorization']?.replace('Bearer ', '');
    if (sessionId && sessions[sessionId]) {
        res.json({ authenticated: true, admin: sessions[sessionId] });
    } else {
        res.json({ authenticated: false });
    }
});

// ROUTE A: Get Services
app.get('/api/services', (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT DISTINCT id, 
                   name as name_en,
                   name_tr, 
                   name_ar, 
                   price_euro 
            FROM services 
            ORDER BY price_euro ASC
            LIMIT 6
        `);
        const rows = stmt.all();

        // Transform the data to rename Signature Balayage
        const services = rows.map(service => {
            if (service.name_en === 'Signature Balayage') {
                return { ...service, name_en: 'Balayage' };
            }
            return service;
        });

        res.json(services);
    } catch (err) {
        console.error('Servisleri çekerken hata:', err);
        res.status(200).json([
            { name_en: 'Luxury Haircut', name_tr: 'Lüks Saç Kesim', name_ar: 'قص شعر فاخر', price_euro: 180 },
            { name_en: 'Professional Coloring', name_tr: 'Profesyonel Boyama', name_ar: 'صبغ احترافي', price_euro: 240 }
        ]);
    }
});

// ROUTE B: Create Booking
app.post('/api/book', async (req, res) => {
    const { guest_type, full_name, email, room_number, phone_number, appointment_date, appointment_time, services, total_price_euro } = req.body;

    try {
        // Validate required fields
        if (!full_name || !email || !appointment_date || !appointment_time || !services) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // 1. Insert into Database
        const insertStmt = db.prepare(`
            INSERT INTO appointments 
            (guest_type, full_name, email, room_number, phone_number, appointment_date, appointment_time, services, total_price_euro, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `);
        const result = insertStmt.run(guest_type, full_name, email, room_number, phone_number, appointment_date, appointment_time, services, total_price_euro);
        const appointmentId = result.lastInsertRowid;

        console.log(`✅ Appointment saved to database: ID ${appointmentId} for ${full_name}`);

        // 2. Try to send email if configured
        if (emailConfigured && transporter) {
            // Get the protocol and host from the request for confirm link
            const protocol = req.protocol || 'https';
            const host = req.get('host') || 'localhost:3000';
            const confirmLink = `${protocol}://${host}/api/admin/confirm-appointment?id=${appointmentId}`;

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'ramismail701@gmail.com',
                subject: `NEW BOOKING: ${full_name}`,
                html: `
                    <h3>New Appointment Request</h3>
                    <p><strong>Name:</strong> ${full_name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Date:</strong> ${appointment_date} @ ${appointment_time}</p>
                    <p><strong>Services:</strong> ${services}</p>
                    <p><strong>Total:</strong> €${total_price_euro}</p>
                    <p><strong>Contact:</strong> ${room_number ? 'Room ' + room_number : 'Phone: ' + phone_number}</p>
                    <br>
                    <a href="${confirmLink}" style="background:green; color:white; padding:10px 20px; text-decoration:none; border-radius: 5px;">ACCEPT & CONFIRM</a>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`📧 Booking email sent to ramismail701@gmail.com for ${full_name}`);
            } catch (emailErr) {
                console.error("❌ Email sending failed (non-blocking):", emailErr.message);
                // Don't fail the booking if email fails
            }
        } else {
            console.log("⚠️  Email not configured, skipping email notification");
        }

        // Always return success - booking is saved in database
        return res.json({ success: true, message: 'Appointment request saved successfully.' });

    } catch (err) {
        console.error("❌ Booking Error:", err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// ROUTE C: Confirm Appointment
app.get('/api/admin/confirm-appointment', (req, res) => {
    const appointmentId = req.query.id;

    try {
        // 1. Update Status in Database
        const updateStmt = db.prepare(`UPDATE appointments SET status = 'confirmed' WHERE id = ?`);
        updateStmt.run(appointmentId);

        // 2. Get the booking details
        const selectStmt = db.prepare(`SELECT * FROM appointments WHERE id = ?`);
        const booking = selectStmt.get(appointmentId);

        if (!booking) return res.send("Appointment not found.");

        // 3. Send Confirmation Email to Client
        const clientMailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.email,
            subject: 'Appointment Confirmed - The Peninsula Salon',
            html: `
                <div style="font-family: serif; color: #333; padding: 20px;">
                    <h2>Your Appointment is Confirmed</h2>
                    <p>Dear ${booking.full_name},</p>
                    <p>We look forward to seeing you on <strong>${booking.appointment_date}</strong> at <strong>${booking.appointment_time}</strong>.</p>
                    <p>Total: €${booking.total_price_euro}</p>
                    <hr>
                    <p>The Peninsula Hair Salon</p>
                </div>
            `
        };

        transporter.sendMail(clientMailOptions)
            .then(() => {
                res.send("<h1>CONFIRMED! Client has been notified.</h1><a href='/'>Return to Home</a>");
            })
            .catch((emailErr) => {
                console.error("Email Error:", emailErr);
                res.send("<h1>CONFIRMED! (Email notification failed)</h1><a href='/'>Return to Home</a>");
            });

    } catch (err) {
        console.error(err);
        res.send("Error confirming appointment.");
    }
});

// ROUTE D: Get All Appointments (Admin)
app.get('/api/admin/appointments', checkAdminSession, (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT * FROM appointments 
            ORDER BY appointment_date DESC, appointment_time DESC
        `);
        const appointments = stmt.all();
        res.json(appointments);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// ROUTE E: Update Appointment (Admin)
app.put('/api/admin/appointments/:id', checkAdminSession, (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone_number, appointment_date, appointment_time, services, total_price_euro, status } = req.body;

    try {
        const updateStmt = db.prepare(`
            UPDATE appointments 
            SET full_name = ?, 
                email = ?, 
                phone_number = ?, 
                appointment_date = ?, 
                appointment_time = ?, 
                services = ?, 
                total_price_euro = ?, 
                status = ?
            WHERE id = ?
        `);
        updateStmt.run(full_name, email, phone_number, appointment_date, appointment_time, services, total_price_euro, status, id);
        
        res.json({ success: true, message: 'Appointment updated successfully' });
    } catch (err) {
        console.error('Error updating appointment:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// ROUTE F: Delete Appointment (Admin)
app.delete('/api/admin/appointments/:id', checkAdminSession, (req, res) => {
    const { id } = req.params;

    try {
        const deleteStmt = db.prepare(`DELETE FROM appointments WHERE id = ?`);
        deleteStmt.run(id);
        
        res.json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// ======================================
// 5. START SERVER
// ======================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Available at https://dervisitas-thepeninssula-salon.onrender.com`);
});