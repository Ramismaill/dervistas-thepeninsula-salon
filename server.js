// server.js - SQLite VERSION
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================
// 1. DATABASE CONNECTION (SQLite)
// ======================================
const dbPath = path.join(process.cwd(), 'database.sqlite');

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
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ======================================
// 3. MIDDLEWARE
// ======================================
// Use process.cwd() to be safer on different hosting environments
app.use(express.static(path.join(process.cwd(), 'public')));

// Explicitly serve subdirectories to ensure they are found
app.use('/css', express.static(path.join(process.cwd(), 'public/css')));
app.use('/js', express.static(path.join(process.cwd(), 'public/js')));
app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
app.use(express.json());

// ======================================
// 4. API ROUTES
// ======================================

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

        // Get the protocol and host from the request for confirm link
        const protocol = req.protocol || 'https';
        const host = req.get('host') || 'localhost:3000';
        const confirmLink = `${protocol}://${host}/api/admin/confirm-appointment?id=${appointmentId}`;

        // 2. Send Email to Salon Owner
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
            console.log(`Booking email sent to ramismail701@gmail.com for ${full_name}`);
            return res.json({ success: true, message: 'Appointment request sent successfully.' });
        } catch (emailErr) {
            console.error("Email Error:", emailErr);
            // Still return success since booking was saved
            return res.json({ success: true, message: 'Booking saved. Email notification failed.' });
        }

    } catch (err) {
        console.error("Booking Error:", err);
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

// ======================================
// 5. START SERVER
// ======================================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});