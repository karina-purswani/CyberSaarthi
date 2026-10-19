/**
 * CyberSaarthi - Cyber Cell Dashboard Logic (admin.js)
 * Interactive Leaflet.js Incident Mapping,
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
const freezeButton = document.getElementById('btn-sec91-freeze');

if (targetCase.demo_freeze_requested || targetCase.bank_frozen) {
  statusEl.textContent = "Status: Demo Request Recorded";
  statusEl.className =
    "text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono";

  freezeButton.classList.add('opacity-50', 'pointer-events-none');
  freezeButton.innerHTML = "<span>✓</span><span>Demo Request Recorded</span>";
} else {
  statusEl.textContent = "Status: Active Investigation";
  statusEl.className =
    "text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono";

  freezeButton.classList.remove('opacity-50', 'pointer-events-none');
  freezeButton.innerHTML = "<span>!</span><span>Record Demo Freeze Request</span>";
}

  // Update FIR Download Button in Drawer
  const firBtn = document.getElementById('btn-export-fir');
  firBtn.href = `/api/generate-fir/${targetCase.case_id}`;
  firBtn.setAttribute('download', `CyberSaarthi_FIR_${targetCase.case_id}.pdf`);

  // Plot on Leaflet Map
  plotCaseOnMap(targetCase);
}

// ---------------------------------------------------------------------------
// PLOT INCIDENT LOCATION ON LEAFLET MAP
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
  // Context radius for the reported incident; not a cash-out prediction
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

}

// ---------------------------------------------------------------------------
// SECTION 91 CrPC STATUTORY BANK FREEZE ACTION
// ---------------------------------------------------------------------------
async function triggerSec91Freeze() {
  if (!adminState.selectedCaseId) return;

  const btn = document.getElementById('btn-sec91-freeze');
  btn.disabled = true;
  btn.textContent = "Recording Demo Request...";

  try {
    const response = await fetch(`/api/cases/${adminState.selectedCaseId}/freeze`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error("Freeze dispatch failed");

    const data = await response.json();
    alert(
  `Demo action recorded for Case ${adminState.selectedCaseId}.\n\n` +
  "No bank account was frozen.\n" +
  "No notification was sent to NPCI, banks, UPI gateways, or law enforcement."
);

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

/* =========================================================
   PHASE 3: EVIDENCE INTELLIGENCE WORKSPACE
   Safe DOM rendering helpers + CEVE results
   ========================================================= */

function eiSetText(elementId, value, fallback = '—') {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (value === null || value === undefined || value === '') {
    element.textContent = fallback;
  } else {
    element.textContent = String(value);
  }
}

function eiFormatValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function eiRenderFindingList(elementId, findings, emptyMessage) {
  const container = document.getElementById(elementId);
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(findings) || findings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-gray-500 italic';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  findings.forEach((finding) => {
    const card = document.createElement('div');
    card.className = 'rounded-lg border border-gray-800 bg-gray-950/70 p-3 space-y-1';

    if (typeof finding !== 'object' || finding === null) {
      card.textContent = String(finding);
      container.appendChild(card);
      return;
    }

    const heading = document.createElement('p');
    heading.className = 'font-semibold text-gray-100';
    heading.textContent = eiFormatValue(
      finding.field || finding.type || finding.category || finding.status || 'Finding'
    );
    card.appendChild(heading);

    const details = [
      ['Value', finding.value ?? finding.value_str],
      ['Details', finding.details],
      ['Severity', finding.severity],
      ['Sources', finding.sources ?? finding.sources_involved],
      ['Observed in', finding.observed_in],
      ['Not observed in', finding.unobserved_in],
      ['Source', finding.source],
      ['Confidence', finding.confidence_score ?? finding.confidence],
      ['Reason', finding.reason]
    ];

    details.forEach(([label, value]) => {
      if (value === undefined || value === null || value === '') return;

      const line = document.createElement('p');
      line.className = 'text-gray-400 whitespace-pre-wrap break-words';
      line.textContent = `${label}: ${eiFormatValue(value)}`;
      card.appendChild(line);
    });

    container.appendChild(card);
  });
}

function toggleEvidenceWorkspace() {
  const workspace = document.getElementById('evidence-workspace');
  if (!workspace) {
    console.error('Evidence Intelligence workspace was not found in admin.html.');
    return;
  }

  workspace.classList.toggle('hidden');

  if (!workspace.classList.contains('hidden')) {
    loadEvidenceWorkspace();
  }
}

