const SecuritasDirectAccessory = require('./securitas-direct');

class Alarm extends SecuritasDirectAccessory {

  lastRequest = false;
  armStatus = 3;
  protomResponse = "D";

  constructor(...args) {
    super(...args);

    this.model = 'ALARM';
    this.name = 'Alarm';
  }

  resolveArmState(input) {
    const { SecuritySystemCurrentState } = this.homebridge.hap.Characteristic;
    const armStateMap = {
      T: SecuritySystemCurrentState.AWAY_ARM,
      // P: SecuritySystemCurrentState.STAY_ARM,
      D: SecuritySystemCurrentState.DISARMED,
      Q: SecuritySystemCurrentState.NIGHT_ARM
    };

    const output = armStateMap[input.protomResponse];

    if (typeof output === 'undefined') {
      throw Error(`Cannot resolve arm state from unknown input: ${input}`);
    }

    console.log('Imposto il valore a: ', output);
    this.armStatus = output;
    this.protomResponse = input.protomResponse;
    console.log('Impostato il valore a: ', this.armStatus);
    return output;
  }

  resolveArmCommand(input) {
    const { SecuritySystemCurrentState } = this.homebridge.hap.Characteristic;

    const armCommands = {
      AWAY_ARM: 'ARMINTFPART1',
      // STAY_ARM: 'ARMDAY',
      DISARMED: 'DARM1',
      NIGHT_ARM: 'ARMNIGHT1',
    };

    const state = Object.keys(armCommands).find(
      (key) => SecuritySystemCurrentState[key] === input,
    );

    const output = armCommands[state];

    if (typeof output === 'undefined') {
      throw Error(`Cannot resolve arm command from unknown input: ${input}`);
    }

    return output;
  }

  getCurrentAlarmState(callback, ) {
    const currentTime = new Date().getTime();
    // 60000 = 1 minute * 10 = 10 minutes
    if ( this.lastRequest && ( currentTime - this.lastRequest < 60000 * 10 ) ) {
      this.log('Cache: ' + this.armStatus);
      callback(null, this.armStatus)
      return
    }
    this.lastRequest = new Date().getTime();
    this.log('Getting current alarm state.');

    this.checkAlarm()
      .then((res) => {
        const resolvedStatus = this.resolveArmState(res);
        callback(null, resolvedStatus)

        setImmediate(() => {
          const { SecuritySystemCurrentState } = this.homebridge.hap.Characteristic;
          this.service.setCharacteristic(SecuritySystemCurrentState, resolvedStatus);
        });
      })
      .catch(callback);
  }

  setTargetAlarmState(value, callback) {
    this.log(`Setting target alarm state to: ${value}`);

    this.setAlarm(this.resolveArmCommand(value), this.protomResponse)
      .then((res) => {
        this.resolveArmState(res);
        callback(); // Successful action.

        setImmediate(() => {
          const { SecuritySystemCurrentState } = this.homebridge.hap.Characteristic;
          this.service.setCharacteristic(SecuritySystemCurrentState, value);
        });
      })
      .catch(callback);
  }

  getServices() {
    const { Service, Characteristic } = this.homebridge.hap;

    this.service = new Service.SecuritySystem(this.name);

    const currentStateCharacteristic = this.service
      .getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .on('get', this.getCurrentAlarmState.bind(this));

    this.service
      .getCharacteristic(Characteristic.SecuritySystemTargetState)
      .on('get', this.getCurrentAlarmState.bind(this))
      .on('set', this.setTargetAlarmState.bind(this));

    this.accessoryInformation.setCharacteristic(Characteristic.Model, this.model);

    this.pollCharacteristics.push(currentStateCharacteristic);

    return [this.accessoryInformation, this.service];
  }
}

module.exports = Alarm;
