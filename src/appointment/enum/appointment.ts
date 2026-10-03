export enum EBranch {
  UEP_MAIN = 'UEP_MAIN',
  CATUBIG = 'CATUBIG',
  CALBAYOG = 'CALBAYOG',
}

export enum EStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
export enum EDentalService {
  Braces = 'braces',
  OralProphylaxis = 'oral_prophylaxis',
  Dentures = 'dentures',
  Gingivectomy = 'gingivectomy',
  JacketCrown = 'jacket_crown',
  FixedBridge = 'fixed_bridge',
  Odontectomy = 'odontectomy',
  OralCheckUp = 'oral_check_up',
  RootCanalTreatment = 'root_canal_treatment',
  TeethWhitening = 'teeth_whitening',
  ToothExtraction = 'tooth_extraction',
  ToothRestoration = 'tooth_restoration',
  Veneers = 'veneers',
  Other = 'other',
}
export function isValidService(
  service: EDentalService | string,
  serviceOther?: string,
): boolean {
  if (String(service) === EDentalService.Other) return !!serviceOther?.trim();
  return !serviceOther; // other services shouldn't carry free text
}
export interface TAppointmentServiceEntry {
  service: EDentalService;
  service_type?: string; // only when SERVICE_TYPE_MAP has this service
  service_other?: string; // only when service === Other
  tooth_numbers?: number[]; // optional, if you want to tie a service to specific teeth
}

export enum EBraceType {
  Conventional = 'conventional',
  SelfLigating = 'self_ligating',
  Ceramic = 'ceramic',
  ClearAligners = 'clear_aligners',
}

export enum EDentureType {
  Partial = 'partial',
  Complete = 'complete',
}

export enum EOdontectomyType {
  NonImpacted = 'non_impacted',
  Impacted = 'impacted',
}

export enum EToothExtractionType {
  Anterior = 'anterior',
  Premolar = 'premolar',
  Molar = 'molar',
}

export enum EVeneerType {
  DirectComposite = 'direct_composite',
  EMax = 'e_max',
  Zirconia = 'zirconia',
}

// services that require a mini-enum sub-choice
export const SERVICE_TYPE_MAP: Partial<
  Record<EDentalService, Record<string, string>>
> = {
  [EDentalService.Braces]: EBraceType,
  [EDentalService.Dentures]: EDentureType,
  [EDentalService.Odontectomy]: EOdontectomyType,
  [EDentalService.ToothExtraction]: EToothExtractionType,
  [EDentalService.Veneers]: EVeneerType,
};

export function isValidServiceType(
  service?: EDentalService | string,
  serviceType?: string,
): boolean {
  if (!service) return !serviceType;
  if (String(service) === EDentalService.Other) return !serviceType;

  const allowed = SERVICE_TYPE_MAP[String(service) as EDentalService];
  if (!allowed) return !serviceType; // services without sub-choices must not receive one
  if (!serviceType) return false; // services with sub-choices require one
  return Object.values(allowed).includes(serviceType);
}

// export function getTreatmentLabel(
//   service: EDentalService,
//   serviceType?: string,
// ): string {
//   const serviceLabel = service.replace(/_/g, ' ');
//   return serviceType
//     ? `${serviceType.replace(/_/g, ' ')} ${serviceLabel}`
//     : serviceLabel;
// }

// common/enums.ts
export enum EAppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum EPaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
}

export function isValidServiceEntry(entry: TAppointmentServiceEntry): boolean {
  if (!isValidService(entry.service, entry.service_other)) return false;
  return isValidServiceType(entry.service, entry.service_type);
}

export function isValidServices(entries: TAppointmentServiceEntry[]): boolean {
  return entries.length > 0 && entries.every(isValidServiceEntry);
}

export function getTreatmentLabel(
  service: EDentalService | string,
  serviceType?: string,
  serviceOther?: string,
): string {
  if (String(service) === EDentalService.Other) {
    return serviceOther?.trim() || 'Other';
  }
  const serviceLabel = String(service).replace(/_/g, ' ');
  return serviceType
    ? `${serviceType.replace(/_/g, ' ')} ${serviceLabel}`
    : serviceLabel;
}
