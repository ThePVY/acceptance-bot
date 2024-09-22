import EventEmitter from 'node:events';

class SuppliesApiController {
  service;
  mainConfiguration;
  warehouseIDsForTracking = [];
  intervalID;
  tickEventEmitter;

  constructor(service, mainConfiguration, chatConfiguration) {
    this.service = service;
    this.mainConfiguration = mainConfiguration;
    this.chatConfiguration = chatConfiguration;
    this.tickEventEmitter = new EventEmitter();
  }

  async startTracking() {
    await this.updateTrakedWarehousesIDs();
    this.intervalID = setInterval(async () => {
      try {
        const jsonResponse = await this.getAcceptenceMetaForTrakedWarehouses();
        if (!Array.isArray(jsonResponse)) {
          throw new Error(jsonResponse.details || 'An error during tracking interval: jsonResponse is not an array');
        }
        this.tickEventEmitter.emit('tick', jsonResponse);
      } catch (error) {
        console.error(error);
        this.tickEventEmitter.emit('tick', []);
      }
    }, this.mainConfiguration.trackingInterval);
  }

  stopTracking() {
    clearInterval(this.intervalID);
  }

  subscribeOnTick(listener) {
    this.tickEventEmitter.on('tick', listener);
  }

  unsubscribeOnTick() {
    this.tickEventEmitter.removeAllListeners('tick');
  }

  async getAcceptenceMetaForTrakedWarehouses() {
    const { baseApiUrl } = this.mainConfiguration;
    const { token } = this.chatConfiguration;

    const metas = await this.service.getAcceptanceMeta(baseApiUrl, token, {
      warehouseIDs: this.warehouseIDsForTracking,
    });

    return metas;
  }

  async updateTrakedWarehousesIDs() {
    const { baseApiUrl } = this.mainConfiguration;
    const { token, warehouses } = this.chatConfiguration;

    const getTrakedWarehousesMeta = async () => {
      const result = await this.service.getWarehousesMeta(baseApiUrl, token);

      const regexps = warehouses
        .split(',')
        .map((warehouseName) => new RegExp(warehouseName.trim()));
      const warehouseMetas = result.filter((warehouse) => regexps.some((regexp) => regexp.test(warehouse.name)));

      return warehouseMetas;
    }

    const metas = await getTrakedWarehousesMeta();

    this.warehouseIDsForTracking = metas.map((warehouse) => warehouse.ID);
  }
}

export default SuppliesApiController;
