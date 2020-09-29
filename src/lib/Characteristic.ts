import Decimal from 'decimal.js';
import { EventEmitter } from "events";
import {
  CharacteristicValue,
  HapCharacteristic,
  Nullable,
  SessionIdentifier,
  ToHAPOptions,
  VoidCallback,
} from '../types';
import { CharacteristicEvents } from "./Accessory";
import * as HomeKitTypes from './gen';
import { Status } from "./HAPServer";
import { IdentifierCache } from './model/IdentifierCache';
import { clone } from "./util/clone";
import { HAPSession } from "./util/eventedhttp";
import { once } from './util/once';
import { toShortForm } from './util/uuid';

export const enum Formats {
  BOOL = 'bool',
  INT = 'int',
  FLOAT = 'float',
  STRING = 'string',
  UINT8 = 'uint8',
  UINT16 = 'uint16',
  UINT32 = 'uint32',
  UINT64 = 'uint64',
  DATA = 'data',
  TLV8 = 'tlv8',
  ARRAY = 'array', //Not in HAP Spec
  DICTIONARY = 'dict', //Not in HAP Spec
}

export const enum Units {
  CELSIUS = 'celsius', // celsius is the only temperature unit, conversion to fahrenheit is done on the iOS device
  PERCENTAGE = 'percentage',
  ARC_DEGREE = 'arcdegrees',
  LUX = 'lux',
  SECONDS = 'seconds',
}

// Known HomeKit permission types
export const enum Perms {
  // noinspection JSUnusedGlobalSymbols
  /**
   * @deprecated replaced by {@link PAIRED_READ}. Kept for backwards compatibility.
   */
  READ = 'pr',
  /**
   * @deprecated replaced by {@link PAIRED_WRITE}. Kept for backwards compatibility.
   */
  WRITE = 'pw',
  PAIRED_READ = 'pr',
  PAIRED_WRITE = 'pw',
  NOTIFY = 'ev', // both terms are used in hap spec
  EVENTS = 'ev',
  ADDITIONAL_AUTHORIZATION = 'aa',
  TIMED_WRITE = 'tw',
  HIDDEN = 'hd',
  WRITE_RESPONSE = 'wr',
}

export interface CharacteristicProps {
  format: Formats;
  perms: Perms[];
  unit?: Units;
  description?: string;
  minValue?: number;
  maxValue?: number;
  minStep?: number;
  maxLen?: number;
  maxDataLen?: number;
  validValues?: number[];
  validValueRanges?: [number, number];
  adminOnlyAccess?: Access[];
}

export const enum Access {
  READ = 0x00,
  WRITE = 0x01,
  NOTIFY = 0x02
}

export type CharacteristicChange = {
  newValue: Nullable<CharacteristicValue>;
  oldValue: Nullable<CharacteristicValue>;
  context?: CharacteristicEvents;
};

export interface SerializedCharacteristic {
  displayName: string,
  UUID: string,
  props: CharacteristicProps,
  value: Nullable<CharacteristicValue>,
  eventOnlyCharacteristic: boolean,
}

export const enum CharacteristicEventTypes {
  GET = "get",
  SET = "set",
  CHANGE = "change",
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
}

export type CharacteristicGetCallback = (status?: Status | null | Error, value?: Nullable<CharacteristicValue>) => void;
export type CharacteristicSetCallback = (error?: Status | null | Error, writeResponse?: Nullable<CharacteristicValue>) => void;

export declare interface Characteristic {

  on(event: "get", listener: (callback: CharacteristicGetCallback, context: CharacteristicEvents, session: HAPSession) => void): this;
  on(event: "set", listener: (value: CharacteristicValue, callback: CharacteristicSetCallback, context: CharacteristicEvents, session: HAPSession) => void): this
  on(event: "change", listener: (change: CharacteristicChange) => void): this;
  on(event: "subscribe", listener: VoidCallback): this;
  on(event: "unsubscribe", listener: VoidCallback): this;

  emit(event: "get", callback: CharacteristicGetCallback, context: CharacteristicEvents, session: HAPSession): boolean;
  emit(event: "set", value: CharacteristicValue, callback: CharacteristicSetCallback, context: CharacteristicEvents, session: HAPSession): boolean;
  emit(event: "change", change: CharacteristicChange): boolean;
  emit(event: "subscribe"): boolean;
  emit(event: "unsubscribe"): boolean;

}

/**
 * Characteristic represents a particular typed variable that can be assigned to a Service. For instance, a
 * "Hue" Characteristic might store a 'float' value of type 'arcdegrees'. You could add the Hue Characteristic
 * to a Service in order to store that value. A particular Characteristic is distinguished from others by its
 * UUID. HomeKit provides a set of known Characteristic UUIDs defined in HomeKit.ts along with a
 * corresponding concrete subclass.
 *
 * You can also define custom Characteristics by providing your own UUID. Custom Characteristics can be added
 * to any native or custom Services, but Siri will likely not be able to work with these.
 *
 * Note that you can get the "value" of a Characteristic by accessing the "value" property directly, but this
 * is really a "cached value". If you want to fetch the latest value, which may involve doing some work, then
 * call getValue().
 *
 * @event 'get' => function(callback(err, newValue), context) { }
 *        Emitted when someone calls getValue() on this Characteristic and desires the latest non-cached
 *        value. If there are any listeners to this event, one of them MUST call the callback in order
 *        for the value to ever be delivered. The `context` object is whatever was passed in by the initiator
 *        of this event (for instance whomever called `getValue`).
 *
 * @event 'set' => function(newValue, callback(err), context) { }
 *        Emitted when someone calls setValue() on this Characteristic with a desired new value. If there
 *        are any listeners to this event, one of them MUST call the callback in order for this.value to
 *        actually be set. The `context` object is whatever was passed in by the initiator of this change
 *        (for instance, whomever called `setValue`).
 *
 * @event 'change' => function({ oldValue, newValue, context }) { }
 *        Emitted after a change in our value has occurred. The new value will also be immediately accessible
 *        in this.value. The event object contains the new value as well as the context object originally
 *        passed in by the initiator of this change (if known).
 */
