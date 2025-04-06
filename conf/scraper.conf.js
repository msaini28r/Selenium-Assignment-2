const { config: baseConfig } = require('./base.conf.js');

const scraperConfig = {
  user: process.env.BROWSERSTACK_USERNAME || 'mohitsaini_iMXbs4',
  key: process.env.BROWSERSTACK_ACCESS_KEY || '4HyMxvu7L7S6J6wrWvX2',
  hostname: 'hub.browserstack.com',
  maxInstances: 5,
  commonCapabilities: {
    'bstack:options': {
      buildName: 'el-pais-scraper-build',
      source: 'webdriverio:elpais-scraper:v1.0'
    }
  },
  capabilities: [
    {
      browserName: 'chrome',
      browserVersion: 'latest',
      'bstack:options': {
        os: 'Windows',
        osVersion: '10',
      },
    },
    {
      browserName: 'firefox',
      browserVersion: 'latest',
      'bstack:options': {
        os: 'Windows',
        osVersion: '11',
      },
    },
    {
      browserName: 'safari',
      browserVersion: 'latest',
      'bstack:options': {
        os: 'OS X',
        osVersion: 'Monterey',
      },
    },
    {
      browserName: 'chrome',
      'bstack:options': {
        deviceName: 'Samsung Galaxy S20',
      },
    },
    {
      browserName: 'safari',
      'bstack:options': {
        deviceName: 'iPhone 13',
        osVersion: '15',
      },
    },
  ],
  specs: ['./tests/specs/scraper-test.js'],
  mochaOpts: {
    timeout: 120000 
  },
  onComplete: function() {
    console.log('Waiting before closing session...');
    return new Promise(resolve => setTimeout(resolve, 5000));
  }
};

exports.config = { ...baseConfig, ...scraperConfig };

exports.config.capabilities.forEach(caps => {
  for (const i in exports.config.commonCapabilities)
    caps[i] = { ...caps[i], ...exports.config.commonCapabilities[i] };
});
