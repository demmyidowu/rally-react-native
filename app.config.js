const config = require('./app.json');

module.exports = {
  ...config,
  expo: {
    ...config.expo,
    ios: {
      ...config.expo.ios,
      // On EAS: process.env contains the path where EAS placed the uploaded file
      // Locally: falls back to the file at the project root
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
    },
    android: {
      ...config.expo.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
  },
};