export class Characteristic extends EventEmitter {

  /**
   * @deprecated Please use the Formats const enum above. Scheduled to be removed in 2021-06.
   */
  // @ts-ignore
  static Formats = Formats;
  /**
   * @deprecated Please use the Units const enum above. Scheduled to be removed in 2021-06.
   */
  // @ts-ignore
  static Units = Units;
  /**
   * @deprecated Please use the Perms const enum above. Scheduled to be removed in 2021-06.
   */
  // @ts-ignore
  static Perms = Perms;

  static AccessControlLevel: typeof HomeKitTypes.Generated.AccessControlLevel;
  static AccessoryFlags: typeof HomeKitTypes.Generated.AccessoryFlags;
  static AccessoryIdentifier: typeof HomeKitTypes.Bridged.AccessoryIdentifier;
  static Active: typeof HomeKitTypes.Generated.Active;
  static ActiveIdentifier: typeof HomeKitTypes.TV.ActiveIdentifier;
  static AdministratorOnlyAccess: typeof HomeKitTypes.Generated.AdministratorOnlyAccess;
  static AirParticulateDensity: typeof HomeKitTypes.Generated.AirParticulateDensity;
  static AirParticulateSize: typeof HomeKitTypes.Generated.AirParticulateSize;
  static AirQuality: typeof HomeKitTypes.Generated.AirQuality;
  static AppMatchingIdentifier: typeof HomeKitTypes.Bridged.AppMatchingIdentifier;
  static AudioFeedback: typeof HomeKitTypes.Generated.AudioFeedback;
  static BatteryLevel: typeof HomeKitTypes.Generated.BatteryLevel;
  static Brightness: typeof HomeKitTypes.Generated.Brightness;
  static ButtonEvent: typeof HomeKitTypes.Remote.ButtonEvent;
  static CarbonDioxideDetected: typeof HomeKitTypes.Generated.CarbonDioxideDetected;
  static CarbonDioxideLevel: typeof HomeKitTypes.Generated.CarbonDioxideLevel;
  static CarbonDioxidePeakLevel: typeof HomeKitTypes.Generated.CarbonDioxidePeakLevel;
  static CarbonMonoxideDetected: typeof HomeKitTypes.Generated.CarbonMonoxideDetected;
  static CarbonMonoxideLevel: typeof HomeKitTypes.Generated.CarbonMonoxideLevel;
  static CarbonMonoxidePeakLevel: typeof HomeKitTypes.Generated.CarbonMonoxidePeakLevel;
  static Category: typeof HomeKitTypes.Bridged.Category;
  static ChargingState: typeof HomeKitTypes.Generated.ChargingState;
  static ClosedCaptions: typeof HomeKitTypes.TV.ClosedCaptions;
  static ColorTemperature: typeof HomeKitTypes.Generated.ColorTemperature;
  static ConfigureBridgedAccessory: typeof HomeKitTypes.Bridged.ConfigureBridgedAccessory;
  static ConfigureBridgedAccessoryStatus: typeof HomeKitTypes.Bridged.ConfigureBridgedAccessoryStatus;
  static ConfiguredName: typeof HomeKitTypes.TV.ConfiguredName;
  static ContactSensorState: typeof HomeKitTypes.Generated.ContactSensorState;
  static CoolingThresholdTemperature: typeof HomeKitTypes.Generated.CoolingThresholdTemperature;
  static CurrentAirPurifierState: typeof HomeKitTypes.Generated.CurrentAirPurifierState;
  static CurrentAmbientLightLevel: typeof HomeKitTypes.Generated.CurrentAmbientLightLevel;
  static CurrentDoorState: typeof HomeKitTypes.Generated.CurrentDoorState;
  static CurrentFanState: typeof HomeKitTypes.Generated.CurrentFanState;
  static CurrentHeaterCoolerState: typeof HomeKitTypes.Generated.CurrentHeaterCoolerState;
  static CurrentHeatingCoolingState: typeof HomeKitTypes.Generated.CurrentHeatingCoolingState;
  static CurrentHorizontalTiltAngle: typeof HomeKitTypes.Generated.CurrentHorizontalTiltAngle;
  static CurrentHumidifierDehumidifierState: typeof HomeKitTypes.Generated.CurrentHumidifierDehumidifierState;
  static CurrentMediaState: typeof HomeKitTypes.TV.CurrentMediaState;
  static CurrentPosition: typeof HomeKitTypes.Generated.CurrentPosition;
  static CurrentRelativeHumidity: typeof HomeKitTypes.Generated.CurrentRelativeHumidity;
  static CurrentSlatState: typeof HomeKitTypes.Generated.CurrentSlatState;
  static CurrentTemperature: typeof HomeKitTypes.Generated.CurrentTemperature;
  static CurrentTiltAngle: typeof HomeKitTypes.Generated.CurrentTiltAngle;
  static CurrentTime: typeof HomeKitTypes.Bridged.CurrentTime;
  static CurrentVerticalTiltAngle: typeof HomeKitTypes.Generated.CurrentVerticalTiltAngle;
  static CurrentVisibilityState: typeof HomeKitTypes.TV.CurrentVisibilityState;
  static DayoftheWeek: typeof HomeKitTypes.Bridged.DayoftheWeek;
  static DigitalZoom: typeof HomeKitTypes.Generated.DigitalZoom;
  static DiscoverBridgedAccessories: typeof HomeKitTypes.Bridged.DiscoverBridgedAccessories;
  static DiscoveredBridgedAccessories: typeof HomeKitTypes.Bridged.DiscoveredBridgedAccessories;
  static DisplayOrder: typeof HomeKitTypes.TV.DisplayOrder;
  static FilterChangeIndication: typeof HomeKitTypes.Generated.FilterChangeIndication;
  static FilterLifeLevel: typeof HomeKitTypes.Generated.FilterLifeLevel;
  static FirmwareRevision: typeof HomeKitTypes.Generated.FirmwareRevision;
  static HardwareRevision: typeof HomeKitTypes.Generated.HardwareRevision;
  static HeatingThresholdTemperature: typeof HomeKitTypes.Generated.HeatingThresholdTemperature;
  static HoldPosition: typeof HomeKitTypes.Generated.HoldPosition;
  static Hue: typeof HomeKitTypes.Generated.Hue;
  static Identifier: typeof HomeKitTypes.TV.Identifier;
  static Identify: typeof HomeKitTypes.Generated.Identify;
  static ImageMirroring: typeof HomeKitTypes.Generated.ImageMirroring;
  static ImageRotation: typeof HomeKitTypes.Generated.ImageRotation;
  static InUse: typeof HomeKitTypes.Generated.InUse;
  static InputDeviceType: typeof HomeKitTypes.TV.InputDeviceType;
  static InputSourceType: typeof HomeKitTypes.TV.InputSourceType;
  static IsConfigured: typeof HomeKitTypes.Generated.IsConfigured;
  static LeakDetected: typeof HomeKitTypes.Generated.LeakDetected;
  static LinkQuality: typeof HomeKitTypes.Bridged.LinkQuality;
  static LockControlPoint: typeof HomeKitTypes.Generated.LockControlPoint;
  static LockCurrentState: typeof HomeKitTypes.Generated.LockCurrentState;
  static LockLastKnownAction: typeof HomeKitTypes.Generated.LockLastKnownAction;
  static LockManagementAutoSecurityTimeout: typeof HomeKitTypes.Generated.LockManagementAutoSecurityTimeout;
  static LockPhysicalControls: typeof HomeKitTypes.Generated.LockPhysicalControls;
  static LockTargetState: typeof HomeKitTypes.Generated.LockTargetState;
  static Logs: typeof HomeKitTypes.Generated.Logs;
  static Manufacturer: typeof HomeKitTypes.Generated.Manufacturer;
  static Model: typeof HomeKitTypes.Generated.Model;
  static MotionDetected: typeof HomeKitTypes.Generated.MotionDetected;
  static Mute: typeof HomeKitTypes.Generated.Mute;
  static Name: typeof HomeKitTypes.Generated.Name;
  static NightVision: typeof HomeKitTypes.Generated.NightVision;
  static NitrogenDioxideDensity: typeof HomeKitTypes.Generated.NitrogenDioxideDensity;
  static ObstructionDetected: typeof HomeKitTypes.Generated.ObstructionDetected;
  static OccupancyDetected: typeof HomeKitTypes.Generated.OccupancyDetected;
  static On: typeof HomeKitTypes.Generated.On;
  static OpticalZoom: typeof HomeKitTypes.Generated.OpticalZoom;
  static OutletInUse: typeof HomeKitTypes.Generated.OutletInUse;
  static OzoneDensity: typeof HomeKitTypes.Generated.OzoneDensity;
  static PM10Density: typeof HomeKitTypes.Generated.PM10Density;
  static PM2_5Density: typeof HomeKitTypes.Generated.PM2_5Density;
  static PairSetup: typeof HomeKitTypes.Generated.PairSetup;
  static PairVerify: typeof HomeKitTypes.Generated.PairVerify;
  static PairingFeatures: typeof HomeKitTypes.Generated.PairingFeatures;
  static PairingPairings: typeof HomeKitTypes.Generated.PairingPairings;
  static PasswordSetting: typeof HomeKitTypes.Generated.PasswordSetting;
  static PictureMode: typeof HomeKitTypes.TV.PictureMode;
  static PositionState: typeof HomeKitTypes.Generated.PositionState;
  static PowerModeSelection: typeof HomeKitTypes.TV.PowerModeSelection;
  static ProgramMode: typeof HomeKitTypes.Generated.ProgramMode;
  static ProgrammableSwitchEvent: typeof HomeKitTypes.Generated.ProgrammableSwitchEvent;
  static ProductData: typeof HomeKitTypes.Generated.ProductData;
  static ProgrammableSwitchOutputState: typeof HomeKitTypes.Bridged.ProgrammableSwitchOutputState;
  static Reachable: typeof HomeKitTypes.Bridged.Reachable;
  static RelativeHumidityDehumidifierThreshold: typeof HomeKitTypes.Generated.RelativeHumidityDehumidifierThreshold;
  static RelativeHumidityHumidifierThreshold: typeof HomeKitTypes.Generated.RelativeHumidityHumidifierThreshold;
  static RelayControlPoint: typeof HomeKitTypes.Bridged.RelayControlPoint;
  static RelayEnabled: typeof HomeKitTypes.Bridged.RelayEnabled;
  static RelayState: typeof HomeKitTypes.Bridged.RelayState;
  static RemainingDuration: typeof HomeKitTypes.Generated.RemainingDuration;
  static RemoteKey: typeof HomeKitTypes.TV.RemoteKey;
  static ResetFilterIndication: typeof HomeKitTypes.Generated.ResetFilterIndication;
  static RotationDirection: typeof HomeKitTypes.Generated.RotationDirection;
  static RotationSpeed: typeof HomeKitTypes.Generated.RotationSpeed;
  static Saturation: typeof HomeKitTypes.Generated.Saturation;
  static SecuritySystemAlarmType: typeof HomeKitTypes.Generated.SecuritySystemAlarmType;
  static SecuritySystemCurrentState: typeof HomeKitTypes.Generated.SecuritySystemCurrentState;
  static SecuritySystemTargetState: typeof HomeKitTypes.Generated.SecuritySystemTargetState;
  static SelectedAudioStreamConfiguration: typeof HomeKitTypes.Remote.SelectedAudioStreamConfiguration;
  static SelectedRTPStreamConfiguration: typeof HomeKitTypes.Generated.SelectedRTPStreamConfiguration;
  static SerialNumber: typeof HomeKitTypes.Generated.SerialNumber;
  static ServiceLabelIndex: typeof HomeKitTypes.Generated.ServiceLabelIndex;
  static ServiceLabelNamespace: typeof HomeKitTypes.Generated.ServiceLabelNamespace;
  static SetDuration: typeof HomeKitTypes.Generated.SetDuration;
  static SetupDataStreamTransport: typeof HomeKitTypes.DataStream.SetupDataStreamTransport;
  static SetupEndpoints: typeof HomeKitTypes.Generated.SetupEndpoints;
  static SiriInputType: typeof HomeKitTypes.Remote.SiriInputType;
  static SlatType: typeof HomeKitTypes.Generated.SlatType;
  static SleepDiscoveryMode: typeof HomeKitTypes.TV.SleepDiscoveryMode;
  static SmokeDetected: typeof HomeKitTypes.Generated.SmokeDetected;
  static SoftwareRevision: typeof HomeKitTypes.Bridged.SoftwareRevision;
  static StatusActive: typeof HomeKitTypes.Generated.StatusActive;
  static StatusFault: typeof HomeKitTypes.Generated.StatusFault;
  static StatusJammed: typeof HomeKitTypes.Generated.StatusJammed;
  static StatusLowBattery: typeof HomeKitTypes.Generated.StatusLowBattery;
  static StatusTampered: typeof HomeKitTypes.Generated.StatusTampered;
  static StreamingStatus: typeof HomeKitTypes.Generated.StreamingStatus;
  static SulphurDioxideDensity: typeof HomeKitTypes.Generated.SulphurDioxideDensity;
  static SupportedAudioStreamConfiguration: typeof HomeKitTypes.Generated.SupportedAudioStreamConfiguration;
  static SupportedDataStreamTransportConfiguration: typeof HomeKitTypes.DataStream.SupportedDataStreamTransportConfiguration;
  static SupportedRTPConfiguration: typeof HomeKitTypes.Generated.SupportedRTPConfiguration;
  static SupportedVideoStreamConfiguration: typeof HomeKitTypes.Generated.SupportedVideoStreamConfiguration;
  static SwingMode: typeof HomeKitTypes.Generated.SwingMode;
  static TargetAirPurifierState: typeof HomeKitTypes.Generated.TargetAirPurifierState;
  static TargetAirQuality: typeof HomeKitTypes.Generated.TargetAirQuality;
  static TargetControlList: typeof HomeKitTypes.Remote.TargetControlList;
  static TargetControlSupportedConfiguration: typeof HomeKitTypes.Remote.TargetControlSupportedConfiguration;
  static TargetDoorState: typeof HomeKitTypes.Generated.TargetDoorState;
  static TargetFanState: typeof HomeKitTypes.Generated.TargetFanState;
  static TargetHeaterCoolerState: typeof HomeKitTypes.Generated.TargetHeaterCoolerState;
  static TargetHeatingCoolingState: typeof HomeKitTypes.Generated.TargetHeatingCoolingState;
  static TargetHorizontalTiltAngle: typeof HomeKitTypes.Generated.TargetHorizontalTiltAngle;
  static TargetHumidifierDehumidifierState: typeof HomeKitTypes.Generated.TargetHumidifierDehumidifierState;
  static TargetMediaState: typeof HomeKitTypes.TV.TargetMediaState;
  static TargetPosition: typeof HomeKitTypes.Generated.TargetPosition;
  static TargetRelativeHumidity: typeof HomeKitTypes.Generated.TargetRelativeHumidity;
  static TargetSlatState: typeof HomeKitTypes.Generated.TargetSlatState;
  static TargetTemperature: typeof HomeKitTypes.Generated.TargetTemperature;
  static TargetTiltAngle: typeof HomeKitTypes.Generated.TargetTiltAngle;
  static TargetVerticalTiltAngle: typeof HomeKitTypes.Generated.TargetVerticalTiltAngle;
  static TargetVisibilityState: typeof HomeKitTypes.TV.TargetVisibilityState;
  static TemperatureDisplayUnits: typeof HomeKitTypes.Generated.TemperatureDisplayUnits;
  static TimeUpdate: typeof HomeKitTypes.Bridged.TimeUpdate;
  static TunnelConnectionTimeout: typeof HomeKitTypes.Bridged.TunnelConnectionTimeout;
  static TunneledAccessoryAdvertising: typeof HomeKitTypes.Bridged.TunneledAccessoryAdvertising;
  static TunneledAccessoryConnected: typeof HomeKitTypes.Bridged.TunneledAccessoryConnected;
  static TunneledAccessoryStateNumber: typeof HomeKitTypes.Bridged.TunneledAccessoryStateNumber;
  static VOCDensity: typeof HomeKitTypes.Generated.VOCDensity;
  static ValveType: typeof HomeKitTypes.Generated.ValveType;
  static Version: typeof HomeKitTypes.Generated.Version;
  static Volume: typeof HomeKitTypes.Generated.Volume;
  static VolumeControlType: typeof HomeKitTypes.TV.VolumeControlType;
  static VolumeSelector: typeof HomeKitTypes.TV.VolumeSelector;
  static WaterLevel: typeof HomeKitTypes.Generated.WaterLevel;
  static ManuallyDisabled: typeof HomeKitTypes.Generated.ManuallyDisabled;
  static ThirdPartyCameraActive: typeof HomeKitTypes.Generated.ThirdPartyCameraActive;
  static PeriodicSnapshotsActive: typeof HomeKitTypes.Generated.PeriodicSnapshotsActive;
  static EventSnapshotsActive: typeof HomeKitTypes.Generated.EventSnapshotsActive;
  static HomeKitCameraActive: typeof HomeKitTypes.Generated.HomeKitCameraActive;
  static RecordingAudioActive: typeof HomeKitTypes.Generated.RecordingAudioActive;
  static SupportedCameraRecordingConfiguration: typeof HomeKitTypes.Generated.SupportedCameraRecordingConfiguration;
  static SupportedVideoRecordingConfiguration: typeof HomeKitTypes.Generated.SupportedVideoRecordingConfiguration;
  static SupportedAudioRecordingConfiguration: typeof HomeKitTypes.Generated.SupportedAudioRecordingConfiguration;
  static SelectedCameraRecordingConfiguration: typeof HomeKitTypes.Generated.SelectedCameraRecordingConfiguration;
  static CameraOperatingModeIndicator: typeof HomeKitTypes.Generated.CameraOperatingModeIndicator;
  static DiagonalFieldOfView: typeof HomeKitTypes.Generated.DiagonalFieldOfView;
  static NetworkClientProfileControl: typeof HomeKitTypes.Generated.NetworkClientProfileControl;
  static NetworkClientStatusControl: typeof HomeKitTypes.Generated.NetworkClientStatusControl;
  static RouterStatus: typeof HomeKitTypes.Generated.RouterStatus;
  static SupportedRouterConfiguration: typeof HomeKitTypes.Generated.SupportedRouterConfiguration;
  static WANConfigurationList: typeof HomeKitTypes.Generated.WANConfigurationList;
  static WANStatusList: typeof HomeKitTypes.Generated.WANStatusList;
  static ManagedNetworkEnable: typeof HomeKitTypes.Generated.ManagedNetworkEnable;
  static NetworkAccessViolationControl: typeof HomeKitTypes.Generated.NetworkAccessViolationControl;
  static WiFiSatelliteStatus: typeof HomeKitTypes.Generated.WiFiSatelliteStatus;
  static WakeConfiguration: typeof HomeKitTypes.Generated.WakeConfiguration;
  static SupportedTransferTransportConfiguration: typeof HomeKitTypes.Generated.SupportedTransferTransportConfiguration;
  static SetupTransferTransport: typeof HomeKitTypes.Generated.SetupTransferTransport;


