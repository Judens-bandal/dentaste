export enum EToothCondition {
  PRESENT = 'pres',
  DECAYED = 'dec',
  MISSING_CARIES = 'mc',
  MISSING_OTHER = 'mo',
  IMPACTED = 'imp',
  SUPERNUMERARY = 'sp',
  ROOT_FRAGMENT = 'rf',
  UNERUPTED = 'un',
  AMALGAM = 'am',
  COMPOSITE = 'co',
  JACKET_CROWN = 'jc',
  ABUTMENT = 'ab',
  ATTACHMENT = 'att',
  PONTIC = 'p',
  INLAY = 'in',
  IMPLANT = 'ipl',
  SEALANT = 'sl',
  REMOVABLE_DENTURE = 'rm',
  EXTRACTION_CARIES = 'x',
  EXTRACTION_OTHER = 'xo',
}

export enum EPeriodontalScreening {
  GINGIVITIS = 'gnvts',
  EARLY_PERIODONTITIS = 'eperio',
  MODERATE_PERIODONTITIS = 'mperio',
  ADVANCED_PERIODONTITIS = 'aperio',
}

export enum EOcclusion {
  CLASS_MOLAR = 'class',
  OVERJET = 'ovjt',
  OVERBITE = 'ovbt',
  MIDLINE_DEVIATION = 'mdev',
  CROSSBITE = 'xbite',
}

export enum EAppliance {
  ORTHODONTIC = 'ortho',
  STAYPLATE = 'stpl',
  OTHERS = 'oth',
}

export enum ETmd {
  CLENCHING = 'clch',
  CLICKING = 'clk',
  TRISMUS = 'trms',
  MUSCLE_SPASM = 'mspasm',
}

export enum EXrayType {
  PERIAPICAL = 'peri',
  PANORAMIC = 'pano',
  CEPHALOMETRIC = 'ceph',
  OCCLUSAL = 'occl',
  OTHERS = 'oth',
}
