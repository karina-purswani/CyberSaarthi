/**
 * CyberSaarthi - Cyber Cell Dashboard Logic (admin.js)
 * Interactive Leaflet.js Mapping, Cash-Out Spatial Modeling,
 * Incident Feeds, Section 91 CrPC Freeze, and Mule Network Correlation.
 */

const adminState = {
  map: null,
  markersGroup: null,
  perimeterCircle: null,
  cases: [],
  filteredCases: [],
  selectedCaseId: null,
  activeFilter: 'ALL',
  searchQuery: '',
  correlations: null
};

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadCasesData();
  loadCorrelationsData();
  
  // Auto refresh every 45 seconds for live police desk telemetry
  setInterval(() => {
    loadCasesData(true);
  }, 45000);
});

// ---------------------------------------------------------------------------
// LEAFLET MAP INITIALIZATION
// ---------------------------------------------------------------------------
function initMap() {
  // Center roughly on Maharashtra / Central India cyber corridor
  adminState.map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([18.5204, 73.8567], 13);

  // Add zoom control at bottom-right
  L.control.zoom({ position: 'bottomright' }).addTo(adminState.map);

  // Standard OpenStreetMap Tile Layer (styled dark via CSS filter)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(adminState.map);

  // Layer group for dynamic markers
  adminState.markersGroup = L.layerGroup().addTo(adminState.map);
}

