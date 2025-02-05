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
  private token: Token;
  private params: Record<string, string> = { consumerId: '' };
  private headers: Record<string, string> = { 
    'Authorization': '',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
 
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
      username: this.username,
      password: this.password,
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
    this.headers.Authorization = `Bearer ${this.token.access_token}`;
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
    const config: AxiosRequestConfig = {
      method: 'post',
      url,
      headers: this.headers,
      params: this.params,
      data: json,
    };
    this.log.debug(`[HTTP API] Sending POST request to ${url} with payload:`, config);


    try {
      const response = await axios(config);
      this.log.debug(`[HTTP API] Response received with status ${response.status}`);

      if (response.status !== 200) {
        throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
      }

      const data = response.data;
      if (data && data.message_type === 'Error') {
        throw new Error(`API Error: ${data.message}`);
      }
      if (!data.IsSuccess) {
        throw new Error(`API Error: ${data.Message}`);
      }

      return data;
    } catch (error) {
      // Verifica se l'errore è un AxiosError
      if (axios.isAxiosError(error)) {
        this.log.error(`[HTTP API] Axios error: ${error.message}`, {
          url,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      } else if (error instanceof Error) {
        // Se è un errore generico
        this.log.error(`: ${error.message}`, {
          url,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        this.log.error(`[HTTP API] Unexpected error: ${error.message}`, error);
      } else {
        // Caso generico per errori di tipo `unknown`
        this.log.error('[HTTP API] Unknown error occurred', error);
      }

      throw error; // Propaga l'errore al chiamante
    }
  }

  private getUrl(suburl: string): string {
    return BASE_URL + suburl;
  }
}