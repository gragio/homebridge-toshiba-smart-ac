import {
  NONE_VAL_SIGNED,
  StatusProperty,
  ModeProperty,
  FanModeProperty,
  SwingModeProperty,
  IndoorTemperatureProperty,
  TemperatureProperty,
  PositionByteStatus,
  PositionByteMode,
  PostionByteFanMode,
  PositionByteSwingMode,
  PositionByteInsideTemperature,
  PostionByteTargetTemperature,
} from '../constants';
import { State } from '../types';
import { ToshibaSmartACDevice } from '../device';

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}

function bytesToHex(byteArray: number[]): string {
  return byteArray.reduce((output, elem) => output + `0${elem.toString(16)}`.slice(-2), '');
}

function decode(state: string): number[] {
  const extendedState = `${state.substring(0, 12)}0${state.substring(12, 13)}0${state.substring(13)}`;
  return hexToBytes(extendedState);
}

function encode(bytes: number[]): string {
  const state = bytesToHex(bytes);
  return state.slice(0, 12) + state.substring(13, 14) + state.slice(15, 16) + state.slice(16);
}

function statusFromRaw(value: number): number {
  switch (value) {
  case 0x30:
    return 1;
  case 0x31:
    return 0;
  default:
    return 0;
  }
}

function statusToRaw(value: number): number {
  switch (value) {
  case 0:
    return 0x31;
  case 1:
    return 0x30;
  default:
    return 0x31;
  }
}

function modeFromRaw(value: number): number {
  switch (value) {
  case 0x41:
    return 0;
  case 0x43:
    return 1;
  case 0x42:
    return 2;
  default:
    return 0;
  }
}

function modeToRaw(value: number): number {
  switch (value) {
  case 0:
    return 0x41;
  case 1:
    return 0x43;
  case 2:
    return 0x42;
  default:
    return 0x41;
  }
}

function fanModeFromRaw(value: number): number {
  switch (value) {
  case 0x41: return 0;
  case 0x31: return Math.round((100 / 7) * 2);
  case 0x32: return Math.round((100 / 7) * 3);
  case 0x33: return Math.round((100 / 7) * 4);
  case 0x34: return Math.round((100 / 7) * 5);
  case 0x35: return Math.round((100 / 7) * 6);
  case 0x36: return Math.round((100 / 7) * 7);
  default: return 0;
  }
}

function fanModeToRaw(value: number): number {
  switch (value) {
  case 0: return 0x41;
  case Math.round((100 / 7) * 2): return 0x31;
  case Math.round((100 / 7) * 3): return 0x32;
  case Math.round((100 / 7) * 4): return 0x33;
  case Math.round((100 / 7) * 5): return 0x34;
  case Math.round((100 / 7) * 6): return 0x35;
  case Math.round((100 / 7) * 7): return 0x36;
  default: return 0;
  }
}

function swingModeFromRaw(value: number): number {
  switch (value) {
  case 0x31: return 0;
  case 0x42: return 1;
  default: return 0;
  }
}

function swingModeToRaw(value: number): number {
  switch (value) {
  case 0: return 0x31;
  case 1: return 0x42;
  default: return 0x31;
  }
}

function temperatureFromRaw(value: number): number {
  const values: Record<number, number> = {};
  for (let i = -128; i < 128; i++) {
    values[i] = i;
  }
  values[127] = -256;
  values[-128] = -256;
  values[NONE_VAL_SIGNED] = -256;
  values[126] = -1;
  return values[value] || -256;
}

function temperatureToRaw(value: number): number {
  const values: Record<number, number> = {};
  for (let i = -128; i < 128; i++) {
    values[i] = i;
  }
  values[-256] = NONE_VAL_SIGNED;
  values[-1] = 126;
  return values[value] || NONE_VAL_SIGNED;
}

export function convertStateToCapabilities(state: string): {
  status: number;
  mode: number;
  fan_mode: number;
  swing_mode: number;
  indoor_temperature: number;
  temperature: number;
} {
  const bytes = decode(state);
  return {
    [StatusProperty]: statusFromRaw(bytes[PositionByteStatus]),
    [ModeProperty]: modeFromRaw(bytes[PositionByteMode]),
    [FanModeProperty]: fanModeFromRaw(bytes[PostionByteFanMode]),
    [SwingModeProperty]: swingModeFromRaw(bytes[PositionByteSwingMode]),
    [IndoorTemperatureProperty]: temperatureFromRaw(bytes[PositionByteInsideTemperature]),
    [TemperatureProperty]: temperatureFromRaw(bytes[PostionByteTargetTemperature]),
  };
}

export function convertCapabilitiesToState(state: string, currentState: State): string {
  const bytes = decode(state);
  bytes[PositionByteStatus] = statusToRaw(currentState[StatusProperty]);
  bytes[PositionByteMode] = modeToRaw(currentState[ModeProperty]);
  bytes[PostionByteTargetTemperature] = temperatureToRaw(currentState[TemperatureProperty]);
  bytes[PostionByteFanMode] = fanModeToRaw(currentState[FanModeProperty]);
  bytes[PositionByteSwingMode] = swingModeToRaw(currentState[SwingModeProperty]);
  return encode(bytes);
}

export function setInsideTemperature(device: ToshibaSmartACDevice, value: number): void {
  const converted = temperatureFromRaw(value);
  device.currentState[IndoorTemperatureProperty] = converted;
  device.reconcile();
}