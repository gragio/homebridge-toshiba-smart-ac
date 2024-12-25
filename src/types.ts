import { CharacteristicValue } from 'homebridge';
import * as Constants from './constants';

// Tipo per il token
export type Token = {
    consumerId: string;
    access_token: string;
};

// Tipo per i parametri
export type Parameters = {
    consumerId: string;
};

// Tipo per gli headers delle richieste
export type Headers = {
    Authorization: string;
};

// Tipo per rappresentare un dispositivo
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

// Tipo per rappresentare lo stato del dispositivo
export type State = {
    [Constants.StatusProperty]: number;
    [Constants.ModeProperty]: number;
    [Constants.TemperatureProperty]: number;
    [Constants.FanModeProperty]: number;
    [Constants.SwingModeProperty]: number;
    [Constants.IndoorTemperatureProperty]: number   ;
};