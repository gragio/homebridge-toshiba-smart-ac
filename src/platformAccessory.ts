import { PlatformAccessory, Service, Characteristic } from 'homebridge';
import { StatusProperty, ModeProperty, IndoorTemperatureProperty, TemperatureProperty, FanModeProperty, SwingModeProperty } from './constants';
import { ToshibaSmartACHomebridgePlatform } from './platform';
import { ToshibaSmartACDevice } from './device';

export class ToshibaSmartACPlatformAccessory {
  private service: Service;

  constructor(
    private readonly platform: ToshibaSmartACHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: ToshibaSmartACDevice,
  ) {
    // Configure accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Toshiba')
      .setCharacteristic(this.platform.Characteristic.Model, device.cdu.model_name)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, device.cdu.serial_number)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, device.firmwareVersion);

    // Create or retrieve the HeaterCooler service
    this.service =
      this.accessory.getService(this.platform.Service.HeaterCooler) ||
      this.accessory.addService(this.platform.Service.HeaterCooler);

    // Configure characteristics
    this.configureCharacteristics();
  }

  private configureCharacteristics(): void {
    const { Characteristic } = this.platform;

    // Active characteristic
    this.service
      .getCharacteristic(Characteristic.Active)
      .onGet(() => this.device.currentState[StatusProperty])
      .onSet((value: any) => {
        this.device.currentState[StatusProperty] = value;
        this.device.reconcile();
      });

    // Current Heater/Cooler state characteristic
    this.service
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .onGet(() => this.device.currentState[ModeProperty]);

    // Target Heater/Cooler state characteristic
    this.service
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .onGet(() => this.device.currentState[ModeProperty])
      .onSet((value: any) => {
        this.device.currentState[ModeProperty] = value;
        this.device.reconcile();
      });

    // Current temperature characteristic
    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => this.device.currentState[IndoorTemperatureProperty]);

    // Target temperature characteristic
    this.service
      .getCharacteristic(Characteristic.TargetTemperature)
      .onGet(() => this.device.currentState[TemperatureProperty])
      .onSet((value: any) => {
        this.device.currentState[TemperatureProperty] = value;
        this.device.reconcile();
      });

    // Rotation speed characteristic
    this.service
      .getCharacteristic(Characteristic.RotationSpeed)
      .onGet(() => this.device.currentState[FanModeProperty])
      .onSet((value: any) => {
        this.device.currentState[FanModeProperty] = value;
        this.device.reconcile();
      });

    // Swing mode characteristic
    this.service
      .getCharacteristic(Characteristic.SwingMode)
      .onGet(() => this.device.currentState[SwingModeProperty])
      .onSet((value: any) => {
        this.device.currentState[SwingModeProperty] = value;
        this.device.reconcile();
      });
  }
}