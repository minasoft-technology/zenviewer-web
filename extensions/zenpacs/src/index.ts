import { id } from './id';
import getPanelModule from './getPanelModule';
import getToolbarModule from './getToolbarModule';
import getCommandsModule from './getCommandsModule';
import { initFromViewerUrl } from './api/zenpacs-client';

/**
 * ZenPACS Extension
 *
 * Integrates the OHIF web viewer with ZenPACS backend:
 * - Status buttons: Okundu, Okunmadı, İmaj Eksik, OK+Kapat
 * - Voice recording panel with upload
 * - Patient case info panel (orders, anamnesis, notes, reports)
 * - Keyboard shortcuts (Ctrl+O, Ctrl+R, Ctrl+T, Ctrl+Y, Ctrl+K)
 */
const zenpacsExtension = {
  id,

  preRegistration({ servicesManager, commandsManager, configuration }: any) {
    // Extract auth token and API base URL from the viewer launch URL
    initFromViewerUrl();
  },

  onModeEnter({ servicesManager }: any) {
    // Register keyboard shortcuts matching ZenViewer's ZenShortcuts.java
    const { commandsManager } = servicesManager.services;

    const shortcuts = [
      { key: 'o', ctrl: true, command: 'zenpacs.markDictated' },       // Ctrl+O — Okundu
      { key: 'r', ctrl: true, command: 'zenpacs.startRecording' },     // Ctrl+R — Kayıt
      { key: 't', ctrl: true, command: 'zenpacs.pauseResumeRecording' }, // Ctrl+T — Duraklat/Devam
      { key: 'y', ctrl: true, command: 'zenpacs.uploadRecording' },    // Ctrl+Y — Yükle
      { key: 'k', ctrl: true, command: 'zenpacs.okAndClose' },         // Ctrl+K — OK + Kapat
    ];

    const handleKeydown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!e.ctrlKey && !e.metaKey) return;

      const shortcut = shortcuts.find(s => s.key === e.key.toLowerCase() && (e.ctrlKey || e.metaKey));
      if (shortcut) {
        e.preventDefault();
        commandsManager.runCommand(shortcut.command);
      }
    };

    document.addEventListener('keydown', handleKeydown);

    // Store cleanup function
    (zenpacsExtension as any)._keydownHandler = handleKeydown;
  },

  onModeExit() {
    // Remove keyboard listener
    if ((zenpacsExtension as any)._keydownHandler) {
      document.removeEventListener('keydown', (zenpacsExtension as any)._keydownHandler);
    }
  },

  getPanelModule,
  getToolbarModule,
  getCommandsModule,
};

export default zenpacsExtension;