async function loadEvidenceWorkspace() {
  const errorElement = document.getElementById('ei-error');
  if (errorElement) errorElement.textContent = '';

  const caseId = adminState.selectedCaseId;

  if (!caseId) {
    eiSetText('ei-selected-case', 'No case selected. Select a case from the incident queue first.');
    eiSetText('ceve-score', '—');
    eiSetText('ceve-tier', 'Awaiting case');
    eiSetText('ceve-sources', '—');
    eiSetText('ceve-status', 'Awaiting case');
    eiSetText('ceve-rationale', '', '');
    eiSetText('eig-metrics', 'Select a case to load its graph.');

    [
      'ceve-corroborations',
      'ceve-discrepancies',
      'ceve-ambiguous',
      'ceve-missing',
      'ceve-uncertain'
    ].forEach((id) => eiRenderFindingList(id, [], 'Select a case to load findings.'));

    return;
  }

  eiSetText('ei-selected-case', `Selected case: ${caseId}`);

  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}`);

    if (!response.ok) {
      throw new Error(`Case request failed (${response.status}).`);
    }

    const result = await response.json();
    const caseData = result.case;

    if (!caseData) {
      throw new Error('The API response did not contain case details.');
    }

    eiRenderCEVEResults(caseData.verification_report || {});

    // The graph function will be added in the next step.
    if (typeof loadCaseEvidenceGraph === 'function') {
      await loadCaseEvidenceGraph();
    }
  } catch (error) {
    console.error('Unable to load Evidence Intelligence:', error);

    if (errorElement) {
      errorElement.textContent =
        `Could not load evidence for case ${caseId}: ${error.message}`;
    }
  }
}

function eiRenderCEVEResults(report) {
  const assessment = report.confidence_assessment || {};
  const sourcesSummary = report.sources_summary || {};

  eiSetText('ceve-score', assessment.score);
  eiSetText('ceve-tier', assessment.tier, 'Not available');
  eiSetText('ceve-status', report.status, 'Not available');
  eiSetText('ceve-rationale', assessment.rationale, 'No verification rationale available.');

  const availableSources = Array.isArray(report.available_sources)
    ? report.available_sources
    : Object.keys(sourcesSummary).filter(
        (source) => sourcesSummary[source]?.has_content
      );

  eiSetText(
    'ceve-sources',
    availableSources.length ? availableSources.join(', ') : '',
    'No source data'
  );

  eiRenderFindingList(
    'ceve-corroborations',
    report.corroborations,
    'No corroborations reported.'
  );

  eiRenderFindingList(
    'ceve-discrepancies',
    report.discrepancies,
    'No discrepancies reported.'
  );

  eiRenderFindingList(
    'ceve-ambiguous',
    report.ambiguous_findings,
    'No ambiguous findings reported.'
  );

  eiRenderFindingList(
    'ceve-missing',
    report.missing_information,
    'No missing-information findings reported.'
  );

  eiRenderFindingList(
    'ceve-uncertain',
    report.uncertain_extractions,
    'No uncertain extractions reported.'
  );

  eiSetText(
    'ceve-disclaimer',
    assessment.disclaimer ||
      'This index measures cross-evidence corroboration. It is not a probability of fraud, proof of authenticity, or a finding of legal guilt.'
  );
}

/* =========================================================
   PHASE 3: EIG GRAPH RENDERING
   Dependency-free SVG graph with safe text rendering
   ========================================================= */

const EI_SVG_NS = 'http://www.w3.org/2000/svg';

async function loadCaseEvidenceGraph() {
  const caseId = adminState.selectedCaseId;

  if (!caseId) {
    eiSetText('eig-metrics', 'Select a case first.');
    return;
  }

  await eiFetchAndRenderGraph(
    `/api/cases/${encodeURIComponent(caseId)}/graph`
  );
}

async function loadGlobalEvidenceGraph() {
  await eiFetchAndRenderGraph('/api/intelligence-graph');
}

async function eiFetchAndRenderGraph(url) {
  const errorElement = document.getElementById('ei-error');
  if (errorElement) errorElement.textContent = '';

  eiSetText('eig-metrics', 'Loading graph...');

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Graph request failed (${response.status}).`);
    }

    const result = await response.json();

    if (result.status && result.status !== 'success') {
      throw new Error('The graph API did not report success.');
    }

    if (!result.graph || !Array.isArray(result.graph.nodes) ||
        !Array.isArray(result.graph.edges)) {
      throw new Error('The API returned an unexpected graph structure.');
    }

    eiRenderEvidenceGraph(result.graph);
  } catch (error) {
    console.error('Unable to load evidence graph:', error);

    eiSetText('eig-metrics', 'Graph unavailable.');

    if (errorElement) {
      errorElement.textContent = `Could not load graph: ${error.message}`;
    }
  }
}

function eiCreateSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(EI_SVG_NS, tag);

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, String(value));
  });

  return element;
}

function eiShowGraphDetails(title, values) {
  const container = document.getElementById('eig-details');
  if (!container) return;

  container.replaceChildren();

  const heading = document.createElement('p');
  heading.className = 'font-semibold text-cyan-300';
  heading.textContent = title;
  container.appendChild(heading);

  Object.entries(values).forEach(([label, value]) => {
    if (value === undefined || value === null || value === '') return;

    const line = document.createElement('p');
    line.className = 'text-gray-300 whitespace-pre-wrap break-words';
    line.textContent = `${label}: ${eiFormatValue(value)}`;
    container.appendChild(line);
  });
}

function eiInspectNode(node) {
  const provenance = node.provenance || {};

  eiShowGraphDetails(node.label || node.id || 'Graph node', {
    'Entity type': node.entity_type,
    'Role': node.role,
    'Node ID': node.id,
    'Inferred': node.is_inferred,
    'Case ID': provenance.case_id,
    'Source artifact': provenance.source_artifact,
    'Evidence excerpt': provenance.evidence_excerpt,
    'Confidence': provenance.confidence,
    'Timestamp': provenance.timestamp,
    'Properties': node.properties
  });
}

function eiInspectEdge(edge) {
  const provenance = edge.provenance || {};

  eiShowGraphDetails(edge.relationship_type || 'Graph relationship', {
    'Relationship ID': edge.id,
    'From node': edge.source,
    'To node': edge.target,
    'Details': edge.details,
    'Inferred': edge.is_inferred,
    'Confidence': edge.confidence,
    'Source artifact': provenance.source_artifact,
    'Case ID': provenance.case_id,
    'Evidence excerpt': provenance.evidence_excerpt,
    'Cases linked': provenance.cases_linked,
    'Timestamp': provenance.timestamp
  });
}

