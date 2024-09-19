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
        const metas = await this.getAcceptenceMetaForTrakedWarehouses();
        this.tickEventEmitter.emit('tick', metas);
      } catch (error) {
        console.error(error);
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
    const { token, warehousesNames } = this.chatConfiguration;

    const getTrakedWarehousesMeta = async () => {
      const result = await this.service.getWarehousesMeta(baseApiUrl, token);

      const regexps = warehousesNames
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
