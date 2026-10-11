/**
 * NourishChain - Universal Database Engine
 * Compatible with Node.js local environments (SQLite) and Vercel Serverless (Serverless /tmp SQLite or fallback store)
 */

const path = require('path');
const fs = require('fs');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Initial Seed Constants
const INITIAL_COLD_HUBS = [
  {
    id: 'hub1',
    name: 'Metro Central Cold Vault #1',
    address: '45 Terminal Road, Sector 3',
    distanceKm: 2.1,
    openHours: 'Open 24/7',
    tempChilled: '3.4°C',
    tempFreeze: '-18.2°C',
    humidity: '62% RH',
    totalCapacityKg: 400,
    occupiedKg: 260,
    reservedKg: 60,
    availableKg: 80,
    itemsStored: [
      { name: 'Dairy & Milk Casks (40L)', storedAt: '10:30 AM', temp: '3.2°C' },
      { name: 'Curry & Rice Trays (30kg)', storedAt: '01:15 PM', temp: '3.8°C' },
      { name: 'Paneer Packs (12kg)', storedAt: '11:45 AM', temp: '2.9°C' }
    ]
  },
  {
    id: 'hub2',
    name: 'Greenfield Solar Cold Unit #4',
    address: '12 Eco Green Park, Ring Road',
    distanceKm: 3.8,
    openHours: '6:00 AM - 11:30 PM',
    tempChilled: '4.1°C',
    tempFreeze: '-16.8°C',
    humidity: '58% RH',
    totalCapacityKg: 300,
    occupiedKg: 150,
    reservedKg: 30,
    availableKg: 120,
    itemsStored: [
      { name: 'Bakery Loaves (25kg)', storedAt: '09:00 AM', temp: 'Dry Chamber' },
      { name: 'Pantry Dry Grains (50kg)', storedAt: 'Yesterday', temp: '22.0°C' }
    ]
  },
  {
    id: 'hub3',
    name: 'Eastside Community Deep-Freeze',
    address: 'Plot 89, Logistics Corridor B',
    distanceKm: 5.2,
    openHours: 'Open 24/7',
    tempChilled: '2.8°C',
    tempFreeze: '-21.4°C',
    humidity: '55% RH',
    totalCapacityKg: 550,
    occupiedKg: 220,
    reservedKg: 50,
    availableKg: 280,
    itemsStored: [
      { name: 'Fresh Fruit Crates (95kg)', storedAt: '08:15 AM', temp: '3.1°C' },
      { name: 'Frozen Bulk Broth (45kg)', storedAt: 'Yesterday', temp: '-19.5°C' }
    ]
  },
  {
    id: 'hub4',
    name: 'Aerocity Rapid Intake Chiller',
    address: 'Cargo Gate 3, Airport Expressway',
    distanceKm: 1.4,
    openHours: 'Open 24/7 Express',
    tempChilled: '3.0°C',
    tempFreeze: '-17.5°C',
    humidity: '60% RH',
    totalCapacityKg: 250,
    occupiedKg: 195,
    reservedKg: 25,
    availableKg: 30,
    itemsStored: [
      { name: 'Airline Catering Surplus (80kg)', storedAt: '02:10 PM', temp: '2.8°C' },
      { name: 'Pre-cut Salad Trays (25kg)', storedAt: '01:30 PM', temp: '3.0°C' }
    ]
  }
];

const INITIAL_NGOS = [
  {
    id: 'ngo1',
    name: 'Robin Hood Army - Central',
    avatar: 'RH',
    focus: 'Night Food Rescue & Slum Education',
    location: 'Covering 14 Wards (Avg pickup: 25 mins)',
    dailyBeneficiaries: '1,200+ individuals',
    currentDemand: 'Needs 80 cooked dinner portions tonight',
    verified: true
  },
  {
    id: 'ngo2',
    name: 'Feeding India Smiles',
    avatar: 'FI',
    focus: 'Zero Hunger & Malnutrition Support',
    location: 'Central & Suburban Hubs',
    dailyBeneficiaries: '2,500+ children & elderly',
    currentDemand: 'Accepts fresh dairy & bakery surplus',
    verified: true
  },
  {
    id: 'ngo3',
    name: 'Annam Relief Foundation',
    avatar: 'AR',
    focus: 'Hospital Patient Attendants & Shelters',
    location: 'Civic Hospital Campus',
    dailyBeneficiaries: '800+ patients & families',
    currentDemand: 'Needs nutritious soft foods & fruits',
    verified: true
  },
  {
    id: 'ngo4',
    name: 'Shelter Home For Children',
    avatar: 'SH',
    focus: 'Orphaned and Vulnerable Youth Support',
    location: 'Sector 18 East',
    dailyBeneficiaries: '185 children',
    currentDemand: 'Needs milk, bread, and breakfast items',
    verified: true
  }
];

