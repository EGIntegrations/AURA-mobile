const appJson = require('./app.json');

const backendBaseUrl = process.env.BACKEND_BASE_URL || appJson.expo.extra?.backendBaseUrl || '';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      backendBaseUrl,
    },
  },
};
