/**
 * ZenPACS Panel Module
 *
 * Registers panels matching ZenViewer:
 * - PatientCaseInfoPanel (right sidebar — "Anamnez")
 * - VoiceRecorderPanel (right sidebar — "Kayıtlar")
 */

import PatientCaseInfoPanel from './panels/PatientCaseInfoPanel';
import VoiceRecorderPanel from './panels/VoiceRecorderPanel';

function getPanelModule({ servicesManager, commandsManager, extensionManager }: any) {
  return [
    {
      name: 'patientCaseInfo',
      iconName: 'tab-patient-info',
      iconLabel: 'Anamnez',
      label: 'Anamnez',
      component: PatientCaseInfoPanel,
    },
    {
      name: 'voiceRecorder',
      iconName: 'audio',
      iconLabel: 'Kayıtlar',
      label: 'Kayıtlar',
      component: VoiceRecorderPanel,
    },
  ];
}

export default getPanelModule;
