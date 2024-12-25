export const BASE_URL = 'https://mobileapi.toshibahomeaccontrols.com';

// API Paths
export const LOGIN_PATH = '/api/Consumer/Login';
export const DEVICE_PATH = '/api/AC/GetRegisteredACByUniqueId';
export const MAPPING_PATH = '/api/AC/GetConsumerACMapping';
export const STATUS_PATH = '/api/AC/GetCurrentACState';
export const CONSUMER_PATH = '/api/Consumer/GetConsumerSetting';
export const PROGRAM_GET_PATH = '/api/AC/GetConsumerProgramSettings';
export const PROGRAM_SET_PATH = '/api/AC/SaveACProgramSetting';
export const PROGRAM_GROUP_SET_PATH = '/api/AC/SaveGroupProgramSetting';
export const REGISTER_MOBILE_DEVICE = '/api/Consumer/RegisterMobileDevice';
export const ENERGY_CONSUMPTION = '/api/AC/GetGroupACEnergyConsumption';

// Commands
export const CMD_HEARTBEAT = 'CMD_HEARTBEAT';
export const CMD_FCU_FROM_AC = 'CMD_FCU_FROM_AC';
export const CMD_SET_SCHEDULE_FROM_AC = 'CMD_SET_SCHEDULE_FROM_AC';
export const CMD_FCU_TO_AC = 'CMD_FCU_TO_AC';

// Constants
export const NONE_VAL_SIGNED = -1;

// Property Names
export const StatusProperty = 'status';
export const ModeProperty = 'mode';
export const TemperatureProperty = 'temperature';
export const FanModeProperty = 'fan_mode';
export const SwingModeProperty = 'swing_mode';
export const IndoorTemperatureProperty = 'indoor_temperature';

// Byte Positions
export const PositionByteStatus = 0;
export const PositionByteMode = 1;
export const PostionByteTargetTemperature = 2;
export const PostionByteFanMode = 3;
export const PositionByteSwingMode = 4;
export const PositionByteInsideTemperature = 9;