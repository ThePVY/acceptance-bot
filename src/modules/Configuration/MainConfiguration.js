import BaseConfiguration from './BaseConfiguration.js';

class MainConfiguration extends BaseConfiguration {
  get baseApiUrl() {
    return this.get('baseApiUrl');
  }

  get trackingInterval() {
    return this.get('trackingInterval');
  }

  get botToken() {
    return this.get('bot.token');
  }

  get botWhitelist() {
    return this.get('bot.whitelist');
  }

  get botPollingInterval() {
    return this.get('bot.pollingInterval');
  }
}

export default MainConfiguration;