function getInitialDonations() {
  const now = Date.now();
  return [
    {
      id: 'DON-101',
      title: '120 Portions Catering Biryani & Dal',
      category: 'Cooked Meals',
      quantity: '45 kg (120 servings)',
      donor: 'Grand Hyatt Banquet Hall',
      donorPhone: '+91 98201 54321',
      location: 'BKC Complex, Sector 4',
      distanceKm: 1.8,
      prepTime: 'Cooked 2 hours ago',
      storageType: 'chilled',
      targetTemp: '3°C Chilled',
      coldHubId: 'hub1',
      coldHubName: 'Metro Central Cold Vault #1',
      status: 'available',
      claimedBy: null,
      expiresAt: now + (1 * 60 + 45) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    },
    {
      id: 'DON-102',
      title: '80 Loaves Sourdough & Multigrain Bread',
      category: 'Bakery & Bread',
      quantity: '25 kg (80 units)',
      donor: 'Artisan Oven Bakery',
      donorPhone: '+91 97112 33445',
      location: 'Connaught Promenade',
      distanceKm: 3.2,
      prepTime: 'Baked this morning',
      storageType: 'ambient',
      targetTemp: 'Ambient Pantry',
      coldHubId: 'hub2',
      coldHubName: 'Greenfield Solar Cold Unit #4',
      status: 'available',
      claimedBy: null,
      expiresAt: now + (3 * 60 + 10) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    },
    {
      id: 'DON-103',
      title: '40 Litres Pasteurized Milk & Paneer',
      category: 'Dairy & Milk',
      quantity: '40 L + 12 kg Paneer',
      donor: 'Krishna Dairy Cooperative',
      donorPhone: '+91 98450 12890',
      location: 'South Market Dairy Lane',
      distanceKm: 2.5,
      prepTime: 'Produced 4 hours ago',
      storageType: 'chilled',
      targetTemp: '2°C - 4°C Chilled',
      coldHubId: 'hub1',
      coldHubName: 'Metro Central Cold Vault #1',
      status: 'stored',
      claimedBy: null,
      expiresAt: now + (6 * 60 + 40) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    },
    {
      id: 'DON-104',
      title: '60 Trays Steamed Rice & Mixed Veg Sabzi',
      category: 'Cooked Meals',
      quantity: '35 kg (90 servings)',
      donor: 'Infosys Tech Park Cafeteria',
      donorPhone: '+91 99100 88221',
      location: 'Electronic City Gate 2',
      distanceKm: 4.1,
      prepTime: 'Cooked at lunch (1:30 PM)',
      storageType: 'chilled',
      targetTemp: '4°C Chilled',
      coldHubId: 'hub4',
      coldHubName: 'Aerocity Rapid Intake Chiller',
      status: 'available',
      claimedBy: null,
      expiresAt: now + (2 * 60 + 20) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    },
    {
      id: 'DON-105',
      title: '95 kg Fresh Crates Apples & Bananas',
      category: 'Fruits & Veggies',
      quantity: '95 kg (300+ servings)',
      donor: 'Metro Wholesale Superstore',
      donorPhone: '+91 98333 11229',
      location: 'Highway Terminal Market',
      distanceKm: 6.4,
      prepTime: 'Surplus stock sorted today',
      storageType: 'chilled',
      targetTemp: '6°C Chilled',
      coldHubId: 'hub3',
      coldHubName: 'Eastside Community Deep-Freeze',
      status: 'stored',
      claimedBy: null,
      expiresAt: now + (26 * 60) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    },
    {
      id: 'DON-106',
      title: '50 Boxes Dry Oats, Lentils & Wheat Flour',
      category: 'Packaged / Dry',
      quantity: '110 kg',
      donor: 'Rotary Community Pantry',
      donorPhone: '+91 98190 77665',
      location: 'Civic Center Hub',
      distanceKm: 5.0,
      prepTime: 'Sealed manufacturer packages',
      storageType: 'ambient',
      targetTemp: 'Ambient Pantry',
      coldHubId: 'hub2',
      coldHubName: 'Greenfield Solar Cold Unit #4',
      status: 'available',
      claimedBy: null,
      expiresAt: now + (72 * 60) * 60 * 1000,
      hygieneVerified: true,
      createdAt: now
    }
  ];
}