function eiRenderEvidenceGraph(graph) {
  const svg = document.getElementById('eig-graph');
  if (!svg) return;

  // Clear the previous drawing without interpreting API data as HTML.
  svg.replaceChildren();

  const allNodes = graph.nodes || [];
  const allEdges = graph.edges || [];
  const metrics = graph.metrics || {};

  const maxVisibleNodes = 20;
  const maxVisibleEdges = 35;

  const nodes = allNodes.slice(0, maxVisibleNodes);
  const visibleIds = new Set(nodes.map(node => node.id));

  const edges = allEdges
    .filter(edge => visibleIds.has(edge.source) &&
                    visibleIds.has(edge.target))
    .slice(0, maxVisibleEdges);

  const metricParts = [
    `Nodes: ${metrics.total_nodes ?? allNodes.length}`,
    `Connections: ${metrics.total_edges ?? allEdges.length}`,
    `Direct relationships: ${metrics.direct_fact_edges ?? '—'}`,
    `Inferred relationships: ${metrics.inferred_edges ?? '—'}`
  ];

  if (metrics.shared_entities_count !== undefined) {
    metricParts.push(`Shared entities: ${metrics.shared_entities_count}`);
  }

  if (metrics.syndicate_clusters_count !== undefined) {
    metricParts.push(`Linked clusters: ${metrics.syndicate_clusters_count}`);
  }

  eiSetText('eig-metrics', metricParts.join(' · '));

  eiSetText(
    'eig-disclaimer',
    graph.disclaimer ||
      'Graph links represent reported associations or analytical leads. They do not establish ownership, guilt or criminal conspiracy.'
  );

  if (nodes.length === 0) {
    const message = eiCreateSvgElement('text', {
      x: 450,
      y: 240,
      'text-anchor': 'middle',
      fill: '#9ca3af',
      'font-size': 15
    });

    message.textContent = 'No graph nodes available for this view.';
    svg.appendChild(message);

    eiShowGraphDetails('Graph information', {
      'Total nodes': allNodes.length,
      'Total connections': allEdges.length
    });
    return;
  }

  if (allNodes.length > maxVisibleNodes ||
      allEdges.length > edges.length) {
    const note = eiCreateSvgElement('text', {
      x: 450,
      y: 18,
      'text-anchor': 'middle',
      fill: '#fbbf24',
      'font-size': 11
    });

    note.textContent =
      `Preview: ${nodes.length} of ${allNodes.length} nodes; ${edges.length} of ${allEdges.length} connections.`;
    svg.appendChild(note);
  }

  // Arrange nodes in a five-column grid.
  const positions = new Map();

  nodes.forEach((node, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);

    positions.set(node.id, {
      x: 85 + column * 180,
      y: 65 + row * 115
    });
  });

  // Draw connections before nodes so the lines stay behind the circles.
  edges.forEach(edge => {
    const start = positions.get(edge.source);
    const end = positions.get(edge.target);

    if (!start || !end) return;

    const inferred = Boolean(edge.is_inferred);

    const line = eiCreateSvgElement('line', {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: inferred ? '#fbbf24' : '#22d3ee',
      'stroke-width': 1.8,
      'stroke-opacity': 0.8,
      'stroke-dasharray': inferred ? '6 5' : 'none',
      cursor: 'pointer',
      'pointer-events': 'stroke'
    });

    line.addEventListener('click', () => eiInspectEdge(edge));

    const lineTitle = eiCreateSvgElement('title');
    lineTitle.textContent =
      `${edge.relationship_type || 'Relationship'}: ${edge.source} → ${edge.target}`;
    line.appendChild(lineTitle);

    svg.appendChild(line);
  });

  // Draw and label the entity nodes.
  nodes.forEach(node => {
    const position = positions.get(node.id);
    const inferred = Boolean(node.is_inferred);

    const type = String(node.entity_type || '').toUpperCase();

    let fill = '#164e63';

    if (type.includes('CASE')) fill = '#1e40af';
    else if (type.includes('PHONE')) fill = '#065f46';
    else if (type.includes('UPI')) fill = '#713f12';
    else if (type.includes('URL')) fill = '#6b21a8';
    else if (type.includes('UTR')) fill = '#9f1239';
    else if (type.includes('VICTIM')) fill = '#155e75';

    const group = eiCreateSvgElement('g', {
      cursor: 'pointer',
      tabindex: 0,
      role: 'button',
      'aria-label': `Inspect ${node.label || node.id || 'entity'}`
    });

    const circle = eiCreateSvgElement('circle', {
      cx: position.x,
      cy: position.y,
      r: 23,
      fill,
      stroke: inferred ? '#fbbf24' : '#67e8f9',
      'stroke-width': 2,
      'stroke-dasharray': inferred ? '4 3' : 'none'
    });

    group.appendChild(circle);

    const rawLabel = String(node.label || node.id || 'Entity');
    const shortLabel = rawLabel.length > 16
      ? `${rawLabel.slice(0, 13)}...`
      : rawLabel;

    const label = eiCreateSvgElement('text', {
      x: position.x,
      y: position.y + 37,
      'text-anchor': 'middle',
      fill: '#e5e7eb',
      'font-size': 10
    });

    label.textContent = shortLabel;
    group.appendChild(label);

    const title = eiCreateSvgElement('title');
    title.textContent = `${rawLabel} (${node.entity_type || 'Unknown type'})`;
    group.appendChild(title);

    group.addEventListener('click', () => eiInspectNode(node));

    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        eiInspectNode(node);
      }
    });

    svg.appendChild(group);
  });

  if (allNodes.length > maxVisibleNodes ||
      allEdges.length > edges.length) {
    eiShowGraphDetails('Graph preview', {
      'Visible nodes': nodes.length,
      'Total nodes': allNodes.length,
      'Visible connections': edges.length,
      'Total connections': allEdges.length,
      'Note': 'The preview is limited for readability. The API data remains unchanged.'
    });
  } else {
    eiShowGraphDetails('Graph loaded', {
      'Nodes displayed': nodes.length,
      'Connections displayed': edges.length,
      'Tip': 'Click a node or line to inspect its details and provenance.'
    });
  }
}
