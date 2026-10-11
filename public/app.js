/**
 * NourishChain - Smart Food Donation & Cold-Storage Network
 * Frontend Client with Full REST API Backend Integration & FEFO Engine
 */

// ==========================================
// 1. API Client Helper
// ==========================================

const API_BASE = window.location.origin;

const api = {
  async getDonations(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.priority && params.priority !== 'all') query.append('priority', params.priority);

    const res = await fetch(`${API_BASE}/api/donations?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch donations');
    const json = await res.json();
    return json.data;
  },

  async createDonation(payload) {
    const res = await fetch(`${API_BASE}/api/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create donation');
    const json = await res.json();
    return json.data;
  },

  async claimDonation(id, { ngoName, eta }) {
    const res = await fetch(`${API_BASE}/api/donations/${id}/claim`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ngoName, eta })
    });
    if (!res.ok) throw new Error('Failed to claim donation');
    const json = await res.json();
    return json.data;
  },

  async getColdHubs() {
    const res = await fetch(`${API_BASE}/api/cold-hubs`);
    if (!res.ok) throw new Error('Failed to fetch cold hubs');
    const json = await res.json();
    return json.data;
  },

  async reserveLocker(hubId, reservedBy) {
    const res = await fetch(`${API_BASE}/api/cold-hubs/${hubId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservedBy })
    });
    if (!res.ok) throw new Error('Failed to reserve locker');
    const json = await res.json();
    return json.data;
  },

  async getNgos() {
    const res = await fetch(`${API_BASE}/api/ngos`);
    if (!res.ok) throw new Error('Failed to fetch NGOs');
    const json = await res.json();
    return json.data;
  },

  async getMetrics() {
    const res = await fetch(`${API_BASE}/api/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    const json = await res.json();
    return json.data;
  }
};

// ==========================================
// 2. State Management
// ==========================================

class AppState {
  constructor() {
    this.donations = [];
    this.coldHubs = [];
    this.ngos = [];
    this.selectedColdHubId = 'hub1';
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.pendingClaimItem = null;
  }

  async syncFromBackend() {
    try {
      const [donations, hubs, ngos] = await Promise.all([
        api.getDonations({
          category: this.categoryFilter,
          search: this.searchQuery,
          priority: this.currentFilter
        }),
        api.getColdHubs(),
        api.getNgos()
      ]);

      this.donations = donations;
      this.coldHubs = hubs;
      this.ngos = ngos;
      if (hubs.length > 0 && !this.selectedColdHubId) {
        this.selectedColdHubId = hubs[0].id;
      }
    } catch (e) {
      console.warn('Backend offline or error, using cached state:', e);
    }
  }

  // In-memory FEFO sort
  getSortedAndFilteredDonations() {
    const now = Date.now();
    let filtered = [...this.donations];

    // Priority filter
    if (this.currentFilter === 'critical') {
      filtered = filtered.filter(item => (item.expiresAt - now) <= 4 * 3600 * 1000);
    } else if (this.currentFilter === 'high') {
      filtered = filtered.filter(item => {
        const diff = item.expiresAt - now;
        return diff > 4 * 3600 * 1000 && diff <= 12 * 3600 * 1000;
      });
    } else if (this.currentFilter === 'moderate') {
      filtered = filtered.filter(item => (item.expiresAt - now) > 12 * 3600 * 1000);
    } else if (this.currentFilter === 'cold_stored') {
      filtered = filtered.filter(item => item.status === 'stored');
    }

    // Category filter
    if (this.categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === this.categoryFilter);
    }

    // Search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.donor.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    }

    // FEFO order: lowest expiresAt first
    filtered.sort((a, b) => a.expiresAt - b.expiresAt);
    return filtered;
  }
}

const state = new AppState();

// ==========================================
// 3. UI Helpers
// ==========================================