  static ActivityInterval: typeof HomeKitTypes.Generated.ActivityInterval;
  static CCAEnergyDetectThreshold: typeof HomeKitTypes.Generated.CCAEnergyDetectThreshold;
  static CCASignalDetectThreshold: typeof HomeKitTypes.Generated.CCASignalDetectThreshold;
  static CharacteristicValueTransitionControl: typeof HomeKitTypes.Generated.CharacteristicValueTransitionControl;
  static SupportedCharacteristicValueTransitionConfiguration: typeof HomeKitTypes.Generated.SupportedCharacteristicValueTransitionConfiguration;
  static CharacteristicValueActiveTransitionCount: typeof HomeKitTypes.Generated.CharacteristicValueActiveTransitionCount;
  static CurrentTransport: typeof HomeKitTypes.Generated.CurrentTransport;
  static DataStreamHAPTransport: typeof HomeKitTypes.Generated.DataStreamHAPTransport;
  static DataStreamHAPTransportInterrupt: typeof HomeKitTypes.Generated.DataStreamHAPTransportInterrupt;
  static EventRetransmissionMaximum: typeof HomeKitTypes.Generated.EventRetransmissionMaximum;
  static EventTransmissionCounters: typeof HomeKitTypes.Generated.EventTransmissionCounters;
  static HeartBeat: typeof HomeKitTypes.Generated.HeartBeat;
  static MACRetransmissionMaximum: typeof HomeKitTypes.Generated.MACRetransmissionMaximum;
  static MACTransmissionCounters: typeof HomeKitTypes.Generated.MACTransmissionCounters;
  static OperatingStateResponse: typeof HomeKitTypes.Generated.OperatingStateResponse;
  static Ping: typeof HomeKitTypes.Generated.Ping;
  static ReceiverSensitivity: typeof HomeKitTypes.Generated.ReceiverSensitivity;
  static ReceivedSignalStrengthIndication: typeof HomeKitTypes.Generated.ReceivedSignalStrengthIndication;
  static SleepInterval: typeof HomeKitTypes.Generated.SleepInterval;
  static SignalToNoiseRatio: typeof HomeKitTypes.Generated.SignalToNoiseRatio;
  static SupportedDiagnosticsSnapshot: typeof HomeKitTypes.Generated.SupportedDiagnosticsSnapshot;
  static TransmitPower: typeof HomeKitTypes.Generated.TransmitPower;
  static TransmitPowerMaximum: typeof HomeKitTypes.Generated.TransmitPowerMaximum;
  static VideoAnalysisActive: typeof HomeKitTypes.Generated.VideoAnalysisActive;
  static WiFiCapabilities: typeof HomeKitTypes.Generated.WiFiCapabilities;
  static WiFiConfigurationControl: typeof HomeKitTypes.Generated.WiFiConfigurationControl;

