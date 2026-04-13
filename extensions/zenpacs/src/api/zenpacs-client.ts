/**
 * ZenPACS API Client
 *
 * Handles all communication with the ZenPACS backend.
 * Token and baseUrl are extracted from the viewer launch URL.
 *
 * URL format: viewer.zenpacs.com.tr/viewer/dicomjson?url=<apiBaseUrl>/v2/patients/webviewer-json?caseIDs=1,2,3&token=<jwt>
 */

let _token: string = '';
let _apiBaseUrl: string = '';
let _patientCaseIds: number[] = [];

/** Initialize from the viewer URL — call once on mode enter */
export function initFromViewerUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const manifestUrl = params.get('url') || params.get('StudyInstanceUIDs') || '';

  if (!manifestUrl) return;

  // Decode if needed
  const decoded = decodeURIComponent(manifestUrl);

  // Extract token from manifest URL query params
  const urlObj = new URL(decoded.startsWith('http') ? decoded : `https://dummy${decoded}`);
  _token = urlObj.searchParams.get('token') || '';

  // Extract API base URL (everything before /v2/)
  const v2Index = decoded.indexOf('/v2/');
  if (v2Index > 0) {
    _apiBaseUrl = decoded.substring(0, v2Index);
  }

  // Extract caseIDs
  const caseIDsStr = urlObj.searchParams.get('caseIDs') || '';
  if (caseIDsStr) {
    _patientCaseIds = caseIDsStr.split(',').map(Number).filter(n => !isNaN(n));
  }

  console.log('[ZenPACS] Initialized:', {
    apiBaseUrl: _apiBaseUrl,
    tokenLength: _token.length,
    patientCaseIds: _patientCaseIds,
  });
}

export function getToken(): string { return _token; }
export function getApiBaseUrl(): string { return _apiBaseUrl; }
export function getPatientCaseIds(): number[] { return _patientCaseIds; }

// ============================================================
// HTTP helpers
// ============================================================

async function apiRequest(method: string, path: string, body?: any): Promise<Response> {
  const url = `${_apiBaseUrl}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${_token}`,
    'Accept': 'application/json',
  };

  const init: RequestInit = { method, headers };

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    // Let browser set Content-Type with boundary for multipart
    init.body = body;
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`ZenPACS API error: ${response.status} ${response.statusText} on ${method} ${path}`);
  }
  return response;
}

async function apiGet<T = any>(path: string): Promise<T> {
  const response = await apiRequest('GET', path);
  return response.json();
}

async function apiPut<T = any>(path: string, body: any): Promise<T> {
  const response = await apiRequest('PUT', path, body);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const response = await apiRequest('POST', path, body);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// Status Updates (ZenToolBar equivalent)
// ============================================================

/** Mark patient case as dictated (Okundu button) */
export async function markAsDictated(patientCaseId: number): Promise<void> {
  await apiPut('/v2/patient-cases/update-status', {
    patient_case_ids: [patientCaseId],
    status: 'dictated',
  });
}

/** Mark patient case as pending (Okunmadı button) */
export async function markAsPending(patientCaseId: number): Promise<void> {
  await apiPut('/v2/patient-cases/update-status', {
    patient_case_ids: [patientCaseId],
    status: 'pending',
  });
}

/** Flag missing image (İmaj Eksik button) */
export async function flagMissingImage(patientCaseId: number): Promise<void> {
  await apiPut('/v2/patient-cases/update-scope', {
    patient_case_ids: [patientCaseId],
    patient_scope: 'missing_image',
  });
}

// ============================================================
// Patient Case Info (PatientCaseInfoPanel equivalent)
// ============================================================

export interface PatientCaseInfo {
  patient_name: string;
  patient_id: string;
  modality: string;
  study_description: string;
  orders: PatientOrder[];
  notes: string;
  user_notes: UserNote[];
}

export interface PatientOrder {
  service_name: string;
  service_code: string;
  status: string;
  modality: string;
  prediagnosis: string;
  anamnesis: string;
}

export interface UserNote {
  note: string;
  username: string;
  created_at: string;
}

export interface PatientReport {
  service_name: string;
  findings: string;
  study_at: string;
}

/** Fetch patient case details (orders, anamnesis, notes) */
export async function getPatientCaseInfo(caseId: number): Promise<PatientCaseInfo> {
  return apiGet(`/v2/patient-cases/${caseId}`);
}

/** Fetch reports for patient case */
export async function getPatientReports(caseId: number): Promise<{ reports: PatientReport[] }> {
  return apiGet(`/v2/reports/by-patient/${caseId}`);
}

// ============================================================
// Voice Recordings (AudioRecorderPanel equivalent)
// ============================================================

export interface VoiceFile {
  key: string;
  filename: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
  url: string;
}

/** Upload voice recording */
export async function uploadVoice(patientCaseId: number, audioBlob: Blob, filename: string): Promise<void> {
  const formData = new FormData();
  formData.append('patient_case_id', String(patientCaseId));
  formData.append('voices', audioBlob, filename);

  await apiRequest('PUT', '/v2/patient-cases/upload-voice', formData);
}

/** Fetch list of server voice recordings */
export async function getVoiceFiles(patientCaseId: number): Promise<{ voices: VoiceFile[] }> {
  return apiGet(`/v2/patient-cases/${patientCaseId}/voices`);
}

/** Delete a server voice recording */
export async function deleteVoiceFile(patientCaseId: number, voiceKey: string): Promise<void> {
  await apiPost('/v2/patient-cases/delete-voice', {
    patient_case_id: patientCaseId,
    voice_key: voiceKey,
  });
}
