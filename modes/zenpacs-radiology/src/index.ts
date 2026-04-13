/**
 * ZenPACS Radiology Mode
 *
 * Extends the longitudinal tracking mode with ZenPACS-specific features:
 * - Right sidebar: PatientCaseInfoPanel (Anamnez) + VoiceRecorderPanel (Kayıtlar)
 * - Toolbar: Okundu, Okunmadı, İmaj Eksik, OK+Kapat buttons
 * - Keyboard shortcuts: Ctrl+O, Ctrl+R, Ctrl+T, Ctrl+Y, Ctrl+K
 * - No study list (always deep-linked from ZenPACS web)
 */

import i18n from 'i18next';
import { id } from './id';
import {
  initToolGroups,
  toolbarButtons,
  cornerstone,
  ohif,
  dicomsr,
  dicomvideo,
  basicLayout,
  basicRoute,
  extensionDependencies as basicDependencies,
  mode as basicMode,
  modeInstance as basicModeInstance,
} from '@ohif/mode-basic';

// ZenPACS extension panel references
const zenpacs = {
  patientCaseInfo: '@zenpacs/extension-zenpacs.panelModule.patientCaseInfo',
  voiceRecorder: '@zenpacs/extension-zenpacs.panelModule.voiceRecorder',
};

// Measurement tracking panels
const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
  thumbnailList: '@ohif/extension-measurement-tracking.panelModule.seriesList',
  viewport: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
};

export const extensionDependencies = {
  ...basicDependencies,
  '@ohif/extension-measurement-tracking': '^3.0.0',
  '@zenpacs/extension-zenpacs': '^1.0.0',
};

// Layout: thumbnails left, anamnez + recordings + measurements right
const zenpacsLayout = {
  ...basicLayout,
  id: ohif.layout,
  props: {
    ...basicLayout.props,
    leftPanels: [tracked.thumbnailList],
    rightPanels: [
      zenpacs.patientCaseInfo,
      zenpacs.voiceRecorder,
      cornerstone.segmentation,
      tracked.measurements,
    ],
    viewports: [
      {
        namespace: tracked.viewport,
        displaySetsToDisplay: basicLayout.props.viewports[0].displaySetsToDisplay,
      },
      ...basicLayout.props.viewports,
    ],
  },
};

const zenpacsRoute = {
  ...basicRoute,
  path: 'viewer',
  layoutInstance: zenpacsLayout,
};

export const modeInstance = {
  ...basicModeInstance,
  id,
  routeName: 'viewer',
  displayName: 'ZenViewer',
  routes: [zenpacsRoute],
  extensions: extensionDependencies,
};

const mode = {
  ...basicMode,
  id,
  modeInstance,
  extensionDependencies,

  // Override isValidMode to accept dicomjson data source
  isValidMode: ({ modalities }: { modalities: any }) => {
    // Always valid when launched via dicomjson URL
    return { valid: true };
  },
};

export default mode;
export { initToolGroups, toolbarButtons };
