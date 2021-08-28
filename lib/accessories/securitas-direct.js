class SecuritasDirectAccessory {
  constructor(homebridge, logger, config, client) {
    this.homebridge = homebridge;
    this.logger = logger;
    this.config = config;
    this.client = client;

    this.value = null;
    this.service = null;
    this.pollCharacteristics = [];

    const { Characteristic, Service } = homebridge.hap;

    this.accessoryInformation = new Service.AccessoryInformation();
    this.accessoryInformation
      .setCharacteristic(Characteristic.Manufacturer, 'Verisure');

    // if (config && config.pollInterval) {
    //   setInterval(() => {
    //     this.pollCharacteristics.forEach((characteristic) => characteristic.getValue());
    //   }, config.pollInterval * 1000);
    // }
  }

  async checkAlarm() {
    const ref = await this.client.checkAlarm(this.config.panel);
    const res = await this.client.checkStatus(ref.referenceId, this.config.panel);
    return Promise.resolve(res);
  }

  async setAlarm(targetStatus, currentStatus) {
    const ref = await this.client.setAlarm(currentStatus, targetStatus, this.config.panel);
    const res = await this.client.checkAlarmStatus(ref.referenceId, currentStatus, targetStatus, this.config.panel, 1, 1);
    return Promise.resolve(res);
  }

  log(message) {
    return this.logger('info', `${this.name}: ${message}`);
  }
}

module.exports = SecuritasDirectAccessory;
