/**
 * ZenPACS Integration for Web Viewer
 *
 * Injected via HTML template. Extracts auth token and API base URL from
 * the viewer launch URL (same pattern as ZenViewer/Weasis desktop):
 *
 * URL: /viewer/dicomjson?url=<apiBaseUrl>/v2/patients/webviewer-json?caseIDs=1,2,3&token=<jwt>
 *
 * Provides:
 * - API client functions (status updates, voice upload, anamnesis, reports)
 * - Toolbar buttons (Okundu, Okunmadi, Imaj Eksik, OK+Kapat)
 * - Keyboard shortcuts (Ctrl+O, Ctrl+K)
 * - Patient case info panel
 * - Voice recorder
 */

(function () {
  'use strict';

  // ============================================================
  // 1. Extract auth from URL (matches DownloadManager.java logic)
  // ============================================================

  let _token = '';
  let _apiBaseUrl = '';
  let _patientCaseIds = [];

  function initAuth() {
    const params = new URLSearchParams(window.location.search);
    const manifestUrl = params.get('url') || '';
    if (!manifestUrl) return;

    try {
      const decoded = decodeURIComponent(manifestUrl);

      // Extract token
      const tokenMatch = decoded.match(/[?&]token=([^&]+)/);
      if (tokenMatch) _token = tokenMatch[1];

      // Extract API base URL (everything before /v2/)
      const v2Index = decoded.indexOf('/v2/');
      if (v2Index > 0) _apiBaseUrl = decoded.substring(0, v2Index);

      // Extract caseIDs
      const caseMatch = decoded.match(/[?&]caseIDs=([^&]+)/);
      if (caseMatch) {
        _patientCaseIds = caseMatch[1].split(',').map(Number).filter(function (n) { return !isNaN(n); });
      }

      console.log('[ZenPACS] Auth initialized:', {
        apiBaseUrl: _apiBaseUrl,
        tokenLength: _token.length,
        patientCaseIds: _patientCaseIds,
      });
    } catch (e) {
      console.error('[ZenPACS] Failed to parse auth from URL:', e);
    }
  }

  // ============================================================
  // 2. API Client
  // ============================================================

  function apiRequest(method, path, body) {
    var url = _apiBaseUrl + path;
    var headers = {
      'Authorization': 'Bearer ' + _token,
      'Accept': 'application/json',
    };
    var init = { method: method, headers: headers };

    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
      init.body = body;
    }

    return fetch(url, init).then(function (res) {
      if (!res.ok) throw new Error('API error: ' + res.status + ' on ' + method + ' ' + path);
      return res;
    });
  }

  // Status updates
  function markAsDictated(caseId) {
    return apiRequest('PUT', '/v2/patient-cases/update-status', {
      patient_case_ids: [caseId],
      status: 'dictated',
    });
  }

  function markAsPending(caseId) {
    return apiRequest('PUT', '/v2/patient-cases/update-status', {
      patient_case_ids: [caseId],
      status: 'pending',
    });
  }

  function flagMissingImage(caseId) {
    return apiRequest('PUT', '/v2/patient-cases/update-scope', {
      patient_case_ids: [caseId],
      patient_scope: 'missing_image',
    });
  }

  // Patient case info
  function getPatientCaseInfo(caseId) {
    return apiRequest('GET', '/v2/patient-cases/' + caseId).then(function (r) { return r.json(); });
  }

  function getPatientReports(caseId) {
    return apiRequest('GET', '/v2/reports/by-patient/' + caseId).then(function (r) { return r.json(); });
  }

  // Voice recordings
  function uploadVoice(caseId, blob, filename) {
    var formData = new FormData();
    formData.append('patient_case_id', String(caseId));
    formData.append('voices', blob, filename);
    return apiRequest('PUT', '/v2/patient-cases/upload-voice', formData);
  }

  function getVoiceFiles(caseId) {
    return apiRequest('GET', '/v2/patient-cases/' + caseId + '/voices').then(function (r) { return r.json(); });
  }

  function deleteVoiceFile(caseId, voiceKey) {
    return apiRequest('POST', '/v2/patient-cases/delete-voice', {
      patient_case_id: caseId,
      voice_key: voiceKey,
    });
  }

  // ============================================================
  // 3. UI: Toolbar Buttons
  // ============================================================

  function showFeedback(btn, color, duration) {
    var original = btn.style.backgroundColor;
    btn.style.backgroundColor = color;
    setTimeout(function () { btn.style.backgroundColor = original; }, duration || 800);
  }

  function createToolbarButton(label, color, onClick) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'padding:4px 10px;margin:0 2px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;color:#fff;background:' + color + ';transition:background 0.2s;';
    btn.addEventListener('mouseenter', function () { btn.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', function () { btn.style.opacity = '1'; });
    btn.addEventListener('click', function () {
      btn.disabled = true;
      var caseId = _patientCaseIds[0];
      if (!caseId) { btn.disabled = false; return; }
      onClick(caseId, btn).finally(function () { btn.disabled = false; });
    });
    return btn;
  }

  function injectToolbar() {
    if (!_token || _patientCaseIds.length === 0) return;

    // Wait for OHIF header to render
    var attempts = 0;
    var interval = setInterval(function () {
      // OHIF v3 header: div.bg-popover.relative > div.relative.h-[48px]
      var header = document.querySelector('.bg-popover.relative .relative.items-center');
      if (!header && attempts < 60) { attempts++; return; }
      clearInterval(interval);
      if (!header) { console.warn('[ZenPACS] Header not found after 30s'); return; }

      // Create ZenPACS toolbar container
      var container = document.createElement('div');
      container.id = 'zenpacs-toolbar';
      container.style.cssText = 'display:flex;align-items:center;gap:4px;margin-left:auto;margin-right:8px;';

      // Okundu button (green)
      container.appendChild(createToolbarButton('Okundu', '#16a34a', function (caseId, btn) {
        return markAsDictated(caseId).then(function () {
          showFeedback(btn, '#22c55e');
          console.log('[ZenPACS] Marked as dictated:', caseId);
        }).catch(function (e) {
          showFeedback(btn, '#ef4444');
          console.error('[ZenPACS] Failed:', e);
        });
      }));

      // Okunmadi button (amber)
      container.appendChild(createToolbarButton('Okunmadi', '#d97706', function (caseId, btn) {
        return markAsPending(caseId).then(function () {
          showFeedback(btn, '#fbbf24');
          console.log('[ZenPACS] Marked as pending:', caseId);
        }).catch(function (e) {
          showFeedback(btn, '#ef4444');
          console.error('[ZenPACS] Failed:', e);
        });
      }));

      // Imaj Eksik button (rose)
      container.appendChild(createToolbarButton('Imaj Eksik', '#e11d48', function (caseId, btn) {
        return flagMissingImage(caseId).then(function () {
          showFeedback(btn, '#fb7185');
          console.log('[ZenPACS] Flagged missing image:', caseId);
        }).catch(function (e) {
          showFeedback(btn, '#ef4444');
          console.error('[ZenPACS] Failed:', e);
        });
      }));

      // OK + Kapat button (green, bold)
      var okBtn = createToolbarButton('OK + Kapat', '#059669', function (caseId, btn) {
        return markAsDictated(caseId).then(function () {
          showFeedback(btn, '#22c55e');
          console.log('[ZenPACS] OK + Close:', caseId);
          setTimeout(function () { window.close(); }, 500);
        }).catch(function (e) {
          showFeedback(btn, '#ef4444');
          console.error('[ZenPACS] Failed:', e);
        });
      });
      okBtn.style.fontWeight = '700';
      container.appendChild(okBtn);

      // Separator
      var sep = document.createElement('div');
      sep.style.cssText = 'width:1px;height:20px;background:#555;margin:0 4px;';
      container.appendChild(sep);

      // Anamnez button (blue)
      var anamnezBtn = document.createElement('button');
      anamnezBtn.textContent = 'Anamnez';
      anamnezBtn.style.cssText = 'padding:4px 10px;margin:0 2px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;color:#fff;background:#2563eb;';
      anamnezBtn.addEventListener('click', function () { toggleAnamnezPanel(); });
      container.appendChild(anamnezBtn);

      // Insert into header bar
      header.style.display = 'flex';
      header.appendChild(container);

      console.log('[ZenPACS] Toolbar injected');
    }, 500);
  }

  // ============================================================
  // 4. UI: Anamnez Panel (right sidebar overlay)
  // ============================================================

  var anamnezPanelVisible = false;
  var anamnezPanel = null;

  function toggleAnamnezPanel() {
    if (anamnezPanel && anamnezPanelVisible) {
      anamnezPanel.style.display = 'none';
      anamnezPanelVisible = false;
      return;
    }

    if (!anamnezPanel) {
      anamnezPanel = document.createElement('div');
      anamnezPanel.id = 'zenpacs-anamnez-panel';
      anamnezPanel.style.cssText = 'position:fixed;top:40px;right:0;width:350px;bottom:0;background:#1e1e2e;color:#ddd;overflow-y:auto;z-index:9999;border-left:1px solid #333;font-size:13px;padding:0;box-shadow:-4px 0 12px rgba(0,0,0,0.5);';
      document.body.appendChild(anamnezPanel);
    }

    anamnezPanel.innerHTML = '<div style="padding:16px;text-align:center;color:#888;">Yükleniyor...</div>';
    anamnezPanel.style.display = 'block';
    anamnezPanelVisible = true;

    var caseId = _patientCaseIds[0];
    if (!caseId) {
      anamnezPanel.innerHTML = '<div style="padding:16px;color:#f87171;">Hasta bilgisi bulunamadı</div>';
      return;
    }

    Promise.all([
      getPatientCaseInfo(caseId).catch(function () { return null; }),
      getPatientReports(caseId).catch(function () { return { reports: [] }; }),
    ]).then(function (results) {
      var info = results[0];
      var reportsData = results[1];
      renderAnamnezPanel(info, reportsData ? reportsData.reports || [] : []);
    });
  }

  function renderAnamnezPanel(info, reports) {
    if (!anamnezPanel) return;

    var html = '';

    // Close button
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#2563eb33;border-bottom:1px solid #333;">';
    html += '<span style="font-weight:700;color:#60a5fa;">Anamnez</span>';
    html += '<button onclick="document.getElementById(\'zenpacs-anamnez-panel\').style.display=\'none\'" style="background:none;border:none;color:#999;cursor:pointer;font-size:18px;">✕</button>';
    html += '</div>';

    if (!info) {
      html += '<div style="padding:16px;color:#f87171;">Hasta bilgisi yüklenemedi</div>';
      anamnezPanel.innerHTML = html;
      return;
    }

    // Patient header
    html += '<div style="padding:12px 16px;background:#1e3a5f;border-bottom:1px solid #333;">';
    html += '<div style="font-weight:700;color:#fff;font-size:14px;">' + (info.patient_name || '') + '</div>';
    html += '<div style="color:#93c5fd;font-size:11px;margin-top:4px;">TC: ' + (info.patient_id || '') + ' | ' + (info.modality || '') + '</div>';
    if (info.study_description) html += '<div style="color:#93c5fd;font-size:11px;">' + info.study_description + '</div>';
    html += '</div>';

    // Orders
    if (info.orders && info.orders.length > 0) {
      html += '<div style="padding:12px 16px;border-bottom:1px solid #333;">';
      html += '<div style="font-weight:600;color:#fbbf24;margin-bottom:8px;">İstemler</div>';
      info.orders.forEach(function (order) {
        html += '<div style="margin-bottom:8px;padding:8px;background:#ffffff0a;border-radius:4px;">';
        html += '<div style="color:#fff;font-weight:500;">' + (order.service_name || '') + '</div>';
        if (order.service_code) html += '<div style="color:#888;font-size:11px;">' + order.service_code + '</div>';
        if (order.modality) html += '<span style="color:#60a5fa;font-size:11px;margin-right:6px;">' + order.modality + '</span>';
        if (order.status) html += '<span style="color:#888;font-size:11px;">' + order.status + '</span>';
        html += '</div>';
      });
      html += '</div>';

      // Anamnesis (deduplicated)
      var seen = {};
      var anamnesisList = [];
      info.orders.forEach(function (order) {
        if (!order.anamnesis && !order.prediagnosis) return;
        var key = (order.anamnesis || '') + '|' + (order.prediagnosis || '');
        if (seen[key]) return;
        seen[key] = true;
        try {
          var parsed = JSON.parse(order.anamnesis || '{}');
          anamnesisList.push({
            complaints: parsed.complaints || '',
            symptoms: parsed.symptoms || '',
            history: parsed.history || '',
            prediagnosis: order.prediagnosis || parsed.prediagnosis || '',
            cure: parsed.cure || '',
          });
        } catch (e) {
          if (order.anamnesis) anamnesisList.push({ complaints: order.anamnesis, symptoms: '', history: '', prediagnosis: order.prediagnosis || '', cure: '' });
        }
      });

      if (anamnesisList.length > 0) {
        html += '<div style="padding:12px 16px;border-bottom:1px solid #333;">';
        html += '<div style="font-weight:600;color:#fb923c;margin-bottom:8px;">Anamnez</div>';
        anamnesisList.forEach(function (a) {
          html += '<div style="margin-bottom:8px;padding:8px;background:#ffffff0a;border-radius:4px;">';
          if (a.complaints) html += '<div style="margin-bottom:4px;"><span style="color:#888;font-size:11px;">Şikayet: </span><span style="color:#e5e7eb;">' + a.complaints + '</span></div>';
          if (a.history) html += '<div style="margin-bottom:4px;"><span style="color:#888;font-size:11px;">Öykü: </span><span style="color:#e5e7eb;">' + a.history + '</span></div>';
          if (a.symptoms) html += '<div style="margin-bottom:4px;"><span style="color:#888;font-size:11px;">Semptom: </span><span style="color:#e5e7eb;">' + a.symptoms + '</span></div>';
          if (a.prediagnosis) html += '<div style="margin-bottom:4px;"><span style="color:#888;font-size:11px;">Ön Tanı: </span><span style="color:#e5e7eb;">' + a.prediagnosis + '</span></div>';
          if (a.cure) html += '<div style="margin-bottom:4px;"><span style="color:#888;font-size:11px;">Tedavi: </span><span style="color:#e5e7eb;">' + a.cure + '</span></div>';
          html += '</div>';
        });
        html += '</div>';
      }
    }

    // Notes
    if (info.notes || (info.user_notes && info.user_notes.length > 0)) {
      html += '<div style="padding:12px 16px;border-bottom:1px solid #333;">';
      html += '<div style="font-weight:600;color:#4ade80;margin-bottom:8px;">Notlar</div>';
      if (info.notes) html += '<div style="color:#e5e7eb;margin-bottom:8px;">' + info.notes + '</div>';
      if (info.user_notes) {
        info.user_notes.forEach(function (note) {
          html += '<div style="margin-bottom:4px;"><span style="color:#60a5fa;font-size:11px;">' + (note.username || '') + '</span> ';
          html += '<span style="color:#666;font-size:11px;">' + (note.created_at || '') + '</span>';
          html += '<div style="color:#e5e7eb;">' + (note.note || '') + '</div></div>';
        });
      }
      html += '</div>';
    }

    // Reports
    if (reports.length > 0) {
      html += '<div style="padding:12px 16px;">';
      html += '<div style="font-weight:600;color:#a78bfa;margin-bottom:8px;">Raporlar</div>';
      reports.forEach(function (report, idx) {
        html += '<div style="margin-bottom:8px;padding:8px;background:#ffffff0a;border-radius:4px;cursor:pointer;" onclick="document.getElementById(\'zenpacs-report-' + idx + '\').style.display=document.getElementById(\'zenpacs-report-' + idx + '\').style.display===\'none\'?\'block\':\'none\'">';
        html += '<div style="color:#818cf8;font-size:12px;">' + (report.service_name || 'Rapor') + '</div>';
        html += '<div style="color:#666;font-size:11px;">' + (report.study_at || '') + '</div>';
        html += '<div id="zenpacs-report-' + idx + '" style="display:none;margin-top:8px;color:#e5e7eb;white-space:pre-wrap;font-size:12px;border-top:1px solid #333;padding-top:8px;">' + (report.findings || 'Rapor bulgusu yok') + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    anamnezPanel.innerHTML = html;
  }

  // ============================================================
  // 5. Keyboard Shortcuts (matches ZenShortcuts.java)
  // ============================================================

  function initShortcuts() {
    if (!_token || _patientCaseIds.length === 0) return;

    document.addEventListener('keydown', function (e) {
      // Skip if typing in input
      var tag = (e.target || {}).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      if (!e.ctrlKey && !e.metaKey) return;

      var caseId = _patientCaseIds[0];
      if (!caseId) return;

      var key = e.key.toLowerCase();

      // Ctrl+O — Okundu
      if (key === 'o') {
        e.preventDefault();
        markAsDictated(caseId).then(function () {
          console.log('[ZenPACS] Ctrl+O: Marked as dictated:', caseId);
        });
      }

      // Ctrl+K — OK + Kapat
      if (key === 'k') {
        e.preventDefault();
        markAsDictated(caseId).then(function () {
          console.log('[ZenPACS] Ctrl+K: OK + Close:', caseId);
          setTimeout(function () { window.close(); }, 500);
        });
      }
    });
  }

  // ============================================================
  // 6. Expose global API for debugging and voice recorder
  // ============================================================

  window.ZenPACS = {
    getToken: function () { return _token; },
    getApiBaseUrl: function () { return _apiBaseUrl; },
    getPatientCaseIds: function () { return _patientCaseIds; },
    markAsDictated: markAsDictated,
    markAsPending: markAsPending,
    flagMissingImage: flagMissingImage,
    getPatientCaseInfo: getPatientCaseInfo,
    getPatientReports: getPatientReports,
    uploadVoice: uploadVoice,
    getVoiceFiles: getVoiceFiles,
    deleteVoiceFile: deleteVoiceFile,
    toggleAnamnezPanel: toggleAnamnezPanel,
  };

  // ============================================================
  // 7. Initialize
  // ============================================================

  initAuth();
  if (_token && _patientCaseIds.length > 0) {
    injectToolbar();
    initShortcuts();
    console.log('[ZenPACS] Integration active for cases:', _patientCaseIds);
  } else {
    console.log('[ZenPACS] No auth token or case IDs — integration inactive (demo mode)');
  }

})();