// =========================================================================
// Attempt Native node:sqlite Engine with Automatic Vercel /tmp or Memory Fallback
// =========================================================================

let sqliteDb = null;
let useSqlite = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  
  let dbFilePath;
  if (isVercel) {
    // In Vercel serverless environment, local root directory is read-only.
    // Use /tmp/nourish_chain.sqlite which is writable.
    dbFilePath = path.join('/tmp', 'nourish_chain.sqlite');
  } else {
    dbFilePath = path.join(__dirname, 'nourish_chain.sqlite');
  }

  sqliteDb = new DatabaseSync(dbFilePath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  useSqlite = true;
  console.log(`[DB Engine] Active: SQLite DatabaseSync at ${dbFilePath}`);
} catch (e) {
  console.log(`[DB Engine] node:sqlite unavailable (${e.message}). Using High-Performance Memory Engine.`);
  useSqlite = false;
}

// -------------------------------------------------------------
// SQLite Implementation (When node:sqlite is supported)
// -------------------------------------------------------------
if (useSqlite && sqliteDb) {
  try {
    sqliteDb.exec(`
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
        status TEXT NOT NULL DEFAULT 'active'
      );
    `);

    // Seed if empty
    const hubCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM cold_hubs').get().cnt;
    if (hubCount === 0) {
      const insertHub = sqliteDb.prepare(`
        INSERT INTO cold_hubs (
          id, name, address, distance_km, open_hours, temp_chilled, 
          temp_freeze, humidity, total_capacity_kg, occupied_kg, 
          reserved_kg, available_kg, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const h of INITIAL_COLD_HUBS) {
        insertHub.run(
          h.id, h.name, h.address, h.distanceKm, h.openHours, h.tempChilled,
          h.tempFreeze, h.humidity, h.totalCapacityKg, h.occupiedKg,
          h.reservedKg, h.availableKg, Date.now()
        );
      }

      const insertInv = sqliteDb.prepare('INSERT INTO cold_hub_inventory (hub_id, item_name, stored_at, temp) VALUES (?, ?, ?, ?)');
      for (const h of INITIAL_COLD_HUBS) {
        for (const item of h.itemsStored) {
          insertInv.run(h.id, item.name, item.storedAt, item.temp);
        }
      }
    }

    const donCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM donations').get().cnt;
    if (donCount === 0) {
      const insertDonation = sqliteDb.prepare(`
        INSERT INTO donations (
          id, title, category, quantity, donor, donor_phone, location, distance_km,
          prep_time, storage_type, target_temp, cold_hub_id, cold_hub_name, status,
          claimed_by_ngo, claimed_eta, claimed_at, expires_at, hygiene_verified, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of getInitialDonations()) {
        insertDonation.run(
          d.id, d.title, d.category, d.quantity, d.donor, d.donorPhone, d.location,
          d.distanceKm, d.prepTime, d.storageType, d.targetTemp, d.coldHubId,
          d.coldHubName, d.status, null, null, null, d.expiresAt, 1, d.createdAt
        );
      }
    }

    const ngoCount = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM ngos').get().cnt;
    if (ngoCount === 0) {
      const insertNgo = sqliteDb.prepare(`
        INSERT INTO ngos (id, name, avatar, focus, location, daily_beneficiaries, current_demand, verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const n of INITIAL_NGOS) {
        insertNgo.run(n.id, n.name, n.avatar, n.focus, n.location, n.dailyBeneficiaries, n.currentDemand, n.verified ? 1 : 0);
      }
    }
  } catch (err) {
    console.error('[DB Initialization Error]:', err);
    useSqlite = false; // Fallback to memory store if SQLite initialization fails
  }
}

// -------------------------------------------------------------
// Universal Fallback / Memory Store (Zero-Dependency Guarantee)
// -------------------------------------------------------------
const memoryStore = {
  donations: getInitialDonations(),
  coldHubs: JSON.parse(JSON.stringify(INITIAL_COLD_HUBS)),
  ngos: JSON.parse(JSON.stringify(INITIAL_NGOS)),
  reservations: []
};

// =========================================================================
// Unified Repository Interface
// =========================================================================

const repository = {
  engineName: useSqlite ? (isVercel ? 'SQLite (/tmp)' : 'SQLite (Local)') : 'High-Performance In-Memory Engine',

  getDonations({ category, search, priority } = {}) {
    if (useSqlite && sqliteDb) {
      try {
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

        sql += ' ORDER BY expires_at ASC';
        const rows = sqliteDb.prepare(sql).all(...params);
        const now = Date.now();

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
      } catch (err) {
        console.error('SQLite query failed, falling back to memoryStore:', err);
      }
    }

    // Memory Store Implementation
    const now = Date.now();
    let list = [...memoryStore.donations];

    if (category && category !== 'all') {
      list = list.filter(d => d.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => 
        d.title.toLowerCase().includes(q) ||
        d.donor.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q)
      );
    }
    if (priority === 'cold_stored') {
      list = list.filter(d => d.status === 'stored');
    }

    list.sort((a, b) => a.expiresAt - b.expiresAt);

    return list.filter(item => {
      const diffHours = (item.expiresAt - now) / (1000 * 60 * 60);
      if (priority === 'critical' && diffHours > 4) return false;
      if (priority === 'high' && (diffHours <= 4 || diffHours > 12)) return false;
      if (priority === 'moderate' && diffHours <= 12) return false;
      return true;
    });
  },

  getDonationById(id) {
    if (useSqlite && sqliteDb) {
      try {
        const row = sqliteDb.prepare('SELECT * FROM donations WHERE id = ?').get(id);
        if (row) {
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
        }
      } catch (err) {
        console.error('SQLite getDonationById error:', err);
      }
    }
    return memoryStore.donations.find(d => d.id === id) || null;
  },

  createDonation(data) {
    const id = data.id || `DON-${Math.floor(100 + Math.random() * 900)}`;
    const now = Date.now();
    const expiresAt = data.expiresAt || (now + (data.shelfHours || 6) * 60 * 60 * 1000);

    const record = {
      id,
      title: data.title,
      category: data.category,
      quantity: data.quantity,
      donor: data.donor,
      donorPhone: data.donorPhone || '',
      location: data.location,
      distanceKm: data.distanceKm || 2.5,
      prepTime: data.prepTime,
      storageType: data.storageType,
      targetTemp: data.targetTemp,
      coldHubId: data.coldHubId,
      coldHubName: data.coldHubName,
      status: data.status || 'available',
      claimedBy: null,
      expiresAt,
      hygieneVerified: true,
      createdAt: now
    };

    if (useSqlite && sqliteDb) {
      try {
        const stmt = sqliteDb.prepare(`
          INSERT INTO donations (
            id, title, category, quantity, donor, donor_phone, location, distance_km,
            prep_time, storage_type, target_temp, cold_hub_id, cold_hub_name, status,
            claimed_by_ngo, claimed_eta, claimed_at, expires_at, hygiene_verified, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          id, record.title, record.category, record.quantity, record.donor,
          record.donorPhone, record.location, record.distanceKm, record.prepTime,
          record.storageType, record.targetTemp, record.coldHubId, record.coldHubName,
          record.status, null, null, null, expiresAt, 1, now
        );

        if (data.coldHubId) {
          sqliteDb.prepare(`
            UPDATE cold_hubs 
            SET occupied_kg = MIN(total_capacity_kg, occupied_kg + 25),
                available_kg = MAX(0, total_capacity_kg - (occupied_kg + 25) - reserved_kg)
            WHERE id = ?
          `).run(data.coldHubId);

          sqliteDb.prepare(`
            INSERT INTO cold_hub_inventory (hub_id, item_name, stored_at, temp)
            VALUES (?, ?, 'Just now', ?)
          `).run(data.coldHubId, record.title, record.targetTemp);
        }

        return this.getDonationById(id);
      } catch (err) {
        console.error('SQLite createDonation error:', err);
      }
    }

    // Memory Store
    memoryStore.donations.unshift(record);
    const hub = memoryStore.coldHubs.find(h => h.id === data.coldHubId);
    if (hub) {
      hub.occupiedKg = Math.min(hub.totalCapacityKg, hub.occupiedKg + 25);
      hub.availableKg = Math.max(0, hub.totalCapacityKg - hub.occupiedKg - hub.reservedKg);
      hub.itemsStored.unshift({ name: record.title, storedAt: 'Just now', temp: record.targetTemp });
    }
    return record;
  },

  claimDonation(id, { ngoName, eta }) {
    const timeStr = new Date().toLocaleTimeString();

    if (useSqlite && sqliteDb) {
      try {
        const result = sqliteDb.prepare(`
          UPDATE donations 
          SET status = 'claimed',
              claimed_by_ngo = ?,
              claimed_eta = ?,
              claimed_at = ?
          WHERE id = ?
        `).run(ngoName, eta, timeStr, id);

        if (result.changes > 0) {
          return this.getDonationById(id);
        }
      } catch (err) {
        console.error('SQLite claimDonation error:', err);
      }
    }

    // Memory Store
    const item = memoryStore.donations.find(d => d.id === id);
    if (item) {
      item.status = 'claimed';
      item.claimedBy = { ngoName, eta, claimedAt: timeStr };
      return item;
    }
    return null;
  },

  getColdHubs() {
    if (useSqlite && sqliteDb) {
      try {
        const hubs = sqliteDb.prepare('SELECT * FROM cold_hubs').all();
        const invStmt = sqliteDb.prepare('SELECT item_name as name, stored_at as storedAt, temp FROM cold_hub_inventory WHERE hub_id = ? ORDER BY id DESC LIMIT 5');

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
      } catch (err) {
        console.error('SQLite getColdHubs error:', err);
      }
    }
    return memoryStore.coldHubs;
  },

  getColdHubById(id) {
    if (useSqlite && sqliteDb) {
      try {
        const h = sqliteDb.prepare('SELECT * FROM cold_hubs WHERE id = ?').get(id);
        if (h) {
          const itemsStored = sqliteDb.prepare('SELECT item_name as name, stored_at as storedAt, temp FROM cold_hub_inventory WHERE hub_id = ? ORDER BY id DESC').all(id);
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
        }
      } catch (err) {
        console.error('SQLite getColdHubById error:', err);
      }
    }
    return memoryStore.coldHubs.find(h => h.id === id) || null;
  },

  createReservation(hubId, reservedBy = 'Donor') {
    const hub = this.getColdHubById(hubId);
    if (!hub) return null;

    const lockerNum = Math.floor(Math.random() * 25) + 1;
    const lockerCode = `LOCKER #C-${lockerNum}`;
    const pinCode = String(Math.floor(1000 + Math.random() * 9000));
    const now = Date.now();

    if (useSqlite && sqliteDb) {
      try {
        sqliteDb.prepare(`
          INSERT INTO locker_reservations (hub_id, hub_name, locker_code, pin_code, reserved_by, reserved_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(hubId, hub.name, lockerCode, pinCode, reservedBy, now);

        sqliteDb.prepare(`
          UPDATE cold_hubs 
          SET reserved_kg = reserved_kg + 15,
              available_kg = MAX(0, available_kg - 15)
          WHERE id = ?
        `).run(hubId);
      } catch (err) {
        console.error('SQLite reservation error:', err);
      }
    }

    const memHub = memoryStore.coldHubs.find(h => h.id === hubId);
    if (memHub) {
      memHub.reservedKg += 15;
      memHub.availableKg = Math.max(0, memHub.availableKg - 15);
    }

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
    if (useSqlite && sqliteDb) {
      try {
        const rows = sqliteDb.prepare('SELECT * FROM ngos').all();
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
      } catch (err) {
        console.error('SQLite getNgos error:', err);
      }
    }
    return memoryStore.ngos;
  },

  getMetrics() {
    const totalDonations = this.getDonations().length;
    const activeHubs = this.getColdHubs().length;
    const totalClaimed = this.getDonations().filter(d => d.status === 'claimed').length;

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
  repository
};