function formatCountdown(targetTime) {
  const diff = targetTime - Date.now();
  if (diff <= 0) {
    return { expired: true, text: 'EXPIRED (Safe Window Passed)', hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = n => String(n).padStart(2, '0');
  return {
    expired: false,
    text: `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`,
    hours,
    minutes,
    seconds
  };
}

function getPriorityLevel(expiresAt) {
  const diffHours = (expiresAt - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 4) {
    return {
      level: 'critical',
      label: 'Critical Priority (<4h)',
      badgeClass: 'badge-urgent',
      cardClass: 'priority-critical'
    };
  } else if (diffHours <= 12) {
    return {
      level: 'high',
      label: 'Urgent Priority (4-12h)',
      badgeClass: 'badge-warning',
      cardClass: 'priority-high'
    };
  } else {
    return {
      level: 'moderate',
      label: 'Standard Expiry (>12h)',
      badgeClass: 'badge-success',
      cardClass: 'priority-moderate'
    };
  }
}

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'urgent' ? '⚠️' : '✅';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-msg">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// ==========================================
// 4. Rendering Modules
// ==========================================

function updateFilterCounts() {
  const now = Date.now();
  let countCritical = 0;
  let countHigh = 0;
  let countModerate = 0;
  let countCold = 0;

  state.donations.forEach(item => {
    const diffHours = (item.expiresAt - now) / (1000 * 60 * 60);
    if (diffHours <= 4) countCritical++;
    else if (diffHours <= 12) countHigh++;
    else countModerate++;

    if (item.status === 'stored') countCold++;
  });

  const elAll = document.getElementById('countAll');
  const elCritical = document.getElementById('countCritical');
  const elHigh = document.getElementById('countHigh');
  const elModerate = document.getElementById('countModerate');
  const elCold = document.getElementById('countCold');

  if (elAll) elAll.textContent = state.donations.length;
  if (elCritical) elCritical.textContent = countCritical;
  if (elHigh) elHigh.textContent = countHigh;
  if (elModerate) elModerate.textContent = countModerate;
  if (elCold) elCold.textContent = countCold;
}

function renderDonationCards() {
  const grid = document.getElementById('donationCardsGrid');
  const emptyState = document.getElementById('emptyState');
  if (!grid) return;

  const items = state.getSortedAndFilteredDonations();

  if (items.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = items.map((item, index) => {
    const priority = getPriorityLevel(item.expiresAt);
    const countdown = formatCountdown(item.expiresAt);
    const rank = index + 1;

    let storageIcon = '❄️';
    if (item.storageType === 'frozen') storageIcon = '🧊';
    if (item.storageType === 'ambient') storageIcon = '📦';

    const isClaimed = item.status === 'claimed';
    const isColdStored = item.status === 'stored';

    return `
      <article class="food-card ${priority.cardClass}" data-id="${item.id}">
        <div class="food-card-header">
          <div class="d-flex align-center gap-2">
            <span class="fefo-rank-badge" title="First-Expired-First-Out Ranking">FEFO RANK #${rank}</span>
            <span class="badge ${priority.badgeClass}">${priority.label}</span>
          </div>
          ${isClaimed 
            ? `<span class="badge badge-success">DISPATCH ASSIGNED</span>`
            : isColdStored 
            ? `<span class="badge badge-primary">IN COLD VAULT</span>` 
            : `<span class="badge badge-soft">PENDING PICKUP</span>`}
        </div>

        <div class="expiry-countdown-box">
          <span class="countdown-icon">${priority.level === 'critical' ? '🔥' : '⏱️'}</span>
          <div class="countdown-details">
            <div class="countdown-label">
              <span>Expiry Countdown</span>
              <span class="${priority.level === 'critical' ? 'text-danger' : ''}">${priority.level.toUpperCase()}</span>
            </div>
            <div class="countdown-timer-str ${priority.level === 'critical' ? 'text-danger' : ''}" data-countdown="${item.expiresAt}">
              ${countdown.text}
            </div>
          </div>
        </div>

        <h3 class="food-card-title">${item.title}</h3>

        <div class="food-meta-row">
          <span class="meta-item">📍 ${item.location} (${item.distanceKm} km away)</span>
          <span class="meta-item">⚖️ ${item.quantity}</span>
        </div>

        <div class="storage-badge-pill">
          <span>${storageIcon}</span>
          <span>Requirement: <strong>${item.targetTemp}</strong></span>
        </div>

        <ul class="food-specs-list">
          <li>
            <span class="specs-label">Donor:</span>
            <span class="specs-val">${item.donor}</span>
          </li>
          <li>
            <span class="specs-label">Prepared:</span>
            <span class="specs-val">${item.prepTime}</span>
          </li>
          <li>
            <span class="specs-label">Assigned Hub:</span>
            <span class="specs-val">${item.coldHubName}</span>
          </li>
          ${isClaimed ? `
            <li style="color: var(--primary);">
              <span class="specs-label">Assigned To:</span>
              <span class="specs-val">${item.claimedBy.ngoName} (${item.claimedBy.eta})</span>
            </li>
          ` : ''}
        </ul>

        <div class="food-card-footer">
          ${isClaimed ? `
            <button class="btn btn-secondary w-100" disabled>
              ✓ Van Dispatched (${item.claimedBy.eta})
            </button>
          ` : `
            <button class="btn btn-primary w-100 claim-food-btn" data-id="${item.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>
              Claim for Shelter
            </button>
            <button class="btn btn-outline hub-locate-btn" data-hub="${item.coldHubId}" title="View Cold Storage Hub">
              ❄️ Hub
            </button>
          `}
        </div>
      </article>
    `;
  }).join('');

  // Attach event handlers
  document.querySelectorAll('.claim-food-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openClaimModal(id);
    });
  });

  document.querySelectorAll('.hub-locate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const hubId = btn.getAttribute('data-hub');
      selectColdHub(hubId);
      const hubSection = document.getElementById('cold-network');
      if (hubSection) hubSection.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function updateHeroUrgentRadar() {
  const all = [...state.donations].sort((a, b) => a.expiresAt - b.expiresAt);
  if (all.length === 0) return;

  const topItem = all[0];
  const countdown = formatCountdown(topItem.expiresAt);

  const heroItem = document.getElementById('heroUrgentItem');
  const heroBadge = document.getElementById('heroUrgentBadge');
  const heroTimer = document.getElementById('heroCountdownTimer');
  const tickerText = document.getElementById('tickerUrgentText');

  if (heroItem) {
    heroItem.innerHTML = `
      <div class="urgent-item-icon">🍱</div>
      <div class="urgent-item-info">
        <strong>${topItem.title}</strong>
        <span>${topItem.donor} • ${topItem.location}</span>
      </div>
    `;
  }

  if (heroBadge) {
    heroBadge.textContent = countdown.expired ? 'EXPIRED' : `${countdown.hours}h ${countdown.minutes}m LEFT`;
  }

  if (heroTimer) {
    heroTimer.textContent = countdown.text;
  }

  if (tickerText) {
    tickerText.innerHTML = `
      <strong>${topItem.title}</strong> expiring in <strong>${countdown.hours}h ${countdown.minutes}m</strong> from ${topItem.donor} — Routing with Priority #1!
    `;
  }
}

function renderColdHubs() {
  const container = document.getElementById('coldHubList');
  if (!container) return;

  container.innerHTML = state.coldHubs.map(hub => {
    const isSelected = hub.id === state.selectedColdHubId;
    const capacityPct = Math.round((hub.occupiedKg / hub.totalCapacityKg) * 100);

    return `
      <div class="hub-card ${isSelected ? 'selected' : ''}" data-hub-id="${hub.id}">
        <div class="hub-card-head">
          <h4 class="hub-card-name">${hub.name}</h4>
          <span class="hub-card-dist">${hub.distanceKm} km away</span>
        </div>
        <p class="hub-card-address">${hub.address} • ${hub.openHours}</p>
        <div class="hub-quick-metrics">
          <span><span class="live-dot green"></span> Chiller: <strong>${hub.tempChilled}</strong></span>
          <span>Free Space: <strong>${hub.availableKg} kg (${100 - capacityPct}%)</strong></span>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.hub-card').forEach(card => {
    card.addEventListener('click', () => {
      const hubId = card.getAttribute('data-hub-id');
      selectColdHub(hubId);
    });
  });

  renderActiveHubTelemetry();
}

function selectColdHub(hubId) {
  state.selectedColdHubId = hubId;
  document.querySelectorAll('.hub-card').forEach(card => {
    if (card.getAttribute('data-hub-id') === hubId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
  renderActiveHubTelemetry();
}

function renderActiveHubTelemetry() {
  const hub = state.coldHubs.find(h => h.id === state.selectedColdHubId);
  if (!hub) return;

  const nameEl = document.getElementById('activeHubName');
  const addrEl = document.getElementById('activeHubAddress');
  const chilledEl = document.getElementById('telemetryTempChilled');
  const freezeEl = document.getElementById('telemetryTempFreeze');
  const humidEl = document.getElementById('telemetryHumidity');
  const capTextEl = document.getElementById('activeHubCapacityText');

  const progOccupied = document.getElementById('activeHubProgressOccupied');
  const progReserved = document.getElementById('activeHubProgressReserved');
  const progFree = document.getElementById('activeHubProgressFree');
  const inventoryList = document.getElementById('hubInventoryList');

  if (nameEl) nameEl.textContent = hub.name;
  if (addrEl) addrEl.textContent = `${hub.address} • ${hub.distanceKm} km away • ${hub.openHours}`;
  if (chilledEl) chilledEl.textContent = hub.tempChilled;
  if (freezeEl) freezeEl.textContent = hub.tempFreeze;
  if (humidEl) humidEl.textContent = hub.humidity;

  const occPct = Math.round((hub.occupiedKg / hub.totalCapacityKg) * 100);
  const resPct = Math.round((hub.reservedKg / hub.totalCapacityKg) * 100);
  const freePct = Math.max(0, 100 - occPct - resPct);

  if (capTextEl) {
    capTextEl.textContent = `${hub.occupiedKg} kg / ${hub.totalCapacityKg} kg occupied (${occPct}%) • ${hub.availableKg} kg available`;
  }

  if (progOccupied) progOccupied.style.width = `${occPct}%`;
  if (progReserved) progReserved.style.width = `${resPct}%`;
  if (progFree) progFree.style.width = `${freePct}%`;

  if (inventoryList) {
    if (!hub.itemsStored || hub.itemsStored.length === 0) {
      inventoryList.innerHTML = `<li class="text-muted">No food currently stored in this chamber. Space available for intake.</li>`;
    } else {
      inventoryList.innerHTML = hub.itemsStored.map(item => `
        <li>
          <span><strong>${item.name}</strong> (Stored ${item.storedAt})</span>
          <span class="badge badge-soft">${item.temp}</span>
        </li>
      `).join('');
    }
  }
}

function renderNgos() {
  const grid = document.getElementById('ngoGrid');
  if (!grid) return;

  grid.innerHTML = state.ngos.map(ngo => `
    <div class="ngo-card">
      <div class="ngo-logo-row">
        <div class="ngo-avatar">${ngo.avatar}</div>
        <div>
          <h4 class="ngo-name">${ngo.name}</h4>
          <span class="ngo-area">📍 ${ngo.location}</span>
        </div>
      </div>
      <p class="ngo-desc">${ngo.focus}</p>
      <div class="ngo-demand-pill">
        <strong>Live Demand:</strong> ${ngo.currentDemand}
      </div>
      <div class="ngo-card-actions">
        <span>Beneficiaries: <strong>${ngo.dailyBeneficiaries}</strong></span>
        <button class="btn btn-outline btn-sm connect-ngo-btn" data-ngo="${ngo.name}">Contact</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.connect-ngo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-ngo');
      showToast('NGO Dispatch Connected', `Direct dispatch line opened with ${name}. You can assign priority donations now.`);
    });
  });
}

