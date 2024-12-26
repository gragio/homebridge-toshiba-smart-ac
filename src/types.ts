import { CharacteristicValue } from 'homebridge';
import * as Constants from './constants';

export type Token = {
    consumerId: string;
    access_token: string;
};

export type Parameters = {
    consumerId: string;
};

export type Headers = {
    Authorization: string;
};

export type Device = {
    id: string;
    uniqueID: string;
    name: string;
    groupID: string;
    groupName: string;
    modelID: string;
    meritFeature: string;
    state: string;
    adapterType: string;
    firmwareVersion: string;
    cdu: Record<string, string>;
    fcu: Record<string, string>;
};

export type State = {
    [Constants.StatusProperty]: CharacteristicValue;
    [Constants.ModeProperty]: CharacteristicValue;
    [Constants.TemperatureProperty]: CharacteristicValue;
    [Constants.FanModeProperty]: CharacteristicValue;
    [Constants.SwingModeProperty]: CharacteristicValue;
    [Constants.IndoorTemperatureProperty]: CharacteristicValue;
};