  // NOTICE: when adding/changing properties, remember to possibly adjust the serialize/deserialize functions
  iid: Nullable<number> = null;
  value: Nullable<CharacteristicValue> = null;
  status: Status = Status.SUCCESS;
  eventOnlyCharacteristic: boolean = false;
  props: CharacteristicProps;
  private subscriptions: number = 0;

  constructor(public displayName: string, public UUID: string, props?: CharacteristicProps) {
    super();
    // @ts-ignore
    this.props = props || {
      format: null,
      unit: null,
      minValue: null,
      maxValue: null,
      minStep: null,
      perms: []
    };

    this.setProps({}); // ensure sanity checks are called
  }

  /**
   * Copies the given properties to our props member variable,
   * and returns 'this' for chaining.
   *
   * @param 'props' {
   *   format: <one of Formats>,
   *   unit: <one of Characteristic.Units>,
   *   perms: array of [Characteristic.Perms] like [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
   *   ev: <Event Notifications Enabled Boolean>, (Optional)
   *   description: <String of description>, (Optional)
   *   minValue: <minimum value for numeric characteristics>, (Optional)
   *   maxValue: <maximum value for numeric characteristics>, (Optional)
   *   minStep: <smallest allowed increment for numeric characteristics>, (Optional)
   *   maxLen: <max length of string up to 256>, (Optional default: 64)
   *   maxDataLen: <max length of data>, (Optional default: 2097152)
   *   valid-values: <array of numbers>, (Optional)
   *   valid-values-range: <array of two numbers for start and end range> (Optional)
   * }
   */
  setProps = (props: Partial<CharacteristicProps>) => {
    for (let key in (props || {}))
      if (Object.prototype.hasOwnProperty.call(props, key)) {
        // @ts-ignore
        this.props[key] = props[key];
      }

    if (this.props.minValue != null && this.props.maxValue != null) { // the eqeq instead of eqeqeq is important here
      if (this.props.minValue > this.props.maxValue) { // preventing DOS attack, see https://github.com/homebridge/HAP-NodeJS/issues/690
        this.props.minValue = undefined;
        this.props.maxValue = undefined;
        throw new Error("Error setting CharacteristicsProps for '" + this.displayName + "': 'minValue' cannot be greater or equal the 'maxValue'!");
      }
    }

    return this;
  }

