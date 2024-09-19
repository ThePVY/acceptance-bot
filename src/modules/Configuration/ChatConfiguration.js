import BaseConfiguration from './BaseConfiguration.js';

class ChatConfiguration extends BaseConfiguration {
  get token() {
    return this.get('token');
  }

  get warehousesNames() {
    return this.get('warehousesNames');
  }

  get coefficient() {
    return this.get('coefficient')
  }
  
  get preorderID() {
    return this.get('preorderID')
  }
}

export default ChatConfiguration;