// ---------------------------------------------------------------------------
// FETCH CASES FROM BACKEND
// ---------------------------------------------------------------------------
async function loadCasesData(silent = false) {
  try {
    const response = await fetch('/api/cases');
    if (!response.ok) throw new Error("Failed to load cases from server");

    const data = await response.json();
    adminState.cases = data.cases || [];
    
    updateTelemetryStats();
    applyFilters();

    // Auto-select first case if none selected
    if (!adminState.selectedCaseId && adminState.cases.length > 0) {
      selectIncident(adminState.cases[0].case_id);
    }
  } catch (err) {
    console.error("Error loading cases:", err);
    if (!silent) {
      const container = document.getElementById('incident-list');
      if (container) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-red-400">Unable to connect to CyberSaarthi server at /api/cases. Ensure server.py is running.</div>`;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TELEMETRY STATISTICS
// ---------------------------------------------------------------------------
function updateTelemetryStats() {
  const activeCasesEl = document.getElementById('stat-active-cases');
  const totalLossEl = document.getElementById('stat-total-loss');
  const goldenNodesEl = document.getElementById('stat-golden-nodes');

  if (activeCasesEl) activeCasesEl.textContent = adminState.cases.length;

  let totalLoss = 0;
  let goldenActiveCount = 0;

  adminState.cases.forEach(c => {
    totalLoss += parseFloat(c.disputed_amount || 0);
    if (c.golden_hour_active) goldenActiveCount++;
  });

  if (totalLossEl) totalLossEl.textContent = `₹${Math.round(totalLoss).toLocaleString('en-IN')}`;
  if (goldenNodesEl) goldenNodesEl.textContent = `${goldenActiveCount} Active`;
}

// ---------------------------------------------------------------------------
// INCIDENT FEED & FILTERING
// ---------------------------------------------------------------------------
function setFilter(filterType) {
  adminState.activeFilter = filterType;

  // Update button highlights
  const filterIds = ['all', 'high', 'medium', 'low'];
  filterIds.forEach(f => {
    const btn = document.getElementById(`filter-${f}`);
    if (btn) {
      if (f.toUpperCase() === filterType) {
        btn.className = "px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500 text-black";
      } else {
        btn.className = "px-2 py-0.5 rounded text-[11px] text-gray-400 hover:text-white";
      }
    }
  });

  applyFilters();
}

function filterIncidents() {
  const query = document.getElementById('incident-search').value.toLowerCase().trim();
  adminState.searchQuery = query;
  applyFilters();
}

function applyFilters() {
  let list = adminState.cases;

  // Filter by risk tier
  if (adminState.activeFilter === 'HIGH') {
    list = list.filter(c => c.threat_level === 'CRITICAL' || c.threat_level === 'HIGH');
  } else if (adminState.activeFilter === 'MEDIUM') {
    list = list.filter(c => c.threat_level === 'MEDIUM');
  } else if (adminState.activeFilter === 'LOW') {
    list = list.filter(c => c.threat_level === 'LOW');
  }

  // Filter by search query (UTR, UPI, Phone, Case ID, City)
  if (adminState.searchQuery) {
    const q = adminState.searchQuery;
    list = list.filter(c => {
      const matchId = c.case_id.toLowerCase().includes(q);
      const matchCity = (c.victim_city || '').toLowerCase().includes(q);
      const matchUtr = (c.utr_numbers || []).some(u => u.toLowerCase().includes(q));
      const matchUpi = (c.upi_ids || []).some(u => u.toLowerCase().includes(q));
      const matchPhone = (c.scammer_phones || []).some(p => p.toLowerCase().includes(q));
      return matchId || matchCity || matchUtr || matchUpi || matchPhone;
    });
  }

  adminState.filteredCases = list;
  renderIncidentFeed();
}

function renderIncidentFeed() {
  const container = document.getElementById('incident-list');
  if (!container) return;

  if (adminState.cases.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-gray-500 space-y-2">
        <span class="text-2xl block">🛡️</span>
        <p class="font-bold text-gray-300">No Incidents Reported Yet</p>
        <p class="text-[11px] text-gray-400">Waiting for live citizen complaints submitted via Citizen Intake Portal.</p>
      </div>
    `;
    const drawer = document.getElementById('case-action-drawer');
    if (drawer) drawer.classList.add('hidden');
    const hud = document.getElementById('map-hud-detail');
    if (hud) hud.classList.add('hidden');
    return;
  }

  if (adminState.filteredCases.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-gray-500">
        No incidents match the active search or filter criteria.
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  adminState.filteredCases.forEach(c => {
    const isSelected = c.case_id === adminState.selectedCaseId;
    
    // Threat badge styling
    let threatBadgeClass = "bg-gray-800 text-gray-300 border-gray-700";
    if (c.threat_level === 'CRITICAL') {
      threatBadgeClass = "bg-red-950/80 text-red-400 border-red-800 animate-pulse";
    } else if (c.threat_level === 'HIGH') {
      threatBadgeClass = "bg-orange-950/80 text-orange-400 border-orange-800";
    } else if (c.threat_level === 'MEDIUM') {
      threatBadgeClass = "bg-amber-950/80 text-amber-400 border-amber-800";
    } else {
      threatBadgeClass = "bg-emerald-950/80 text-emerald-400 border-emerald-800";
    }

    const card = document.createElement('div');
    card.id = `card-${c.case_id}`;
    card.className = `p-3 rounded-xl border transition cursor-pointer space-y-2 ${
      isSelected 
        ? 'bg-gray-900 border-cyan-500/80 shadow-md shadow-cyan-500/10' 
        : 'bg-gray-950/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900/40'
    }`;
    card.onclick = () => selectIncident(c.case_id);

    // Golden Hour Pill
    const goldenPill = c.golden_hour_active 
      ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono">⏱️ ${c.golden_hour_remaining_mins}m</span>`
      : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Expired</span>`;

    // Indicators pills
    const utrStr = (c.utr_numbers && c.utr_numbers.length > 0) ? `UTR: ${c.utr_numbers[0]}` : null;
    const upiStr = (c.upi_ids && c.upi_ids.length > 0) ? c.upi_ids[0] : null;
    const phoneStr = (c.scammer_phones && c.scammer_phones.length > 0) ? c.scammer_phones[0] : null;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="font-mono text-xs font-bold text-white">${c.case_id}</span>
          <span class="text-[10px] text-gray-500">• ${c.reported_ago_mins || 15}m ago</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${goldenPill}
          <span class="text-[10px] px-1.5 py-0.5 rounded border font-bold ${threatBadgeClass}">${c.threat_level}</span>
        </div>
      </div>

      <div class="flex items-baseline justify-between">
        <div>
          <span class="text-xs font-semibold text-gray-300 block truncate max-w-[200px]">${c.fraud_category}</span>
          <span class="text-[11px] text-gray-500">${c.victim_city || 'Maharashtra'}</span>
        </div>
        <span class="font-mono font-extrabold text-sm text-red-400">${c.disputed_amount_str || '₹' + c.disputed_amount}</span>
      </div>

      <!-- Mini forensic tags -->
      <div class="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
        ${upiStr ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-900 truncate max-w-[150px]">${upiStr}</span>` : ''}
        ${utrStr ? `<span class="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-900">${utrStr}</span>` : ''}
        ${phoneStr ? `<span class="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-900">${phoneStr}</span>` : ''}
      </div>
    `;

    container.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// SELECT INCIDENT & PLOT ON MAP
// ---------------------------------------------------------------------------
function selectIncident(caseId) {
  adminState.selectedCaseId = caseId;
  renderIncidentFeed();

  const targetCase = adminState.cases.find(c => c.case_id === caseId);
  if (!targetCase) return;

  // Update Action Drawer at bottom of left pane
  const drawer = document.getElementById('case-action-drawer');
  drawer.classList.remove('hidden');
  document.getElementById('drawer-case-id').textContent = targetCase.case_id;
  
  const statusEl = document.getElementById('drawer-freeze-status');
  if (targetCase.bank_frozen) {
    statusEl.textContent = "Status: SEC 91 FREEZE ISSUED";
    statusEl.className = "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono";
    document.getElementById('btn-sec91-freeze').classList.add('opacity-50', 'pointer-events-none');
    document.getElementById('btn-sec91-freeze').innerHTML = "<span>✓</span><span>Freeze Active</span>";
  } else {
    statusEl.textContent = "Status: Active Investigation";
    statusEl.className = "text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono";
    document.getElementById('btn-sec91-freeze').classList.remove('opacity-50', 'pointer-events-none');
    document.getElementById('btn-sec91-freeze').innerHTML = "<span>🚨</span><span>Sec 91 Bank Freeze</span>";
  }

  // Update FIR Download Button in Drawer
  const firBtn = document.getElementById('btn-export-fir');
  firBtn.href = `/api/generate-fir/${targetCase.case_id}`;
  firBtn.setAttribute('download', `CyberSaarthi_FIR_${targetCase.case_id}.pdf`);

  // Plot on Leaflet Map
  plotCaseOnMap(targetCase);
}

// ---------------------------------------------------------------------------
// PLOT INCIDENT & CASH-OUT ATM NODES ON LEAFLET MAP
// ---------------------------------------------------------------------------
function plotCaseOnMap(c) {
  if (!adminState.map || !c.location) return;

  // Clear previous markers & circles
  adminState.markersGroup.clearLayers();
  if (adminState.perimeterCircle) {
    adminState.map.removeLayer(adminState.perimeterCircle);
  }

  const vlat = c.location.lat;
  const vlon = c.location.lon;

  // 1. Center Map with smooth animation
  adminState.map.flyTo([vlat, vlon], 14, { duration: 1.2 });

  // 2. Draw Golden Hour Transit Radius Perimeter
  // Higher risk / shorter elapsed time = tighter, more urgent cash-out radius
  const radiusMeters = c.golden_hour_active ? 1500 : 3000;
  const circleColor = c.golden_hour_active ? '#ef4444' : '#64748b';

  adminState.perimeterCircle = L.circle([vlat, vlon], {
    radius: radiusMeters,
    color: circleColor,
    weight: 1.5,
    dashArray: '4, 8',
    fillColor: circleColor,
    fillOpacity: 0.08
  }).addTo(adminState.map);

  // 3. Victim Incident Node Marker
  const victimIcon = L.divIcon({
    className: 'victim-marker',
    html: `
      <div style="background-color: #0284c7; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px #0284c7;">
        <span style="font-size: 16px;">📍</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  const victimMarker = L.marker([vlat, vlon], { icon: victimIcon })
    .bindPopup(`
      <div style="color: #0f172a; font-family: Outfit, sans-serif; font-size: 12px; min-width: 200px;">
        <b style="color: #0284c7;">Incident Origin: ${c.case_id}</b><br/>
        <b>Victim:</b> ${c.victim_name || 'Anonymous'}<br/>
        <b>Disputed:</b> <span style="color: #dc2626; font-weight: bold;">${c.disputed_amount_str}</span><br/>
        <b>Category:</b> ${c.fraud_category}<br/>
        <b>Location:</b> ${c.victim_city}
      </div>
    `);
  adminState.markersGroup.addLayer(victimMarker);

  // 4. Plot ATM / CSP Cash-Out Clusters
  if (c.atm_clusters && c.atm_clusters.length > 0) {
    
    // Update Map HUD with highest-risk node
    const topAtm = c.atm_clusters[0];
    updateMapHUD(topAtm);

    c.atm_clusters.forEach(atm => {
      let pinColor = '#10b981';
      let pulseClass = '';

      if (atm.risk_tier === 'HIGH') {
        pinColor = '#ef4444';
        pulseClass = 'pin-pulse-high';
      } else if (atm.risk_tier === 'MEDIUM') {
        pinColor = '#f59e0b';
        pulseClass = 'pin-pulse-medium';
      }

      const atmIcon = L.divIcon({
        className: 'custom-atm-pin-wrapper',
        html: `
          <div class="custom-atm-pin ${pulseClass}" style="background-color: ${pinColor}; width: 32px; height: 32px; border: 2px solid white;">
            🏧
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const atmMarker = L.marker([atm.lat, atm.lon], { icon: atmIcon })
        .bindPopup(`
          <div style="color: #0f172a; font-family: Outfit, sans-serif; font-size: 12px; min-width: 220px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <b style="font-size: 13px;">${atm.name}</b>
              <span style="background: ${pinColor}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
                ${atm.risk_score}% RISK
              </span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              <b>Distance:</b> ${atm.distance_km} km &bull; <b>Window:</b> ${atm.time_window}
            </div>
            <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; font-size: 11px; border-left: 3px solid ${pinColor};">
              <b>Tactical Action:</b> ${atm.recommended_action}
            </div>
          </div>
        `);

      atmMarker.on('click', () => {
        updateMapHUD(atm);
      });

      adminState.markersGroup.addLayer(atmMarker);
    });

  } else {
    document.getElementById('map-hud-detail').classList.add('hidden');
  }
}

function updateMapHUD(atm) {
  const hud = document.getElementById('map-hud-detail');
  if (!hud) return;

  hud.classList.remove('hidden');
  document.getElementById('hud-title').textContent = atm.name;
  document.getElementById('hud-score').textContent = `Risk: ${atm.risk_score}%`;
  document.getElementById('hud-recommendation').textContent = atm.recommended_action;
  document.getElementById('hud-distance').textContent = `Distance: ${atm.distance_km} km`;
  document.getElementById('hud-window').textContent = `Window: ${atm.time_window}`;

  const iconEl = document.getElementById('hud-risk-icon');
  if (atm.risk_tier === 'HIGH') {
    iconEl.textContent = '🔴';
    document.getElementById('hud-score').className = "font-mono text-xs font-bold text-red-400";
  } else if (atm.risk_tier === 'MEDIUM') {
    iconEl.textContent = '🟠';
    document.getElementById('hud-score').className = "font-mono text-xs font-bold text-amber-400";
  } else {
    iconEl.textContent = '🟢';
    document.getElementById('hud-score').className = "font-mono text-xs font-bold text-emerald-400";
  }
}

// ---------------------------------------------------------------------------
// SECTION 91 CrPC STATUTORY BANK FREEZE ACTION
// ---------------------------------------------------------------------------
async function triggerSec91Freeze() {
  if (!adminState.selectedCaseId) return;

  const btn = document.getElementById('btn-sec91-freeze');
  btn.disabled = true;
  btn.textContent = "Transmitting Section 91 Directive...";

  try {
    const response = await fetch(`/api/cases/${adminState.selectedCaseId}/freeze`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error("Freeze dispatch failed");

    const data = await response.json();
    alert(`🚨 STATUTORY DIRECTIVE CONFIRMED:\nSection 91 CrPC Debit Freeze Notice dispatched for Case ${adminState.selectedCaseId}.\nNodal alert transmitted to NPCI, UPI Gateway, and Beneficiary Banks.`);

    // Refresh case data
    await loadCasesData(true);
    selectIncident(adminState.selectedCaseId);

  } catch (err) {
    alert(`Freeze directive failed: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// MULE NETWORK CORRELATION ENGINE MODAL
// ---------------------------------------------------------------------------
async function loadCorrelationsData() {
  try {
    const res = await fetch('/api/correlations');
    if (res.ok) {
      adminState.correlations = await res.json();
      renderCorrelationsUI();
    }
  } catch (e) {
    console.error("Correlations fetch failed:", e);
  }
}

function renderCorrelationsUI() {
  if (!adminState.correlations) return;

  const phoneContainer = document.getElementById('correlations-phone-list');
  const upiContainer = document.getElementById('correlations-upi-list');
  if (!phoneContainer || !upiContainer) return;

  // Render Linked Phones
  phoneContainer.innerHTML = '';
  if (adminState.correlations.linked_phones.length === 0) {
    phoneContainer.innerHTML = `<p class="text-gray-500 text-xs italic">No repeated phone numbers detected yet.</p>`;
  } else {
    adminState.correlations.linked_phones.forEach(item => {
      const card = document.createElement('div');
      card.className = "bg-gray-950 p-3 rounded-lg border border-cyan-900/40 flex items-center justify-between";
      
      const caseLinks = item.linked_cases.map(cid => 
        `<button onclick="jumpToCase('${cid}')" class="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-300 font-mono text-[10px] hover:bg-gray-700 underline">${cid}</button>`
      ).join(' ');

      card.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-amber-400 text-xs">${item.entity}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 font-bold">${item.count} Cases Linked</span>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Linked Incidents:</span>
            ${caseLinks}
          </div>
        </div>
        <span class="text-[10px] px-2 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-semibold">MULE SYNDICATE</span>
      `;
      phoneContainer.appendChild(card);
    });
  }

  // Render Linked UPI Handles
  upiContainer.innerHTML = '';
  if (adminState.correlations.linked_upis.length === 0) {
    upiContainer.innerHTML = `<p class="text-gray-500 text-xs italic">No shared UPI handles detected yet.</p>`;
  } else {
    adminState.correlations.linked_upis.forEach(item => {
      const card = document.createElement('div');
      card.className = "bg-gray-950 p-3 rounded-lg border border-emerald-900/40 flex items-center justify-between";
      
      const caseLinks = item.linked_cases.map(cid => 
        `<button onclick="jumpToCase('${cid}')" class="px-1.5 py-0.5 rounded bg-gray-800 text-emerald-300 font-mono text-[10px] hover:bg-gray-700 underline">${cid}</button>`
      ).join(' ');

      card.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-emerald-400 text-xs">${item.entity}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 font-bold">${item.count} Cases Linked</span>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>Linked Incidents:</span>
            ${caseLinks}
          </div>
        </div>
        <span class="text-[10px] px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-semibold">SHARED MULE ACCOUNT</span>
      `;
      upiContainer.appendChild(card);
    });
  }
}

function toggleCorrelationModal() {
  const modal = document.getElementById('correlation-modal');
  if (modal) {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      loadCorrelationsData();
    }
  }
}

function jumpToCase(caseId) {
  toggleCorrelationModal();
  selectIncident(caseId);
}