  /**
   * @internal
   */
  subscribe(): void {
    if (this.subscriptions === 0) {
      this.emit(CharacteristicEventTypes.SUBSCRIBE);
    }
    this.subscriptions++;
  }

  /**
   * @internal
   */
  unsubscribe(): void {
    const wasOne = this.subscriptions === 1;
    this.subscriptions--;
    this.subscriptions = Math.max(this.subscriptions, 0);
    if (wasOne) {
      this.emit(CharacteristicEventTypes.UNSUBSCRIBE);
    }
  }

  /**
   * Updates the current value of the characteristic.
   *
   * @param callback
   * @param context
   * @param sessionId
   * @internal use to return the current value on HAP requests
   *
   * @deprecated
   */
  getValue(callback?: CharacteristicGetCallback, context?: CharacteristicEvents, sessionId?: SessionIdentifier): void {
    let session: HAPSession | undefined = undefined;
    if (sessionId) {
      session = HAPSession.getSession(sessionId)
    }

    this.handleGetRequest(session!, context!).then(value => {
      if (callback) {
        callback(null, value);
      }
    }, reason => {
      if (callback) {
        callback(reason);
      }
    });
  }

  setValue(newValue: Nullable<CharacteristicValue>, callback?: () => void, context?: CharacteristicEvents): Characteristic {
    return this.updateValue(newValue, callback, context)
  }

