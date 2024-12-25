import { v4 as uuidv4 } from 'uuid';
import { PlatformConfig, API, Logger, PlatformAccessory } from 'homebridge';
import { ToshibaSmartACDevice } from './device';
import { ToshibaSmartACPlatformAccessory } from './platformAccessory';
import { PLUGIN_NAME, PLATFORM_NAME } from './settings';
import HttpApi from './services/httpApi';
import AmqpApi from './services/amqpApi';

export class ToshibaSmartACHomebridgePlatform {
  private accessories: PlatformAccessory[] = [];
  private sessionID: string = '';
  private http: HttpApi;
  private amqp: AmqpApi;
  public Service: any;
  public Characteristic: any;

  constructor(
    private readonly log: Logger,
    private config: PlatformConfig,
    private api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.log.info(`Finished initializing ${this.config.platform} platform`);

    if (!this.sessionID) {
      this.sessionID = `homebridge-${uuidv4()}`;
    }

    this.http = new HttpApi(this.log, this.config);
    this.amqp = new AmqpApi(this.log);
    this.amqp.setSessionID(this.sessionID);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  private async connect(): Promise<void> {
    await this.http.login();
    const sasToken = await this.http.getSASToken(this.sessionID);
    this.amqp.setToken(sasToken);
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  private async discoverDevices(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      this.cleanAccessories();
    }

    await this.connect();
    const devices = await this.http.getDevices();

    devices.forEach(async (device) => {
      const { id } = device;
      const additionalInfo = await this.http.getDeviceAdditionalInfo(id);
      const dev = new ToshibaSmartACDevice(this.log, this.amqp, device, additionalInfo);
      this.amqp.addDevice(dev);

      this.log.debug(`Trying to register device: ${JSON.stringify(device, undefined, 2)}`);

      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === device.uniqueID);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new ToshibaSmartACPlatformAccessory(this, existingAccessory, dev);
      } else {
        this.log.info('Adding new accessory:', dev.name);
        const accessory = new this.api.platformAccessory(dev.name, dev.uniqueID);
        new ToshibaSmartACPlatformAccessory(this, accessory, dev);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });
  }

  private cleanAccessories(): void {
    try {
      if (this.accessories.length > 0) {
        this.log.debug('[PLATFORM]', 'Removing cached accessories (Count:', `${this.accessories.length})`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
      }
    } catch (error) {   
      //this.log.error(`[PLATFORM] Error for cached accessories: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
  }
}