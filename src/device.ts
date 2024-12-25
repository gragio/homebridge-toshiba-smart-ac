import { Logger } from 'homebridge';
import * as Constants from './constants';
import { Device, State } from './types';
import { convertStateToCapabilities, convertCapabilitiesToState } from './utils/state';
import AmqpAPI from './services/amqpApi';

export class ToshibaSmartACDevice {
  public log: Logger;
  public amqp: AmqpAPI;
  public id: string;
  public uniqueID: string;
  public name: string;
  public groupID: string;
  public groupName: string;
  public modelID: string;
  public meritFeature: string;
  public state: string;
  public adapterType: string;
  public firmwareVersion: string;
  public cdu: Record<string, string>;
  public fcu: Record<string, string>;

  public currentState: State = {
    [Constants.StatusProperty]: 0,
    [Constants.ModeProperty]: 0,
    [Constants.TemperatureProperty]: 10,
    [Constants.FanModeProperty]: 0,
    [Constants.SwingModeProperty]: 0,
    [Constants.IndoorTemperatureProperty]: 10,
  };

  constructor(
    log: Logger,
    amqp: AmqpAPI,
    device: Device,
    additionalInfo: Record<string, any>,
  ) {
    this.log = log;
    this.amqp = amqp;
    this.id = device.id;
    this.uniqueID = device.uniqueID;
    this.name = device.name;
    this.groupID = device.groupID;
    this.groupName = device.groupName;
    this.modelID = device.modelID;
    this.meritFeature = device.meritFeature;
    this.state = device.state;
    this.adapterType = device.adapterType;
    this.firmwareVersion = device.firmwareVersion;
    this.cdu = additionalInfo.Cdu;
    this.fcu = additionalInfo.Fcu;

    this.log.debug(`Initializing device with ID: ${this.uniqueID}, name: ${this.name}, state: ${this.state}`);
    this.currentState = convertStateToCapabilities(this.state);
  }

  public reconcile(): void {
    const state = convertCapabilitiesToState(this.state, this.currentState);
    this.state = state;
    this.amqp.sendMessage(state, this.uniqueID);
  }
}