  updateValue(value: Nullable<CharacteristicValue>, callback?: () => void, context?: CharacteristicEvents): Characteristic {
    this.status = Status.SUCCESS;
    value = this.validateValue(value); //validateValue returns a value that has be coerced into a valid value.

    if (value == undefined) {
      value = this.getDefaultValue();
    }

    const oldValue = this.value;
    this.value = value;

    if (callback) {
      callback();
    }

    if (this.eventOnlyCharacteristic || oldValue !== value) {
      this.emit(CharacteristicEventTypes.CHANGE, { oldValue: oldValue, newValue: value, context: context });
    }

    return this; // for chaining
  }

  /**
   * Called when a HAP requests wants to know the current value of the characteristic.
   *
   * @param session - The HAP session from which the request originated from
   * @param context - events context
   * @internal Used by the Accessory to load the characteristic value
   */
  handleGetRequest(session: HAPSession, context: CharacteristicEvents): Promise<Nullable<CharacteristicValue>> {
    if (!this.props.perms.includes(Perms.PAIRED_READ)) { // check if we are allowed to read from this characteristic
      return Promise.reject(Status.WRITE_ONLY_CHARACTERISTIC);
    }

    // TODO remove this thing (maybe? doorbell people should setup event handler with null returned?)
    if (this.eventOnlyCharacteristic) {
      return Promise.resolve(null);
    }
    if (this.listeners(CharacteristicEventTypes.GET).length === 0) {
      return this.status? Promise.reject(this.status): Promise.resolve(this.value);
    }

    return new Promise((resolve, reject) => {
      this.emit(CharacteristicEventTypes.GET, once((status?: Error | Status | null, value?: Nullable<CharacteristicValue>) => {
        if (status) {
          this.status = typeof status === "number"? status: extractHAPStatusFromError(status);
          reject(this.status);
          return;
        }

        this.status = Status.SUCCESS;

        value = this.validateValue(value); // validateValue returns a value that has be coerced into a valid value.
        if (value == null) { // null or undefined
          value = this.getDefaultValue();
        }

        const oldValue = this.value;
        this.value = value;

        resolve(value);

        if (oldValue !== value) { // emit a change event if necessary
          this.emit(CharacteristicEventTypes.CHANGE, { oldValue: oldValue, newValue: value, context: context });
        }
      }), context, session);
    });
  }

