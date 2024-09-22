import BaseConfiguration from './BaseConfiguration.js';

class ChatConfiguration extends BaseConfiguration {
  get stateStep() {
    return this.get('stateStep');
  }

  get token() {
    return this.get('token');
  }

  get warehouses() {
    return this.get('warehouses');
  }

  get coefficient() {
    return this.get('coefficient');
  }
  
  get preorderid() {
    return this.get('preorderid');
  }

  get reportmode() {
    return this.get('reportmode') || 'Удалять';
  }

  get timezone() {
    return this.get('timezone') || 'Europe/Moscow';
  }
}

export default ChatConfiguration;