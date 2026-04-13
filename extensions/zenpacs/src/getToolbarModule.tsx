/**
 * ZenPACS Toolbar Module
 *
 * Adds status buttons matching ZenViewer's ZenToolBar.java:
 * - Okundu (green) — mark as dictated
 * - Okunmadı (amber) — mark as pending
 * - İmaj Eksik (rose) — flag missing image
 * - OK + Kapat (green) — mark dictated and close
 */

import { COMMANDS } from './getCommandsModule';

function getToolbarModule({ commandsManager }: { commandsManager: any }) {
  return [
    // Okundu button
    {
      name: 'zenpacs-okundu',
      defaultComponent: 'ohif.action',
      props: {
        type: 'action',
        id: 'zenpacs-okundu',
        icon: 'status-tracked',
        label: 'Okundu',
        tooltip: 'Okundu olarak işaretle (Ctrl+O)',
        commands: [{ commandName: COMMANDS.MARK_DICTATED }],
      },
    },
    // Okunmadı button
    {
      name: 'zenpacs-okunmadi',
      defaultComponent: 'ohif.action',
      props: {
        type: 'action',
        id: 'zenpacs-okunmadi',
        icon: 'status-untracked',
        label: 'Okunmadı',
        tooltip: 'Okunmadı olarak işaretle',
        commands: [{ commandName: COMMANDS.MARK_PENDING }],
      },
    },
    // İmaj Eksik button
    {
      name: 'zenpacs-imaj-eksik',
      defaultComponent: 'ohif.action',
      props: {
        type: 'action',
        id: 'zenpacs-imaj-eksik',
        icon: 'exclamation',
        label: 'İmaj Eksik',
        tooltip: 'İmaj eksik olarak işaretle',
        commands: [{ commandName: COMMANDS.FLAG_MISSING_IMAGE }],
      },
    },
    // OK + Kapat button
    {
      name: 'zenpacs-ok-kapat',
      defaultComponent: 'ohif.action',
      props: {
        type: 'action',
        id: 'zenpacs-ok-kapat',
        icon: 'check',
        label: 'OK + Kapat',
        tooltip: 'Okundu yap ve kapat (Ctrl+K)',
        commands: [{ commandName: COMMANDS.OK_AND_CLOSE }],
      },
    },
  ];
}

export default getToolbarModule;
