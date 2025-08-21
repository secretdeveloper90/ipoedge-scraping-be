// Types for IPO Allotment Status API

export interface IPOAllotmentRequest {
  panNo: string;
  ipoName: string;
  registrar?: string;
}

export interface IPOAllotmentResponse {
  success: boolean;
  registrar: string;
  raw: any;
  status: string;
  error?: string;
  details?: string;
  allotmentDetails?: AllotmentDetails;
}

export interface AllotmentDetails {
  applicationNumber?: string;
  applicantName?: string;
  dpId?: string;
  sharesApplied?: string;
  allotmentStatus?: string;
  status: 'allotted' | 'not allotted' | 'no record found' | 'pending' | 'unknown';
}

export interface AllotmentStatus {
  applicationNumber?: string;
  applicantName?: string;
  category?: string;
  sharesApplied?: number;
  sharesAllotted?: number;
  amount?: number;
  refundAmount?: number;
  status: 'allotted' | 'not_allotted' | 'pending' | 'unknown';
}

export interface ParsedAllotmentResponse {
  success: boolean;
  registrar: string;
  raw: any;
  status: string;
  error?: string;
  details?: string;
  allotmentDetails?: AllotmentStatus;
}

export type RegistrarType =
  | 'bigshare'
  | 'kfintech'
  | 'linkintime'
  | 'skyline'
  | 'cameo'
  | 'mas'
  | 'maashitla'
  | 'beetal'
  | 'purva'
  | 'mufg';

export interface RegistrarConfig {
  name: string;
  baseUrl: string;
  method: 'GET' | 'POST';
  endpoint: string;
  requiresCompanyCode?: boolean;
  responseType: 'json' | 'html';
}
