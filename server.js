/**
 * NourishChain - Express Backend Server
 * Compatible with both standalone Node.js and Vercel Serverless Functions
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { repository } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Serve frontend static assets (from public folder and root)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// ==========================================
// REST API ROUTES
// ==========================================

/**
 * Health & Diagnostics
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: 'NourishChain Backend v1.0',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Standalone Node.js',
    db: repository.engineName || 'SQLite/Memory Store',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/donations
 * Retrieves donations arranged by FEFO (First-Expired-First-Out) priority
 */
app.get('/api/donations', (req, res) => {
  try {
    const { category, search, priority } = req.query;
    const donations = repository.getDonations({ category, search, priority });
    res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (err) {
    console.error('Error fetching donations:', err);
    res.status(500).json({ success: false, error: 'Internal database error' });
  }
});

/**
 * GET /api/donations/:id
 */
app.get('/api/donations/:id', (req, res) => {
  try {
    const item = repository.getDonationById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('Error fetching donation:', err);
    res.status(500).json({ success: false, error: 'Internal database error' });
  }
});

/**
 * POST /api/donations
 * Creates a new donation, calculates FEFO window, and updates cold storage
 */
app.post('/api/donations', (req, res) => {
  try {
    const {
      title,
      category,
      quantity,
      donor,
      donorPhone,
      location,
      distanceKm,
      prepTime,
      storageType,
      targetTemp,
      coldHubId,
      coldHubName,
      status,
      shelfHours,
      expiresAt
    } = req.body;

    if (!title || !category || !quantity || !donor || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (title, category, quantity, donor, location)'
      });
    }

    const newDonation = repository.createDonation({
      title,
      category,
      quantity,
      donor,
      donorPhone,
      location,
      distanceKm: distanceKm ? parseFloat(distanceKm) : (Math.random() * 4 + 1).toFixed(1),
      prepTime: prepTime || 'Just now',
      storageType: storageType || 'chilled',
      targetTemp: targetTemp || '3°C Chilled',
      coldHubId: coldHubId || 'hub1',
      coldHubName: coldHubName || 'Metro Central Cold Vault #1',
      status: status || 'available',
      shelfHours: shelfHours ? parseInt(shelfHours, 10) : 6,
      expiresAt: expiresAt ? parseInt(expiresAt, 10) : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Donation published to FEFO priority dispatch queue',
      data: newDonation
    });
  } catch (err) {
    console.error('Error creating donation:', err);
    res.status(500).json({ success: false, error: 'Failed to record donation' });
  }
});

/**
 * PATCH /api/donations/:id/claim
 * Allocates parcel to an NGO and driver van
 */
app.patch('/api/donations/:id/claim', (req, res) => {
  try {
    const { ngoName, eta } = req.body;
    if (!ngoName || !eta) {
      return res.status(400).json({ success: false, error: 'ngoName and eta are required' });
    }

    const updated = repository.claimDonation(req.params.id, { ngoName, eta });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }

    res.json({
      success: true,
      message: `Donation claimed by ${ngoName} with ETA: ${eta}`,
      data: updated
    });
  } catch (err) {
    console.error('Error claiming donation:', err);
    res.status(500).json({ success: false, error: 'Failed to claim donation' });
  }
});

/**
 * GET /api/cold-hubs
 * Returns all cold storage hubs with real-time telemetry and available capacities
 */
app.get('/api/cold-hubs', (req, res) => {
  try {
    const hubs = repository.getColdHubs();
    res.json({ success: true, count: hubs.length, data: hubs });
  } catch (err) {
    console.error('Error fetching cold hubs:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve cold hubs' });
  }
});

/**
 * GET /api/cold-hubs/:id
 */
app.get('/api/cold-hubs/:id', (req, res) => {
  try {
    const hub = repository.getColdHubById(req.params.id);
    if (!hub) {
      return res.status(404).json({ success: false, error: 'Cold hub not found' });
    }
    res.json({ success: true, data: hub });
  } catch (err) {
    console.error('Error fetching hub details:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve hub' });
  }
});

/**
 * POST /api/cold-hubs/:id/reserve
 * Reserves a locker slot in the designated cold storage hub
 */
app.post('/api/cold-hubs/:id/reserve', (req, res) => {
  try {
    const { reservedBy } = req.body;
    const reservation = repository.createReservation(req.params.id, reservedBy || 'Anonymous Donor');
    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Cold hub not found' });
    }

    res.json({
      success: true,
      message: 'Cold locker compartment secured',
      data: reservation
    });
  } catch (err) {
    console.error('Error reserving locker:', err);
    res.status(500).json({ success: false, error: 'Failed to reserve locker' });
  }
});

/**
 * GET /api/ngos
 * Returns verified partner NGOs and live demand listings
 */
app.get('/api/ngos', (req, res) => {
  try {
    const ngos = repository.getNgos();
    res.json({ success: true, count: ngos.length, data: ngos });
  } catch (err) {
    console.error('Error fetching NGOs:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve NGOs' });
  }
});

/**
 * GET /api/metrics
 * Summary impact counters
 */
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = repository.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve metrics' });
  }
});

// Fallback to index.html for SPA routes (only in standalone mode)
if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

// Start Server when run directly as main module
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 NourishChain Backend running at http://localhost:${PORT}`);
    console.log(`📦 Database: ${repository.engineName}`);
    console.log(`⚡ FEFO Dispatch API ready`);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
