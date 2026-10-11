# NourishChain | Smart Food Donation & Cold-Storage Network

An intelligent surplus food rescue platform connecting food donors, humanitarian NGOs, and temperature-controlled cold storages with an automated **FEFO (First-Expired-First-Out)** priority dispatch system.

---

## 🌟 Key Features

- **FEFO Priority Engine**: Arranges donations strictly by expiry urgency:
  - 🚨 **Critical Priority (< 4h)**: Triggers emergency express van alerts.
  - ⚡ **Urgent Priority (4–12h)**: Routed for chilled cold-storage drop-off or evening kitchen runs.
  - 🌱 **Standard (> 12h)**: Ambient pantry & frozen inventory.
- **Real-Time Expiry Countdown Timers**: Ticking live countdown on every parcel.
- **Cold Storage Network & IoT Telemetry**:
  - Live temperature telemetry for **Chiller (2°C - 5°C)** and **Deep Freeze (< -18°C)**.
  - 3-segment visual capacity bars (*Occupied, In-Transit, Available*).
  - Instant contactless locker booking with QR code & 4-digit PIN.
- **Partner NGO Directory & 1-Click Dispatch**:
  - Connect with verified beneficiaries (*Robin Hood Army, Feeding India, etc.*).
  - Real-time volunteer claiming with custom ETA.
- **Environmental & Social Impact Calculator**:
  - Live calculations for meals served, CO₂e greenhouse gas avoided, and virtual water saved.
- **Modern UI**:
  - Glassmorphic navigation, accessible modals, and **Dark/Light Mode** toggle.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: Semantic HTML5, CSS3 Custom Properties (Vanilla CSS design system), Modern JavaScript (ES6+).
- **Backend**: Node.js & Express.js REST API.
- **Database**: SQLite with Write-Ahead Logging (WAL) and foreign keys enabled via Node.js built-in `node:sqlite` (zero external binary compilation required).

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start at: **http://localhost:3000**

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status & DB engine diagnostic |
| `GET` | `/api/donations` | List donations sorted by FEFO priority (`?category=`, `?search=`, `?priority=`) |
| `GET` | `/api/donations/:id` | Get details of a single donation parcel |
| `POST` | `/api/donations` | Record new food donation, compute shelf-life window & reserve cold locker |
| `PATCH` | `/api/donations/:id/claim` | Assign donation to an NGO van with ETA |
| `GET` | `/api/cold-hubs` | List all cold storage hubs with live temperature & capacity |
| `GET` | `/api/cold-hubs/:id` | Get details and live inventory of a specific hub |
| `POST` | `/api/cold-hubs/:id/reserve` | Book a locker compartment with access PIN |
| `GET` | `/api/ngos` | List verified beneficiary NGOs and live demands |
| `GET` | `/api/metrics` | Cumulative impact counters (meals, CO2, active nodes) |

---

## 📁 Repository Structure

```text
├── index.html           # Main frontend interface
├── styles.css           # Design system, themes & animations
├── app.js               # Frontend controller & REST API client
├── server.js            # Express backend & REST API routes
├── package.json         # Dependencies & scripts
├── .gitignore           # Excludes node_modules & temporary files
└── db/
    ├── database.js      # SQLite schema, seeds & repository queries
    └── nourish_chain.sqlite  # SQLite database file
```

---

## 📄 License
MIT License. Built for humanitarian NGOs and responsible food donors.
