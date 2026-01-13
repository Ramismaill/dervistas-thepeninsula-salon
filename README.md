# The Peninsula Salon Website

This is the official website application for **Derviş Taş Hair Dresser** at The Peninsula Hotel. It includes a full appointment booking system, admin confirmation panel, and dynamic services price list.

## 🚀 How to Run this Project

If you have received this project or cloned it from GitHub, follow these steps to get it running on your computer.

### Prerequisites
You need to have **Node.js** installed on your computer.

### 1. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Setup Database (One-time only)
The project uses a local SQLite database. You need to create it and fill it with initial data:
```bash
npm run init-db
```
*This will create a `database.sqlite` file in your folder.*

### 3. Start the Server
Now you can start the website:
```bash
npm start
```

Open your browser and visit: **http://localhost:3000**

---

## 🛠️ Admin Features
- **View Database**: You can view the current database tables nicely by running:
  ```bash
  npm run view-db
  ```
- **Confirming Appointments**: Appointments are saved as "pending". In a real scenario, the owner gets an email link. For testing, you can check the database to see new bookings.

## 📁 Project Structure
- `database.sqlite`: The local database file containing all services and appointments.
- `server.js`: The backend server code.
- `public/`: All frontend files (HTML, CSS, Images).