  /**
   * Called when a HAP requests update the current value of the characteristic.
   *
   * @param value - The update value
   * @param session - The session from which the request originated from
   * @param context
   * @returns Promise resolve to void in normal operation. When characteristic supports write response, the
   *  HAP request requests write response and the set handler returns a write response value, the respective
   *  write response value is resolved.
   * @internal
   */
  handleSetRequest(value: CharacteristicValue, session: HAPSession, context: CharacteristicEvents): Promise<CharacteristicValue | void> {
    this.status = Status.SUCCESS;

    // TODO return proper error code if incoming value is not valid!
    value = this.validateValue(value)!; // validateValue returns a value that has be coerced into a valid value.
    const oldValue = this.value;

    if (this.listeners(CharacteristicEventTypes.SET).length === 0) {
      this.value = value;
      if (this.eventOnlyCharacteristic || oldValue !== value) {
        const change: CharacteristicChange = {
          oldValue: oldValue as CharacteristicValue,
          newValue: value as CharacteristicValue,
          context: context,
        }
        this.emit(CharacteristicEventTypes.CHANGE, change);
      }
      return Promise.resolve();
    } else {
      return new Promise((resolve, reject) => {
        this.emit(CharacteristicEventTypes.SET, value, once((status?: Error | Status | null, writeResponse?: Nullable<CharacteristicValue>) => {
          if (status) {
            this.status = typeof status === "number"? status: extractHAPStatusFromError(status);
            reject(this.status);
            return;
          }

          this.status = Status.SUCCESS;

          if (writeResponse != null && this.props.perms.includes(Perms.WRITE_RESPONSE)) {
            // support write response simply by letting the implementor pass the response as second argument to the callback
            this.value = writeResponse;
            resolve(writeResponse);
          } else {
            this.value = value;
            resolve();
          }

          if (this.eventOnlyCharacteristic || oldValue !== value) {
            this.emit(CharacteristicEventTypes.CHANGE, { oldValue: oldValue, newValue: value, context: context });
          }
        }), context, session);
      });
    }
  }

  protected getDefaultValue(): Nullable<CharacteristicValue> {
    switch (this.props.format) {
      case Formats.BOOL:
        return false;
      case Formats.STRING:
        return "";
      case Formats.DATA:
        return null; // who knows!
      case Formats.TLV8:
        return null; // who knows!
      case Formats.DICTIONARY:
        return {};
      case Formats.ARRAY:
        return [];
      default:
        return this.props.minValue || 0;
    }
  }

  private validateValue(newValue?: Nullable<CharacteristicValue>): Nullable<CharacteristicValue> {
    let isNumericType = false;
    let minValue_resolved: number | undefined = 0;
    let maxValue_resolved: number | undefined = 0;
    let minStep_resolved = undefined;
    let stepDecimals = 0;
    switch (this.props.format) {
      case Formats.INT:
        minStep_resolved = 1;
        minValue_resolved = -2147483648;
        maxValue_resolved = 2147483647;
        isNumericType = true;
        break;
      case Formats.FLOAT:
        minStep_resolved = undefined;
        minValue_resolved = undefined;
        maxValue_resolved = undefined;
        isNumericType = true;
        break;
      case Formats.UINT8:
        minStep_resolved = 1;
        minValue_resolved = 0;
        maxValue_resolved = 255;
        isNumericType = true;
        break;
      case Formats.UINT16:
        minStep_resolved = 1;
        minValue_resolved = 0;
        maxValue_resolved = 65535;
        isNumericType = true;
        break;
      case Formats.UINT32:
        minStep_resolved = 1;
        minValue_resolved = 0;
        maxValue_resolved = 4294967295;
        isNumericType = true;
        break;
      case Formats.UINT64:
        minStep_resolved = 1;
        minValue_resolved = 0;
        maxValue_resolved = 18446744073709551615;
        isNumericType = true;
        break;
      //All of the following data types return from this switch.
      case Formats.BOOL:
        // @ts-ignore
        return (newValue == true); //We don't need to make sure this returns true or false
      case Formats.STRING: {
        let myString = newValue as string || ''; //If null or undefined or anything odd, make it a blank string
        myString = String(myString);
        let maxLength = this.props.maxLen;
        if (maxLength === undefined)
          maxLength = 64; //Default Max Length is 64.
        if (myString.length > maxLength)
          myString = myString.substring(0, maxLength); //Truncate strings that are too long
        return myString; //We don't need to do any validation after having truncated the string
      }
      case Formats.DATA: {
        let maxLength = this.props.maxDataLen;
        if (maxLength === undefined)
          maxLength = 2097152; //Default Max Length is 2097152.
        //if (newValue.length>maxLength) //I don't know the best way to handle this since it's unknown binary data.
        //I suspect that it will crash HomeKit for this bridge if the length is too long.
        return newValue == undefined? null: newValue;
      }
      case Formats.TLV8:
        //Should we parse this to make sure the tlv8 is valid?
        break;
      default: //Datatype out of HAP Spec encountered. We'll assume the developer knows what they're doing.
        return newValue == undefined? null: newValue;
    }

    if (isNumericType) {
      if (newValue === false) {
        return 0;
      }
      if (newValue === true) {
        return 1;
      }
      if (isNaN(Number.parseInt(newValue as string, 10))) {
        return this.value!;
      } //This is not a number so we'll just pass out the last value.
      if ((this.props.maxValue && !isNaN(this.props.maxValue)) && (this.props.maxValue !== null))
        maxValue_resolved = this.props.maxValue;
      if ((this.props.minValue && !isNaN(this.props.minValue)) && (this.props.minValue !== null))
        minValue_resolved = this.props.minValue;
      if ((this.props.minStep && !isNaN(this.props.minStep)) && (this.props.minStep !== null))
        minStep_resolved = this.props.minStep;
      if (newValue! < minValue_resolved!)
        newValue = minValue_resolved!; //Fails Minimum Value Test
      if (newValue! > maxValue_resolved!)
        newValue = maxValue_resolved!; //Fails Maximum Value Test
      if (minStep_resolved !== undefined) {
        //Determine how many decimals we need to display
        if (Math.floor(minStep_resolved) === minStep_resolved)
          stepDecimals = 0;
        else
          stepDecimals = minStep_resolved.toString().split(".")[1].length || 0;
        //Use Decimal to determine the lowest value within the step.
        try {
          let decimalVal = new Decimal(parseFloat(newValue as string));
          const decimalDiff = decimalVal.mod(minStep_resolved);
          decimalVal = decimalVal.minus(decimalDiff);
          if (stepDecimals === 0) {
            newValue = parseInt(decimalVal.toFixed(0));
          } else {
            newValue = parseFloat(decimalVal.toFixed(stepDecimals)); //Convert it to a fixed decimal
          }
        } catch (e) {
          return this.value!; //If we had an error, return the current value.
        }
      }
      if (this.props.validValues !== undefined)
        if (!this.props.validValues.includes(newValue as number))
          return this.value!; //Fails Valid Values Test
      if (this.props.validValueRanges !== undefined) { //This is another way Apple has to handle min/max
        if (newValue! < this.props.validValueRanges[0])
          newValue = this.props.validValueRanges[0];
        if (newValue! > this.props.validValueRanges[1])
          newValue = this.props.validValueRanges[1];
      }
    }
    return newValue == undefined? null: newValue;
  }