// ==========================================
// 5. Modals & Interactive Workflows
// ==========================================

function openDonateModal() {
  const backdrop = document.getElementById('donateModalBackdrop');
  if (backdrop) {
    backdrop.style.display = 'flex';
    updateFormUrgencyPreview();
  }
}

function closeDonateModal() {
  const backdrop = document.getElementById('donateModalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function openClaimModal(donationId) {
  state.pendingClaimItem = state.donations.find(d => d.id === donationId);
  if (!state.pendingClaimItem) return;

  const backdrop = document.getElementById('claimModalBackdrop');
  const summary = document.getElementById('claimSummary');

  if (summary) {
    summary.innerHTML = `
      <strong>${state.pendingClaimItem.title}</strong><br>
      <span class="text-muted">Quantity:</span> ${state.pendingClaimItem.quantity}<br>
      <span class="text-muted">Donor:</span> ${state.pendingClaimItem.donor} (${state.pendingClaimItem.donorPhone || 'N/A'})<br>
      <span class="text-muted">Location:</span> ${state.pendingClaimItem.location} (${state.pendingClaimItem.distanceKm} km)<br>
      <span class="text-muted">Target Temp:</span> ${state.pendingClaimItem.targetTemp}
    `;
  }

  if (backdrop) backdrop.style.display = 'flex';
}

function closeClaimModal() {
  const backdrop = document.getElementById('claimModalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
  state.pendingClaimItem = null;
}

function openReserveModal(hubName, lockerCode, pinCode) {
  const backdrop = document.getElementById('reserveModalBackdrop');
  const title = document.getElementById('reserveHubTitle');
  const code = document.getElementById('reservePasscode');

  if (title) title.textContent = hubName;
  if (code) code.textContent = `${lockerCode} • PIN: ${pinCode}`;
  if (backdrop) backdrop.style.display = 'flex';
}

function closeReserveModal() {
  const backdrop = document.getElementById('reserveModalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

function updateFormUrgencyPreview() {
  const hoursInput = document.getElementById('shelfLifeInput');
  const previewBox = document.getElementById('formUrgencyPreview');
  const hoursSpan = document.getElementById('formUrgencyHours');
  const titleSpan = document.getElementById('formUrgencyTitle');
  const adviceP = document.getElementById('formUrgencyAdvice');
  const badgeSpan = document.getElementById('formUrgencyBadge');
  const iconSpan = document.getElementById('formUrgencyIcon');

  if (!hoursInput || !previewBox) return;

  const hours = parseInt(hoursInput.value, 10);
  if (hoursSpan) hoursSpan.textContent = hours;

  previewBox.className = 'urgency-calc-preview';

  if (hours <= 3) {
    previewBox.classList.add('urgent-critical-state');
    if (titleSpan) titleSpan.innerHTML = `🚨 CRITICAL PRIORITY (<span id="formUrgencyHours">${hours}</span> Hours Left)`;
    if (adviceP) adviceP.textContent = 'Food will spoil rapidly at room temperature. FEFO Rank #1 emergency dispatch will ping nearby shelters immediately!';
    if (badgeSpan) {
      badgeSpan.className = 'badge badge-urgent';
      badgeSpan.textContent = 'PRIORITY #1 CRITICAL';
    }
    if (iconSpan) iconSpan.textContent = '🔥';
  } else if (hours <= 12) {
    if (titleSpan) titleSpan.innerHTML = `⚡ HIGH PRIORITY (<span id="formUrgencyHours">${hours}</span> Hours Left)`;
    if (adviceP) adviceP.textContent = 'Recommended for chilled cold storage drop-off or express NGO van allocation before 8 PM.';
    if (badgeSpan) {
      badgeSpan.className = 'badge badge-warning';
      badgeSpan.textContent = 'PRIORITY #2 URGENT';
    }
    if (iconSpan) iconSpan.textContent = '⚡';
  } else {
    previewBox.classList.add('urgent-moderate-state');
    if (titleSpan) titleSpan.innerHTML = `🌱 MODERATE EXPIRY (<span id="formUrgencyHours">${hours}</span> Hours Left)`;
    if (adviceP) adviceP.textContent = 'Ample time for scheduled collection or dry/cold pantry shelf placement.';
    if (badgeSpan) {
      badgeSpan.className = 'badge badge-success';
      badgeSpan.textContent = 'PRIORITY #3 STANDARD';
    }
    if (iconSpan) iconSpan.textContent = '📦';
  }
}

// ==========================================
// 6. Impact Calculator
// ==========================================

function updateImpactCalculator(kg) {
  const sliderVal = document.getElementById('calcSliderVal');
  const mealsOut = document.getElementById('calcMealsOut');
  const co2Out = document.getElementById('calcCo2Out');
  const waterOut = document.getElementById('calcWaterOut');

  const meals = Math.round(kg * 2.2);
  const co2 = Math.round(kg * 2.5);
  const water = Math.round(kg * 850).toLocaleString();

  if (sliderVal) sliderVal.textContent = `${kg} kg (approx. ${meals} wholesome meals)`;
  if (mealsOut) mealsOut.textContent = meals.toLocaleString();
  if (co2Out) co2Out.textContent = `${co2} kg`;
  if (waterOut) waterOut.textContent = `${water} L`;
}

// ==========================================
// 7. Event Listeners & Bootstrap
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Theme Toggle
  const themeBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('nourishchain_theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem('nourishchain_theme', next);
    });
  }

  // Load from SQLite Backend
  await state.syncFromBackend();

  updateFilterCounts();
  renderDonationCards();
  renderColdHubs();
  renderNgos();
  updateHeroUrgentRadar();
  updateImpactCalculator(50);

  // Live Timer Loop (Every 1 second)
  setInterval(() => {
    document.querySelectorAll('.countdown-timer-str').forEach(el => {
      const expiresAt = parseInt(el.getAttribute('data-countdown'), 10);
      if (expiresAt) {
        const countdown = formatCountdown(expiresAt);
        el.textContent = countdown.text;
      }
    });
    updateHeroUrgentRadar();
  }, 1000);

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.getAttribute('data-filter');
      renderDonationCards();
    });
  });

  // Search input
  const searchInput = document.getElementById('foodSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderDonationCards();
    });
  }

  // Category select
  const catSelect = document.getElementById('foodCategorySelect');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      state.categoryFilter = e.target.value;
      renderDonationCards();
    });
  }

  // Reset filter btn
  const resetBtn = document.getElementById('resetFilterBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.currentFilter = 'all';
      state.searchQuery = '';
      state.categoryFilter = 'all';
      if (searchInput) searchInput.value = '';
      if (catSelect) catSelect.value = 'all';
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      const allBtn = document.querySelector('[data-filter="all"]');
      if (allBtn) allBtn.classList.add('active');
      renderDonationCards();
    });
  }

  // Modal Open/Close Buttons
  const openModalBtn = document.getElementById('openDonateModalBtn');
  const heroDonateBtn = document.getElementById('heroDonateBtn');
  const closeModalBtn = document.getElementById('closeDonateModalBtn');
  const cancelDonateBtn = document.getElementById('cancelDonateBtn');

  if (openModalBtn) openModalBtn.addEventListener('click', openDonateModal);
  if (heroDonateBtn) heroDonateBtn.addEventListener('click', openDonateModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeDonateModal);
  if (cancelDonateBtn) cancelDonateBtn.addEventListener('click', closeDonateModal);

  // Quick Find Hub header button
  const quickFindHubBtn = document.getElementById('quickFindHubBtn');
  if (quickFindHubBtn) {
    quickFindHubBtn.addEventListener('click', () => {
      const hubSection = document.getElementById('cold-network');
      if (hubSection) hubSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Expiry Shelf Life in Form
  const shelfLifeInput = document.getElementById('shelfLifeInput');
  if (shelfLifeInput) {
    shelfLifeInput.addEventListener('change', updateFormUrgencyPreview);
  }

  // Donation Form Submission -> POST to Backend
  const donationForm = document.getElementById('foodDonationForm');
  if (donationForm) {
    donationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('foodTitleInput').value;
      const category = document.getElementById('foodCategoryInput').value;
      const quantity = document.getElementById('foodQuantityInput').value;
      const prepTime = document.getElementById('prepTimeInput').value;
      const shelfHours = parseInt(document.getElementById('shelfLifeInput').value, 10);
      const storageTypeRadio = document.querySelector('input[name="storageType"]:checked');
      const fulfillTypeRadio = document.querySelector('input[name="fulfillType"]:checked');
      const location = document.getElementById('donorLocationInput').value;
      const coldHubId = document.getElementById('coldStorageChoice').value;
      const donorName = document.getElementById('donorNameInput').value;
      const donorPhone = document.getElementById('donorPhoneInput').value;

      const selectedHub = state.coldHubs.find(h => h.id === coldHubId) || state.coldHubs[0];
      const storageType = storageTypeRadio ? storageTypeRadio.value : 'chilled';
      const fulfillType = fulfillTypeRadio ? fulfillTypeRadio.value : 'dropoff';

      let targetTemp = '3°C Chilled';
      if (storageType === 'frozen') targetTemp = '< -15°C Deep Freeze';
      if (storageType === 'ambient') targetTemp = 'Ambient Dry Pantry';

      const payload = {
        title,
        category,
        quantity,
        donor: donorName,
        donorPhone,
        location,
        distanceKm: (Math.random() * 4 + 1).toFixed(1),
        prepTime,
        storageType,
        targetTemp,
        coldHubId: selectedHub.id,
        coldHubName: selectedHub.name,
        status: fulfillType === 'dropoff' ? 'stored' : 'available',
        shelfHours
      };

      try {
        const savedDonation = await api.createDonation(payload);
        state.donations.unshift(savedDonation);

        // Update hub locally
        const hub = state.coldHubs.find(h => h.id === selectedHub.id);
        if (hub) {
          hub.occupiedKg = Math.min(hub.totalCapacityKg, hub.occupiedKg + 25);
          hub.availableKg = Math.max(0, hub.totalCapacityKg - hub.occupiedKg - hub.reservedKg);
          hub.itemsStored.unshift({
            name: title,
            storedAt: 'Just now',
            temp: targetTemp
          });
        }

        updateFilterCounts();
        renderDonationCards();
        renderColdHubs();
        updateHeroUrgentRadar();
        closeDonateModal();
        donationForm.reset();

        const priority = getPriorityLevel(savedDonation.expiresAt);
        showToast(
          'Donation Recorded in Database!',
          `Saved to SQLite backend. Routed via FEFO algorithm with ${priority.label}. Cold locker reserved at ${selectedHub.name}.`
        );
      } catch (err) {
        console.error('Error saving donation:', err);
        showToast('Error', 'Failed to save donation to database', 'urgent');
      }
    });
  }

  // Claim Modal Form -> PATCH to Backend
  const claimForm = document.getElementById('claimForm');
  const closeClaimModalBtn = document.getElementById('closeClaimModalBtn');
  if (closeClaimModalBtn) closeClaimModalBtn.addEventListener('click', closeClaimModal);

  if (claimForm) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!state.pendingClaimItem) return;

      const ngoName = document.getElementById('claimNgoSelect').value;
      const eta = document.getElementById('dispatchEta').value;

      try {
        const updated = await api.claimDonation(state.pendingClaimItem.id, { ngoName, eta });
        
        // Update in-memory
        const item = state.donations.find(d => d.id === state.pendingClaimItem.id);
        if (item) {
          item.status = 'claimed';
          item.claimedBy = updated.claimedBy;
        }

        renderDonationCards();
        updateFilterCounts();
        updateHeroUrgentRadar();
        closeClaimModal();

        showToast(
          'Dispatch Recorded in Database!',
          `Van from ${ngoName} assigned for pickup (${eta}). Safe cold-chain preservation locked.`,
          'success'
        );
      } catch (err) {
        console.error('Claim error:', err);
        showToast('Error', 'Failed to update claim on server', 'urgent');
      }
    });
  }

  // Reserve Locker Button -> POST to Backend
  const reserveLockerBtn = document.getElementById('reserveLockerBtn');
  const closeReserveModalBtn = document.getElementById('closeReserveModalBtn');
  const doneReserveBtn = document.getElementById('doneReserveBtn');

  if (reserveLockerBtn) {
    reserveLockerBtn.addEventListener('click', async () => {
      const activeHub = state.coldHubs.find(h => h.id === state.selectedColdHubId) || state.coldHubs[0];
      try {
        const resData = await api.reserveLocker(activeHub.id, 'Self-Drop Donor');
        openReserveModal(activeHub.name, resData.lockerCode, resData.pinCode);

        // Update hub capacity visually
        activeHub.reservedKg += 15;
        activeHub.availableKg = Math.max(0, activeHub.availableKg - 15);
        renderActiveHubTelemetry();
      } catch (err) {
        console.error('Reservation error:', err);
        showToast('Reservation Error', 'Could not secure locker slot', 'urgent');
      }
    });
  }

  if (closeReserveModalBtn) closeReserveModalBtn.addEventListener('click', closeReserveModal);
  if (doneReserveBtn) {
    doneReserveBtn.addEventListener('click', () => {
      closeReserveModal();
      showToast('Locker Pass Active', 'QR code and 4-digit PIN stored in database. Scan at the gate terminal.');
    });
  }

  // Directions Button
  const getDirectionsBtn = document.getElementById('getDirectionsBtn');
  if (getDirectionsBtn) {
    getDirectionsBtn.addEventListener('click', () => {
      const activeHub = state.coldHubs.find(h => h.id === state.selectedColdHubId) || state.coldHubs[0];
      showToast('Navigation Route', `Turn-by-turn navigation generated for ${activeHub.name} (${activeHub.address}).`);
    });
  }

  // Impact Slider
  const impactSlider = document.getElementById('impactSlider');
  if (impactSlider) {
    impactSlider.addEventListener('input', (e) => {
      updateImpactCalculator(parseInt(e.target.value, 10));
    });
  }

  // Banner close
  const closeBannerBtn = document.getElementById('closeBannerBtn');
  const urgentBanner = document.getElementById('urgentBanner');
  if (closeBannerBtn && urgentBanner) {
    closeBannerBtn.addEventListener('click', () => {
      urgentBanner.style.display = 'none';
    });
  }

  // Emergency Hotline button
  const emergencyCallBtn = document.getElementById('emergencyCallBtn');
  if (emergencyCallBtn) {
    emergencyCallBtn.addEventListener('click', () => {
      showToast(
        'Hotline Connected',
        'Calling 1800-RESCUE-FOOD (24/7 Rapid Response Coordinator on line)',
        'urgent'
      );
    });
  }
});
