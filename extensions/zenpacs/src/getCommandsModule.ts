/**
 * ZenPACS Commands Module
 *
 * Registers all actions matching ZenViewer's ZenToolBar.java + ZenShortcuts.java:
 * - markDictated (Okundu) — Ctrl+O
 * - markPending (Okunmadı)
 * - flagMissingImage (İmaj Eksik)
 * - okAndClose (OK + Kapat) — Ctrl+K
 * - toggleRecorder (Kayıtlar)
 * - startRecording — Ctrl+R
 * - pauseResumeRecording — Ctrl+T
 * - uploadRecording — Ctrl+Y
 */

import {
  markAsDictated,
  markAsPending,
  flagMissingImage,
  getPatientCaseIds,
} from './api/zenpacs-client';

const COMMANDS = {
  MARK_DICTATED: 'zenpacs.markDictated',
  MARK_PENDING: 'zenpacs.markPending',
  FLAG_MISSING_IMAGE: 'zenpacs.flagMissingImage',
  OK_AND_CLOSE: 'zenpacs.okAndClose',
  TOGGLE_RECORDER: 'zenpacs.toggleRecorder',
};

function getCommandsModule({ commandsManager }: { commandsManager: any }) {
  const actions = {
    [COMMANDS.MARK_DICTATED]: {
      commandFn: async () => {
        const caseIds = getPatientCaseIds();
        if (caseIds.length === 0) return;
        try {
          await markAsDictated(caseIds[0]);
          console.log('[ZenPACS] Marked as dictated:', caseIds[0]);
        } catch (err) {
          console.error('[ZenPACS] Failed to mark as dictated:', err);
        }
      },
    },

    [COMMANDS.MARK_PENDING]: {
      commandFn: async () => {
        const caseIds = getPatientCaseIds();
        if (caseIds.length === 0) return;
        try {
          await markAsPending(caseIds[0]);
          console.log('[ZenPACS] Marked as pending:', caseIds[0]);
        } catch (err) {
          console.error('[ZenPACS] Failed to mark as pending:', err);
        }
      },
    },

    [COMMANDS.FLAG_MISSING_IMAGE]: {
      commandFn: async () => {
        const caseIds = getPatientCaseIds();
        if (caseIds.length === 0) return;
        try {
          await flagMissingImage(caseIds[0]);
          console.log('[ZenPACS] Flagged missing image:', caseIds[0]);
        } catch (err) {
          console.error('[ZenPACS] Failed to flag missing image:', err);
        }
      },
    },

    [COMMANDS.OK_AND_CLOSE]: {
      commandFn: async () => {
        const caseIds = getPatientCaseIds();
        if (caseIds.length === 0) return;
        try {
          await markAsDictated(caseIds[0]);
          console.log('[ZenPACS] OK + Close: marked as dictated:', caseIds[0]);
          // Close the viewer tab
          window.close();
        } catch (err) {
          console.error('[ZenPACS] Failed OK + Close:', err);
        }
      },
    },
  };

  const definitions = {
    [COMMANDS.MARK_DICTATED]: {
      commandFn: actions[COMMANDS.MARK_DICTATED].commandFn,
      options: {},
    },
    [COMMANDS.MARK_PENDING]: {
      commandFn: actions[COMMANDS.MARK_PENDING].commandFn,
      options: {},
    },
    [COMMANDS.FLAG_MISSING_IMAGE]: {
      commandFn: actions[COMMANDS.FLAG_MISSING_IMAGE].commandFn,
      options: {},
    },
    [COMMANDS.OK_AND_CLOSE]: {
      commandFn: actions[COMMANDS.OK_AND_CLOSE].commandFn,
      options: {},
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'VIEWER',
  };
}

export default getCommandsModule;
export { COMMANDS };
