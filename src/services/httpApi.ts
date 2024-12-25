import axios, { AxiosRequestConfig } from 'axios';
import {
  BASE_URL,
  LOGIN_PATH,
  MAPPING_PATH,
  STATUS_PATH,
  REGISTER_MOBILE_DEVICE,
  ENERGY_CONSUMPTION,
} from '../constants';
import { Logger, PlatformConfig } from 'homebridge';
import { Device } from '../types';

interface Token {
  consumerId: string;
  access_token: string;
}

export default class HttpAPI {
  private token: Token = { consumerId: '', access_token: '' };
  private params: Record<string, string> = { consumerId: '' };
  private headers: Record<string, string> = { Authorization: '' };
  private username: string;
  private password: string;

  constructor(private readonly log: Logger, config: PlatformConfig) {
    this.username = config.username;
    this.password = config.password;

    if (this.token) {
      this.setHeaderAndParams();
    }
  }

  async getDeviceStatus(deviceId: string): Promise<any> {
    const url = this.getUrl(STATUS_PATH);
    const params = {
      consumerId: this.token.consumerId,
      ACId: deviceId,
    };
    const data = await this.doGetRequest(url, params);
    return data.ACStateData;
  }

  async getSASToken(sessionID: string): Promise<string> {
    const url = this.getUrl(REGISTER_MOBILE_DEVICE);
    this.log.debug(`[HTTP API] Initializing AMQP session with ID: ${sessionID}`);
    const data = await this.doPostRequest(url, {
      Username: this.username.trimEnd(),
      DeviceID: sessionID,
      DeviceType: '1',
    });
    this.log.debug(`[HTTP API] Successfully initialized AMQP session with ID: ${sessionID}`);
    return data.ResObj.SasToken;
  }

  async getDevices(): Promise<Device[]> {
    const url = this.getUrl(MAPPING_PATH);
    this.log.debug('[HTTP API] Discovering devices');
    const data = await this.doGetRequest(url);

    return data.reduce((acc: Device[], group: any) => {
      if (group.ACList) {
        return [
          ...acc,
          ...group.ACList.map((ac: any) => ({
            id: ac.Id,
            uniqueID: ac.DeviceUniqueId,
            name: ac.Name,
            groupID: group.GroupId,
            groupName: group.GroupName,
            modelID: ac.ACModelId,
            meritFeature: ac.MeritFeature,
            state: ac.ACStateData,
            adapterType: ac.AdapterType,
            firmwareVersion: ac.FirmwareVersion,
          })),
        ];
      }
      return acc;
    }, []);
  }

  async getDeviceAdditionalInfo(id: string): Promise<any> {
    const url = this.getUrl(STATUS_PATH);
    this.log.debug(`[HTTP API] Discovering additional info for device: ${id}`);
    const data = await this.doGetRequest(url, { ACId: id });
    this.log.debug(`[HTTP API] Successfully discovered additional info for device: ${id}`);
    return data;
  }

  async login(): Promise<any> {
    const url = this.getUrl(LOGIN_PATH);
    this.log.debug(`[HTTP API] Logging into Toshiba Home AC Control with username: ${this.username}`);
    const json = {
      Username: this.username,
      Password: this.password,
    };
    const data = await this.doPostRequest(url, json);
    this.token = data.ResObj;
    this.log.debug('[HTTP API] Successfully logged into Toshiba Home AC Control');
    this.setHeaderAndParams();
    return data;
  }

  async getEnergyConsumption(
    deviceIDs: string[],
    type: string,
    from: any,
    to: any,
    timezone: string,
  ): Promise<any> {
    const url = this.getUrl(ENERGY_CONSUMPTION);
    const fromString = from.setZone('UTC').toString().replace('0Z', '00000Z');
    const toString = to.setZone('UTC').toString().replace('0Z', '00000Z');
    const json = {
      ACDeviceUniqueIdList: deviceIDs,
      Timezone: timezone,
      Type: type,
      FromUtcTime: fromString,
      ToUtcTime: toString,
      IsEstia: false,
    };
    return await this.doPostRequest(url, json);
  }

  private setHeaderAndParams(): void {
    this.params = { consumerId: this.token.consumerId };
    this.headers = {
      Authorization: `Bearer ${this.token.access_token}`,
    };
  }

  private async doGetRequest(url: string, params?: Record<string, any>): Promise<any> {
    this.log.debug(
      `[HTTP API] Doing GET request at ${url} with parameters: ${JSON.stringify({
        ...this.params,
        ...params,
      }, null, 2)}`,
    );

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
      headers: this.headers,
      params: {
        ...this.params,
        ...params,
      },
    };

    try {
      const { data } = await axios(config);
      if (data && !data.IsSuccess) {
        throw new Error(data.Message);
      }
      return data.ResObj;
    } catch (ex) {
      return Promise.reject(ex);
    }
  }

  private async doPostRequest(url: string, json: Record<string, any>): Promise<any> {
    this.log.debug(`[HTTP API] Doing POST request at ${url} with JSON: ${JSON.stringify(json, null, 2)}`);

    const config: AxiosRequestConfig = {
      method: 'post',
      url,
      headers: this.headers,
      params: this.params,
      data: json,
    };

    try {
      const { data } = await axios(config);
      if (data && data.message_type === 'Error') {
        throw new Error(data.message);
      }
      if (!data.IsSuccess) {
        throw new Error(data.Message);
      }
      return data;
    } catch (ex) {
      return Promise.reject(ex);
    }
  }

  private getUrl(suburl: string): string {
    return BASE_URL + suburl;
  }
}