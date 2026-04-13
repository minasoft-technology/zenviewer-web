/**
 * Patient Case Info Panel — "Anamnez" sidebar
 *
 * Matches ZenViewer's PatientCaseInfoPanel.java:
 * - Patient header (name, TC ID, modality, study description)
 * - Orders section (service names, codes, statuses)
 * - Notes section (notes, user notes with author/date)
 * - Anamnesis section (deduplicated: Şikayet, Öykü, Semptom, Ön Tanı, Tedavi)
 * - Reports section (clickable, shows findings in popup)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  getPatientCaseInfo,
  getPatientReports,
  getPatientCaseIds,
  type PatientCaseInfo,
  type PatientReport,
} from '../api/zenpacs-client';
import { deduplicateAnamnesis, type AnamnesisEntry } from '../utils/deduplicateAnamnesis';

function PatientCaseInfoPanel({ servicesManager }: { servicesManager: any }) {
  const [caseInfo, setCaseInfo] = useState<PatientCaseInfo | null>(null);
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [anamnesis, setAnamnesis] = useState<AnamnesisEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<PatientReport | null>(null);

  const caseIds = getPatientCaseIds();
  const currentCaseId = caseIds[0]; // TODO: update when patient selection changes

  const fetchData = useCallback(async () => {
    if (!currentCaseId) return;

    setLoading(true);
    setError(null);

    try {
      const [info, reportsData] = await Promise.all([
        getPatientCaseInfo(currentCaseId),
        getPatientReports(currentCaseId).catch(() => ({ reports: [] })),
      ]);

      setCaseInfo(info);
      setReports(reportsData.reports || []);

      // Deduplicate anamnesis across orders
      if (info.orders) {
        setAnamnesis(deduplicateAnamnesis(info.orders));
      }
    } catch (err: any) {
      setError(err.message || 'Hasta bilgisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [currentCaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-4 text-center text-gray-400">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-400">{error}</div>;
  }

  if (!caseInfo) {
    return <div className="p-4 text-center text-gray-500">Hasta bilgisi bulunamadı</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto text-sm" style={{ backgroundColor: '#282A2E' }}>
      {/* Patient Header */}
      <div className="p-3 bg-blue-900/40 border-b border-gray-700">
        <div className="font-bold text-white text-base">{caseInfo.patient_name}</div>
        <div className="text-gray-300 text-xs mt-1">
          TC: {caseInfo.patient_id} | {caseInfo.modality} | {caseInfo.study_description}
        </div>
      </div>

      {/* Orders */}
      {caseInfo.orders && caseInfo.orders.length > 0 && (
        <div className="p-3 border-b border-gray-700">
          <div className="font-semibold text-yellow-400 mb-2">İstemler</div>
          {caseInfo.orders.map((order, i) => (
            <div key={i} className="mb-2 p-2 bg-gray-800/50 rounded">
              <div className="text-white font-medium">{order.service_name}</div>
              {order.service_code && (
                <div className="text-gray-400 text-xs">{order.service_code}</div>
              )}
              {order.modality && (
                <span className="text-xs text-blue-400 mr-2">{order.modality}</span>
              )}
              {order.status && (
                <span className="text-xs text-gray-400">{order.status}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {(caseInfo.notes || (caseInfo.user_notes && caseInfo.user_notes.length > 0)) && (
        <div className="p-3 border-b border-gray-700">
          <div className="font-semibold text-green-400 mb-2">Notlar</div>
          {caseInfo.notes && (
            <div className="text-gray-300 mb-2">{caseInfo.notes}</div>
          )}
          {caseInfo.user_notes?.map((note, i) => (
            <div key={i} className="mb-1 text-gray-300">
              <span className="text-blue-400 text-xs">{note.username}</span>
              <span className="text-gray-500 text-xs ml-1">{note.created_at}</span>
              <div>{note.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* Anamnesis (deduplicated) */}
      {anamnesis.length > 0 && (
        <div className="p-3 border-b border-gray-700">
          <div className="font-semibold text-orange-400 mb-2">Anamnez</div>
          {anamnesis.map((entry, i) => (
            <div key={i} className="mb-3 p-2 bg-gray-800/50 rounded">
              {entry.complaints && (
                <div className="mb-1">
                  <span className="text-gray-400 text-xs">Şikayet: </span>
                  <span className="text-gray-200">{entry.complaints}</span>
                </div>
              )}
              {entry.history && (
                <div className="mb-1">
                  <span className="text-gray-400 text-xs">Öykü: </span>
                  <span className="text-gray-200">{entry.history}</span>
                </div>
              )}
              {entry.symptoms && (
                <div className="mb-1">
                  <span className="text-gray-400 text-xs">Semptom: </span>
                  <span className="text-gray-200">{entry.symptoms}</span>
                </div>
              )}
              {entry.prediagnosis && (
                <div className="mb-1">
                  <span className="text-gray-400 text-xs">Ön Tanı: </span>
                  <span className="text-gray-200">{entry.prediagnosis}</span>
                </div>
              )}
              {entry.cure && (
                <div className="mb-1">
                  <span className="text-gray-400 text-xs">Tedavi: </span>
                  <span className="text-gray-200">{entry.cure}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <div className="p-3">
          <div className="font-semibold text-purple-400 mb-2">Raporlar</div>
          {reports.map((report, i) => (
            <div
              key={i}
              className="mb-1 p-2 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-700/50"
              onClick={() => setSelectedReport(report)}
            >
              <div className="text-blue-400 text-xs underline">{report.service_name}</div>
              <div className="text-gray-500 text-xs">{report.study_at}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">{selectedReport.service_name}</h3>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setSelectedReport(null)}
              >✕</button>
            </div>
            <div className="text-gray-500 text-xs mb-3">{selectedReport.study_at}</div>
            <div
              className="text-gray-200 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: selectedReport.findings || 'Rapor bulgusu yok' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientCaseInfoPanel;
