/** @type {AppTypes.Config} */
window.config = {
  routerBasename: '/',
  showStudyList: false, // Always deep-linked from ZenPACS web — no study list needed
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: false,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,

  // Custom branding
  whiteLabeling: {
    createLogoComponentFn: function (React) {
      return React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('img', {
          src: '/zen-logo.svg',
          alt: 'ZenViewer',
          style: { height: '28px' },
        }),
        React.createElement(
          'span',
          { style: { color: '#fff', fontSize: '16px', fontWeight: 'bold' } },
          'ZenViewer'
        )
      );
    },
  },

  // DicomJSON data source — fetches manifest from ZenPACS API
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'ZenPACS WebViewer',
        name: 'json',
      },
    },
  ],
  defaultDataSourceName: 'dicomjson',

  // Use our custom ZenPACS radiology mode as default
  defaultMode: '@zenpacs/mode-radiology',

  hotkeys: [
    { commandName: 'zenpacs.markDictated', label: 'Okundu', keys: ['ctrl+o'] },
    { commandName: 'zenpacs.okAndClose', label: 'OK + Kapat', keys: ['ctrl+k'] },
    { commandName: 'incrementActiveViewport', label: 'Next Viewport', keys: ['right'] },
    { commandName: 'decrementActiveViewport', label: 'Previous Viewport', keys: ['left'] },
    { commandName: 'rotateViewportCW', label: 'Rotate Right', keys: ['r'] },
    { commandName: 'rotateViewportCCW', label: 'Rotate Left', keys: ['l'] },
    { commandName: 'flipViewportHorizontal', label: 'Flip Horizontally', keys: ['h'] },
    { commandName: 'flipViewportVertical', label: 'Flip Vertically', keys: ['v'] },
    { commandName: 'scaleUpViewport', label: 'Zoom In', keys: ['+'] },
    { commandName: 'scaleDownViewport', label: 'Zoom Out', keys: ['-'] },
    { commandName: 'fitViewportToWindow', label: 'Zoom to Fit', keys: ['='] },
    { commandName: 'resetViewport', label: 'Reset', keys: ['space'] },
    { commandName: 'invertViewport', label: 'Invert', keys: ['i'] },
  ],
};