  _assignID = (identifierCache: IdentifierCache, accessoryName: string, serviceUUID: string, serviceSubtype?: string) => {
    // generate our IID based on our UUID
    this.iid = identifierCache.getIID(accessoryName, serviceUUID, serviceSubtype, this.UUID);
  }

  /**
   * Returns a JSON representation of this Accessory suitable for delivering to HAP clients.
   * @internal
   */
  toHAP(opt?: ToHAPOptions): HapCharacteristic {
    // ensure our value fits within our constraints if present
    let value = this.value; // TODO query value for characteristics which support it

    if (this.props.minValue != null && value! < this.props.minValue)
      value = this.props.minValue;
    if (this.props.maxValue != null && value! > this.props.maxValue)
      value = this.props.maxValue;
    if (this.props.format != null) {
      if (this.props.format === Formats.INT)
        value = parseInt(value as string);
      else if (this.props.format === Formats.UINT8)
        value = parseInt(value as string);
      else if (this.props.format === Formats.UINT16)
        value = parseInt(value as string);
      else if (this.props.format === Formats.UINT32)
        value = parseInt(value as string);
      else if (this.props.format === Formats.UINT64)
        value = parseInt(value as string);
      else if (this.props.format === Formats.FLOAT) {
        value = parseFloat(value as string);
        if (this.props.minStep != null) {
          const pow = Math.pow(10, decimalPlaces(this.props.minStep));
          value = Math.round(value * pow) / pow;
        }
      }
    }
    if (this.eventOnlyCharacteristic) {
      // @ts-ignore
      value = null;
    }

    const hap: Partial<HapCharacteristic> = {
      iid: this.iid!,
      type: toShortForm(this.UUID, HomeKitTypes.BASE_UUID),
      perms: this.props.perms,
      format: this.props.format,
      value: value,
      description: this.displayName,
      // These properties used to be sent but do not seem to be used:
      //
      // events: false,
      // bonjour: false
    };
    if (this.props.validValues != null && this.props.validValues.length > 0) {
      hap['valid-values'] = this.props.validValues;
    }
    if (this.props.validValueRanges != null && this.props.validValueRanges.length > 0 && !(this.props.validValueRanges.length & 1)) {
      hap['valid-values-range'] = this.props.validValueRanges;
    }
    // extra properties
    if (this.props.unit != null)
      hap.unit = this.props.unit;
    if (this.props.maxValue != null)
      hap.maxValue = this.props.maxValue;
    if (this.props.minValue != null)
      hap.minValue = this.props.minValue;
    if (this.props.minStep != null)
      hap.minStep = this.props.minStep;
    // add maxLen if string length is > 64 bytes and trim to max 256 bytes
    if (this.props.format === Formats.STRING) {
      const str = Buffer.from(value as string, 'utf8'), len = str.byteLength;
      if (len > 256) { // 256 bytes is the max allowed length
        hap.value = str.toString('utf8', 0, 256);
        hap.maxLen = 256;
      } else if (len > 64) { // values below can be omitted
        hap.maxLen = len;
      }
    }
    // if we're not readable, omit the "value" property - otherwise iOS will complain about non-compliance
    if (this.props.perms.indexOf(Perms.PAIRED_READ) == -1)
      delete hap.value;
    // delete the "value" property anyway if we were asked to
    if (opt && opt.omitValues)
      delete hap.value;
    return hap as HapCharacteristic;
  }

  /**
   *
   * @param characteristic
   * @internal
   */
  static serialize(characteristic: Characteristic): SerializedCharacteristic {
    return {
      displayName: characteristic.displayName,
      UUID: characteristic.UUID,
      props: clone({}, characteristic.props),
      value: characteristic.value,
      eventOnlyCharacteristic: characteristic.eventOnlyCharacteristic,
    }
  };

  /**
   *
   * @param json
   * @internal
   */
  static deserialize(json: SerializedCharacteristic): Characteristic {
    const characteristic = new Characteristic(json.displayName, json.UUID, json.props);

    characteristic.value = json.value;
    characteristic.eventOnlyCharacteristic = json.eventOnlyCharacteristic;

    return characteristic;
  };

}

// Mike Samuel
// http://stackoverflow.com/questions/10454518/javascript-how-to-retrieve-the-number-of-decimals-of-a-string-number
function decimalPlaces(num: number) {
  const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) { return 0; }
  return Math.max(
       0,
       // Number of digits right of decimal point.
       (match[1] ? match[1].length : 0)
       // Adjust for scientific notation.
       - (match[2] ? +match[2] : 0));
}

const numberPattern = /^-?\d+$/;

function extractHAPStatusFromError(error: Error) {
  let errorValue = Status.SERVICE_COMMUNICATION_FAILURE;

  if (numberPattern.test(error.message)) {
    const value = parseInt(error.message);

    if (value >= Status.INSUFFICIENT_PRIVILEGES && value <= Status.NOT_ALLOWED_IN_CURRENT_STATE) {
      errorValue = value;
    }
  }

  return errorValue;
}
