import { v4 as uuidv4 } from 'uuid';
import { Client, Message } from 'azure-iot-device';
import { Amqp } from 'azure-iot-device-amqp';
import {
  CMD_HEARTBEAT,
  CMD_FCU_FROM_AC,
  CMD_SET_SCHEDULE_FROM_AC,
  CMD_FCU_TO_AC,
} from '../constants';
import { setInsideTemperature, convertStateToCapabilities } from '../utils/state';
import { Logger } from 'homebridge';
import ToshibaSmartACDevice from '../device';

export default class AmqpAPI {
  private sasToken: string = '';
  private sessionID: string = '';
  private devices: ToshibaSmartACDevice[] = [];
  private client?: Client;

  constructor(private readonly log: Logger) {}

  /**
   * Set the session ID for this AMQP client.
   */
  setSessionID(sessionID: string): void {
    this.sessionID = sessionID;
  }

  /**
   * Add a new device to the AMQP client.
   */
  addDevice(device: ToshibaSmartACDevice): void {
    this.devices.push(device);
  }

  /**
   * Set the SAS token and initialize the AMQP client.
   */
  setToken(sasToken: string): void {
    this.sasToken = sasToken;
    this.client = Client.fromSharedAccessSignature(sasToken, Amqp);
    this.createStatusUpdateHandler();
  }

  /**
   * Retrieve the SAS token.
   */
  getToken(): string {
    return this.sasToken;
  }

  /**
   * Create a handler for processing status updates from devices.
   */
  private createStatusUpdateHandler(): void {
    if (this.client) {
      this.client.onDeviceMethod('smmobile', (request) => {
        try {
          const command = request.payload.cmd;
          const { payload } = request;
          const device = this.devices.find(
            (device) => device.uniqueID === payload.sourceId,
          );

          if (device) {
            switch (command) {
            case CMD_HEARTBEAT:
              this.log.debug(
                `[AMQP API] Received: ${device.uniqueID} ${device.name} ${command} ${payload.payload.iTemp} ${payload.payload.oTemp}`,
              );
              setInsideTemperature(device, parseInt(payload.payload.iTemp, 16));
              break;

            case CMD_FCU_FROM_AC:
              this.log.debug(
                `[AMQP API] Received: ${device.uniqueID} ${device.name} ${command} ${payload.payload.data}`,
              );
              device.state = payload.payload.data;
              device.currentState = convertStateToCapabilities(payload.payload.data);
              break;

            case CMD_SET_SCHEDULE_FROM_AC:
              // Handle schedule updates (if necessary)
              break;

            default:
              this.log.warn('[AMQP API] Unknown command', command);
            }
          }
        } catch (ex) {
          this.log.error('[AMQP API] Unable to process status update:', ex);
        }
      });
    }
  }

  /**
   * Send a message to a specific device.
   */
  sendMessage(message: string, deviceUniqueID: string): void {
    const messageId = uuidv4();
    const fcuToAc = {
      sourceId: this.sessionID,
      messageId,
      targetId: [deviceUniqueID],
      cmd: CMD_FCU_TO_AC,
      payload: { data: message },
      timeStamp: '0000000',
    };

    const msg = new Message(JSON.stringify(fcuToAc));
    msg.properties.add('type', 'mob');
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';

    if (this.client) {
      this.client.sendEvent(msg);
      this.log.debug(`[AMQP API] Sent: ${deviceUniqueID} ${message}`);
    }
  }
}