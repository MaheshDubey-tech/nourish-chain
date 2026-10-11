/**
 * NourishChain - SQLite Database Engine
 * Powered by Node.js built-in node:sqlite (zero external compilation dependencies)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'nourish_chain.sqlite');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency & performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Schema
 */
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cold_hubs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      distance_km REAL NOT NULL,
      open_hours TEXT NOT NULL,
      temp_chilled TEXT NOT NULL,
      temp_freeze TEXT NOT NULL,
      humidity TEXT NOT NULL,
      total_capacity_kg REAL NOT NULL,
      occupied_kg REAL NOT NULL,
      reserved_kg REAL NOT NULL,
      available_kg REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cold_hub_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hub_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      stored_at TEXT NOT NULL,
      temp TEXT NOT NULL,
      FOREIGN KEY (hub_id) REFERENCES cold_hubs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity TEXT NOT NULL,
      donor TEXT NOT NULL,
      donor_phone TEXT,
      location TEXT NOT NULL,
      distance_km REAL NOT NULL,
      prep_time TEXT NOT NULL,
      storage_type TEXT NOT NULL,
      target_temp TEXT NOT NULL,
      cold_hub_id TEXT,
      cold_hub_name TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      claimed_by_ngo TEXT,
      claimed_eta TEXT,
      claimed_at TEXT,
      expires_at INTEGER NOT NULL,
      hygiene_verified INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (cold_hub_id) REFERENCES cold_hubs(id)
    );

    CREATE TABLE IF NOT EXISTS ngos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      focus TEXT NOT NULL,
      location TEXT NOT NULL,
      daily_beneficiaries TEXT NOT NULL,
      current_demand TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS locker_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hub_id TEXT NOT NULL,
      hub_name TEXT NOT NULL,
      locker_code TEXT NOT NULL,
      pin_code TEXT NOT NULL,
      reserved_by TEXT NOT NULL,
      reserved_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (hub_id) REFERENCES cold_hubs(id)
    );
  `);

  seedInitialDataIfEmpty();
}

/**
 * Seed initial real-world data if database is empty
 */
function seedInitialDataIfEmpty() {
  const hubCount = db.prepare('SELECT COUNT(*) as cnt FROM cold_hubs').get().cnt;

  if (hubCount === 0) {
    console.log('[DB] Seeding initial cold hubs...');
    const insertHub = db.prepare(`
      INSERT INTO cold_hubs (
        id, name, address, distance_km, open_hours, temp_chilled, 
        temp_freeze, humidity, total_capacity_kg, occupied_kg, 
        reserved_kg, available_kg, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const hubs = [
      ['hub1', 'Metro Central Cold Vault #1', '45 Terminal Road, Sector 3', 2.1, 'Open 24/7', '3.4°C', '-18.2°C', '62% RH', 400, 260, 60, 80, Date.now()],
      ['hub2', 'Greenfield Solar Cold Unit #4', '12 Eco Green Park, Ring Road', 3.8, '6:00 AM - 11:30 PM', '4.1°C', '-16.8°C', '58% RH', 300, 150, 30, 120, Date.now()],
      ['hub3', 'Eastside Community Deep-Freeze', 'Plot 89, Logistics Corridor B', 5.2, 'Open 24/7', '2.8°C', '-21.4°C', '55% RH', 550, 220, 50, 280, Date.now()],
      ['hub4', 'Aerocity Rapid Intake Chiller', 'Cargo Gate 3, Airport Expressway', 1.4, 'Open 24/7 Express', '3.0°C', '-17.5°C', '60% RH', 250, 195, 25, 30, Date.now()]
    ];

    for (const h of hubs) {
      insertHub.run(...h);
    }

    // Seed inventory items
    const insertInv = db.prepare('INSERT INTO cold_hub_inventory (hub_id, item_name, stored_at, temp) VALUES (?, ?, ?, ?)');
    insertInv.run('hub1', 'Dairy & Milk Casks (40L)', '10:30 AM', '3.2°C');
    insertInv.run('hub1', 'Curry & Rice Trays (30kg)', '01:15 PM', '3.8°C');
    insertInv.run('hub1', 'Paneer Packs (12kg)', '11:45 AM', '2.9°C');
    insertInv.run('hub2', 'Bakery Loaves (25kg)', '09:00 AM', 'Dry Chamber');
    insertInv.run('hub2', 'Pantry Dry Grains (50kg)', 'Yesterday', '22.0°C');
    insertInv.run('hub3', 'Fresh Fruit Crates (95kg)', '08:15 AM', '3.1°C');
    insertInv.run('hub3', 'Frozen Bulk Broth (45kg)', 'Yesterday', '-19.5°C');
    insertInv.run('hub4', 'Airline Catering Surplus (80kg)', '02:10 PM', '2.8°C');
    insertInv.run('hub4', 'Pre-cut Salad Trays (25kg)', '01:30 PM', '3.0°C');
  }

  const donCount = db.prepare('SELECT COUNT(*) as cnt FROM donations').get().cnt;
  if (donCount === 0) {
    console.log('[DB] Seeding initial donations with FEFO urgency offsets...');
    const now = Date.now();
    const insertDonation = db.prepare(`
      INSERT INTO donations (
        id, title, category, quantity, donor, donor_phone, location, distance_km,
        prep_time, storage_type, target_temp, cold_hub_id, cold_hub_name, status,
        claimed_by_ngo, claimed_eta, claimed_at, expires_at, hygiene_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedDonations = [
      [
        'DON-101', '120 Portions Catering Biryani & Dal', 'Cooked Meals', '45 kg (120 servings)',
        'Grand Hyatt Banquet Hall', '+91 98201 54321', 'BKC Complex, Sector 4', 1.8,
        'Cooked 2 hours ago', 'chilled', '3°C Chilled', 'hub1', 'Metro Central Cold Vault #1',
        'available', null, null, null, now + (1 * 60 + 45) * 60 * 1000, 1, now
      ],
      [
        'DON-102', '80 Loaves Sourdough & Multigrain Bread', 'Bakery & Bread', '25 kg (80 units)',
        'Artisan Oven Bakery', '+91 97112 33445', 'Connaught Promenade', 3.2,
        'Baked this morning', 'ambient', 'Ambient Pantry', 'hub2', 'Greenfield Solar Cold Unit #4',
        'available', null, null, null, now + (3 * 60 + 10) * 60 * 1000, 1, now
      ],
      [
        'DON-103', '40 Litres Pasteurized Milk & Paneer', 'Dairy & Milk', '40 L + 12 kg Paneer',
        'Krishna Dairy Cooperative', '+91 98450 12890', 'South Market Dairy Lane', 2.5,
        'Produced 4 hours ago', 'chilled', '2°C - 4°C Chilled', 'hub1', 'Metro Central Cold Vault #1',
        'stored', null, null, null, now + (6 * 60 + 40) * 60 * 1000, 1, now
      ],
      [
        'DON-104', '60 Trays Steamed Rice & Mixed Veg Sabzi', 'Cooked Meals', '35 kg (90 servings)',
        'Infosys Tech Park Cafeteria', '+91 99100 88221', 'Electronic City Gate 2', 4.1,
        'Cooked at lunch (1:30 PM)', 'chilled', '4°C Chilled', 'hub4', 'Aerocity Rapid Intake Chiller',
        'available', null, null, null, now + (2 * 60 + 20) * 60 * 1000, 1, now
      ],
      [
        'DON-105', '95 kg Fresh Crates Apples & Bananas', 'Fruits & Veggies', '95 kg (300+ servings)',
        'Metro Wholesale Superstore', '+91 98333 11229', 'Highway Terminal Market', 6.4,
        'Surplus stock sorted today', 'chilled', '6°C Chilled', 'hub3', 'Eastside Community Deep-Freeze',
        'stored', null, null, null, now + (26 * 60) * 60 * 1000, 1, now
      ],
      [
        'DON-106', '50 Boxes Dry Oats, Lentils & Wheat Flour', 'Packaged / Dry', '110 kg',
        'Rotary Community Pantry', '+91 98190 77665', 'Civic Center Hub', 5.0,
        'Sealed manufacturer packages', 'ambient', 'Ambient Pantry', 'hub2', 'Greenfield Solar Cold Unit #4',
        'available', null, null, null, now + (72 * 60) * 60 * 1000, 1, now
      ]
    ];

    for (const d of seedDonations) {
      insertDonation.run(...d);
    }
  }

  const ngoCount = db.prepare('SELECT COUNT(*) as cnt FROM ngos').get().cnt;
  if (ngoCount === 0) {
    console.log('[DB] Seeding partner NGOs...');
    const insertNgo = db.prepare(`
      INSERT INTO ngos (id, name, avatar, focus, location, daily_beneficiaries, current_demand, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ngos = [
      ['ngo1', 'Robin Hood Army - Central', 'RH', 'Night Food Rescue & Slum Education', 'Covering 14 Wards (Avg pickup: 25 mins)', '1,200+ individuals', 'Needs 80 cooked dinner portions tonight', 1],
      ['ngo2', 'Feeding India Smiles', 'FI', 'Zero Hunger & Malnutrition Support', 'Central & Suburban Hubs', '2,500+ children & elderly', 'Accepts fresh dairy & bakery surplus', 1],
      ['ngo3', 'Annam Relief Foundation', 'AR', 'Hospital Patient Attendants & Shelters', 'Civic Hospital Campus', '800+ patients & families', 'Needs nutritious soft foods & fruits', 1],
      ['ngo4', 'Shelter Home For Children', 'SH', 'Orphaned and Vulnerable Youth Support', 'Sector 18 East', '185 children', 'Needs milk, bread, and breakfast items', 1]
    ];

    for (const ngo of ngos) {
      insertNgo.run(...ngo);
    }
  }
}

// Initialize tables and seed on start
initializeDatabase();

// ==========================================
// Exported Repository Helpers
// ==========================================

const repository = {
  /**
   * Get all donations sorted by FEFO (nearest expires_at first)
   */
  getDonations({ category, search, priority } = {}) {
    let sql = 'SELECT * FROM donations WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(donor) LIKE ? OR LOWER(location) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (priority === 'cold_stored') {
      sql += " AND status = 'stored'";
    }

    // FEFO Sort: First Expired First Out
    sql += ' ORDER BY expires_at ASC';

    const rows = db.prepare(sql).all(...params);
    const now = Date.now();

    // In-memory filter for dynamic priority window calculations
    return rows.filter(item => {
      const diffHours = (item.expires_at - now) / (1000 * 60 * 60);
      if (priority === 'critical' && diffHours > 4) return false;
      if (priority === 'high' && (diffHours <= 4 || diffHours > 12)) return false;
      if (priority === 'moderate' && diffHours <= 12) return false;
      return true;
    }).map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      quantity: row.quantity,
      donor: row.donor,
      donorPhone: row.donor_phone,
      location: row.location,
      distanceKm: row.distance_km,
      prepTime: row.prep_time,
      storageType: row.storage_type,
      targetTemp: row.target_temp,
      coldHubId: row.cold_hub_id,
      coldHubName: row.cold_hub_name,
      status: row.status,
      claimedBy: row.claimed_by_ngo ? {
        ngoName: row.claimed_by_ngo,
        eta: row.claimed_eta,
        claimedAt: row.claimed_at
      } : null,
      expiresAt: row.expires_at,
      hygieneVerified: Boolean(row.hygiene_verified),
      createdAt: row.created_at
    }));
  },

  getDonationById(id) {
    const row = db.prepare('SELECT * FROM donations WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      quantity: row.quantity,
      donor: row.donor,
      donorPhone: row.donor_phone,
      location: row.location,
      distanceKm: row.distance_km,
      prepTime: row.prep_time,
      storageType: row.storage_type,
      targetTemp: row.target_temp,
      coldHubId: row.cold_hub_id,
      coldHubName: row.cold_hub_name,
      status: row.status,
      claimedBy: row.claimed_by_ngo ? {
        ngoName: row.claimed_by_ngo,
        eta: row.claimed_eta,
        claimedAt: row.claimed_at
      } : null,
      expiresAt: row.expires_at,
      hygieneVerified: Boolean(row.hygiene_verified),
      createdAt: row.created_at
    };
  },

  createDonation(data) {
    const id = data.id || `DON-${Math.floor(100 + Math.random() * 900)}`;
    const now = Date.now();
    const expiresAt = data.expiresAt || (now + (data.shelfHours || 6) * 60 * 60 * 1000);

    const stmt = db.prepare(`
      INSERT INTO donations (
        id, title, category, quantity, donor, donor_phone, location, distance_km,
        prep_time, storage_type, target_temp, cold_hub_id, cold_hub_name, status,
        claimed_by_ngo, claimed_eta, claimed_at, expires_at, hygiene_verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.title,
      data.category,
      data.quantity,
      data.donor,
      data.donorPhone || '',
      data.location,
      data.distanceKm || 2.5,
      data.prepTime,
      data.storageType,
      data.targetTemp,
      data.coldHubId,
      data.coldHubName,
      data.status || 'available',
      null, null, null,
      expiresAt,
      1,
      now
    );

    // If assigned to a cold hub, update hub occupancy & inventory
    if (data.coldHubId) {
      db.prepare(`
        UPDATE cold_hubs 
        SET occupied_kg = MIN(total_capacity_kg, occupied_kg + 25),
            available_kg = MAX(0, total_capacity_kg - (occupied_kg + 25) - reserved_kg)
        WHERE id = ?
      `).run(data.coldHubId);

      db.prepare(`
        INSERT INTO cold_hub_inventory (hub_id, item_name, stored_at, temp)
        VALUES (?, ?, 'Just now', ?)
      `).run(data.coldHubId, data.title, data.targetTemp);
    }

    return this.getDonationById(id);
  },

  claimDonation(id, { ngoName, eta }) {
    const timeStr = new Date().toLocaleTimeString();
    const result = db.prepare(`
      UPDATE donations 
      SET status = 'claimed',
          claimed_by_ngo = ?,
          claimed_eta = ?,
          claimed_at = ?
      WHERE id = ?
    `).run(ngoName, eta, timeStr, id);

    if (result.changes === 0) return null;
    return this.getDonationById(id);
  },

  getColdHubs() {
    const hubs = db.prepare('SELECT * FROM cold_hubs').all();
    const invStmt = db.prepare('SELECT item_name as name, stored_at as storedAt, temp FROM cold_hub_inventory WHERE hub_id = ? ORDER BY id DESC LIMIT 5');

    return hubs.map(h => ({
      id: h.id,
      name: h.name,
      address: h.address,
      distanceKm: h.distance_km,
      openHours: h.open_hours,
      tempChilled: h.temp_chilled,
      tempFreeze: h.temp_freeze,
      humidity: h.humidity,
      totalCapacityKg: h.total_capacity_kg,
      occupiedKg: h.occupied_kg,
      reservedKg: h.reserved_kg,
      availableKg: h.available_kg,
      itemsStored: invStmt.all(h.id)
    }));
  },

  getColdHubById(id) {
    const h = db.prepare('SELECT * FROM cold_hubs WHERE id = ?').get(id);
    if (!h) return null;
    const itemsStored = db.prepare('SELECT item_name as name, stored_at as storedAt, temp FROM cold_hub_inventory WHERE hub_id = ? ORDER BY id DESC').all(id);

    return {
      id: h.id,
      name: h.name,
      address: h.address,
      distanceKm: h.distance_km,
      openHours: h.open_hours,
      tempChilled: h.temp_chilled,
      tempFreeze: h.temp_freeze,
      humidity: h.humidity,
      totalCapacityKg: h.total_capacity_kg,
      occupiedKg: h.occupied_kg,
      reservedKg: h.reserved_kg,
      availableKg: h.available_kg,
      itemsStored
    };
  },

  createReservation(hubId, reservedBy = 'Donor') {
    const hub = this.getColdHubById(hubId);
    if (!hub) return null;

    const lockerNum = Math.floor(Math.random() * 25) + 1;
    const lockerCode = `LOCKER #C-${lockerNum}`;
    const pinCode = String(Math.floor(1000 + Math.random() * 9000));
    const now = Date.now();

    db.prepare(`
      INSERT INTO locker_reservations (hub_id, hub_name, locker_code, pin_code, reserved_by, reserved_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(hubId, hub.name, lockerCode, pinCode, reservedBy, now);

    // Reserve 15 kg space
    db.prepare(`
      UPDATE cold_hubs 
      SET reserved_kg = reserved_kg + 15,
          available_kg = MAX(0, available_kg - 15)
      WHERE id = ?
    `).run(hubId);

    return {
      hubId,
      hubName: hub.name,
      lockerCode,
      pinCode,
      reservedAt: now,
      validHours: 4
    };
  },

  getNgos() {
    const rows = db.prepare('SELECT * FROM ngos').all();
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      focus: r.focus,
      location: r.location,
      dailyBeneficiaries: r.daily_beneficiaries,
      currentDemand: r.current_demand,
      verified: Boolean(r.verified)
    }));
  },

  getMetrics() {
    const totalDonations = db.prepare('SELECT COUNT(*) as cnt FROM donations').get().cnt;
    const activeHubs = db.prepare('SELECT COUNT(*) as cnt FROM cold_hubs').get().cnt;
    const totalClaimed = db.prepare("SELECT COUNT(*) as cnt FROM donations WHERE status = 'claimed'").get().cnt;

    return {
      totalDonations,
      activeNodes: activeHubs,
      dispatchedCount: totalClaimed,
      mealsRescuedToday: 3480 + (totalDonations * 75),
      carbonPreventedKg: 8700 + (totalDonations * 60)
    };
  }
};

module.exports = {
  db,
  repository
};
