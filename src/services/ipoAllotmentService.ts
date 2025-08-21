import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { 
  IPOAllotmentRequest, 
  IPOAllotmentResponse, 
  RegistrarType,
  RegistrarConfig 
} from '../types/ipoAllotment';

// Configure axios with default settings for registrar APIs
const apiClient: AxiosInstance = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Registrar configurations
const registrarConfigs: Record<RegistrarType, RegistrarConfig> = {
  bigshare: {
    name: 'Bigshare Services',
    baseUrl: 'https://ipo.bigshareonline.com',
    method: 'POST',
    endpoint: '/Data.aspx/FetchIpodetails',
    requiresCompanyCode: true,
    responseType: 'json'
  },
  kfintech: {
    name: 'KFintech',
    baseUrl: 'https://ris.kfintech.com',
    method: 'POST',
    endpoint: '/ipostatus/api/ipoapplicationstatus',
    responseType: 'json'
  },
  linkintime: {
    name: 'Link Intime',
    baseUrl: 'https://ipoallotment.linkintime.co.in',
    method: 'POST',
    endpoint: '/public-issues/ipostatus',
    responseType: 'json'
  },
  skyline: {
    name: 'Skyline Financial Services',
    baseUrl: 'https://www.skylinerta.com',
    method: 'GET',
    endpoint: '/ipo.php',
    responseType: 'html'
  },
  cameo: {
    name: 'Cameo Corporate Services',
    baseUrl: 'https://www.cameoindia.com',
    method: 'GET',
    endpoint: '/iporesult.html',
    responseType: 'html'
  },
  mas: {
    name: 'MAS Services',
    baseUrl: 'https://maservices.biz',
    method: 'GET',
    endpoint: '/ApplicationStatus.aspx',
    responseType: 'html'
  },
  maashitla: {
    name: 'Maashitla Securities',
    baseUrl: 'https://www.maashitla.com',
    method: 'GET',
    endpoint: '/PublicIssues/Search',
    responseType: 'html'
  },
  beetal: {
    name: 'Beetal Financial & Computer Services',
    baseUrl: 'https://www.beetalfinancial.com',
    method: 'GET',
    endpoint: '/',
    responseType: 'html'
  },
  purva: {
    name: 'Purva Sharegistry',
    baseUrl: 'https://www.purvashare.com',
    method: 'GET',
    endpoint: '/results.html',
    responseType: 'html'
  },
  mufg: {
    name: 'MUFG Intime India Private Limited',
    baseUrl: 'https://in.mpms.mufg.com',
    method: 'POST',
    endpoint: '/Initial_Offer/IPO.aspx/SearchOnPan',
    requiresCompanyCode: true,
    responseType: 'json'
  }
};

// Cache for BigShare company IDs to avoid repeated scraping
const bigshareCompanyIdCache = new Map<string, { id: string | null; timestamp: number }>();

// Cache for MUFG company IDs to avoid repeated scraping
const mufgCompanyIdCache = new Map<string, { id: string | null; timestamp: number }>();

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 1000; // Maximum number of entries to keep in cache

// Clean up expired cache entries and enforce size limit
function cleanupCache(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, value] of bigshareCompanyIdCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      bigshareCompanyIdCache.delete(key);
    }
  }

  // Enforce size limit by removing oldest entries
  if (bigshareCompanyIdCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(bigshareCompanyIdCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, bigshareCompanyIdCache.size - MAX_CACHE_SIZE);
    for (const [key] of entriesToRemove) {
      bigshareCompanyIdCache.delete(key);
    }
  }
}

// BigShare company ID lookup function
async function getBigshareCompanyId(ipoName: string): Promise<string | null> {
  const cacheKey = ipoName.toLowerCase().trim();

  // Check cache first
  const cached = bigshareCompanyIdCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached BigShare company ID for ${ipoName}: ${cached.id}`);
    return cached.id;
  }

  const urlsToTry = [
    'https://ipo.bigshareonline.com/',
    'https://ipo.bigshareonline.com/Default.aspx'
  ];

  for (const url of urlsToTry) {
    try {
      console.log(`Trying to scrape BigShare company ID from: ${url}`);
      const response = await apiClient.get(url);
      const $ = cheerio.load(response.data);

      // Look for company dropdown options with various selectors
      const selectors = [
        'select#ddlCompany option',
        'select[name="ddlCompany"] option',
        'select[id*="Company"] option',
        'select[name*="Company"] option',
        'select option[value]'
      ];

      let companyId: string | null = null;

      for (const selector of selectors) {
        const companyOptions = $(selector);
        if (companyOptions.length > 0) {
          console.log(`Found ${companyOptions.length} company options using selector: ${selector}`);

          companyOptions.each((_index, element): boolean | void => {
            const optionText = $(element).text().trim().toLowerCase();
            const optionValue = $(element).val() as string;
            const searchName = ipoName.toLowerCase().trim();

            // Skip empty values or default options
            if (!optionValue || optionValue === '0' || optionValue === '' || optionText.includes('select')) {
              return true; // continue
            }

            console.log(`Checking option: "${optionText}" (value: ${optionValue}) against search: "${searchName}"`);

            // Try exact match first
            if (optionText === searchName) {
              companyId = optionValue;
              console.log(`✓ Exact match found: ${optionText} -> ${optionValue}`);
              return false; // break the loop
            }

            // Try partial match (company name contains IPO name or vice versa)
            if (optionText.includes(searchName) || searchName.includes(optionText)) {
              companyId = optionValue;
              console.log(`✓ Partial match found: ${optionText} -> ${optionValue}`);
              return false; // break the loop
            }

            // Try fuzzy matching by removing common words and checking similarity
            const cleanOptionText = optionText.replace(/\b(limited|ltd|pvt|private|company|corp|corporation|inc|incorporated)\b/g, '').trim();
            const cleanSearchName = searchName.replace(/\b(limited|ltd|pvt|private|company|corp|corporation|inc|incorporated)\b/g, '').trim();

            if (cleanOptionText.includes(cleanSearchName) || cleanSearchName.includes(cleanOptionText)) {
              companyId = optionValue;
              console.log(`✓ Fuzzy match found: ${cleanOptionText} (from: ${optionText}) -> ${optionValue}`);
              return false; // break the loop
            }

            // Try word-by-word matching for better accuracy
            const optionWords = cleanOptionText.split(/\s+/).filter(word => word.length > 2);
            const searchWords = cleanSearchName.split(/\s+/).filter(word => word.length > 2);

            let matchingWords = 0;
            for (const searchWord of searchWords) {
              for (const optionWord of optionWords) {
                if (optionWord.includes(searchWord) || searchWord.includes(optionWord)) {
                  matchingWords++;
                  break;
                }
              }
            }

            // If more than 50% of words match, consider it a match
            if (searchWords.length > 0 && matchingWords / searchWords.length >= 0.5) {
              companyId = optionValue;
              console.log(`✓ Word-based match found: ${matchingWords}/${searchWords.length} words matched for ${optionText} -> ${optionValue}`);
              return false; // break the loop
            }
          });

          if (companyId) {
            // Cache the successful result
            bigshareCompanyIdCache.set(cacheKey, { id: companyId, timestamp: Date.now() });
            cleanupCache(); // Clean up cache after adding new entry
            return companyId;
          }
        }
      }

      if (companyId) {
        // Cache the successful result
        bigshareCompanyIdCache.set(cacheKey, { id: companyId, timestamp: Date.now() });
        return companyId;
      }
    } catch (error: any) {
      console.error(`Error fetching BigShare company ID from ${url}:`, error.message);
      continue; // try next URL
    }
  }

  console.log(`No company ID found for IPO name: ${ipoName}`);

  // Cache the result (even if null) to avoid repeated failed attempts
  bigshareCompanyIdCache.set(cacheKey, { id: null, timestamp: Date.now() });
  cleanupCache(); // Clean up cache after adding new entry
  return null;
}

// MUFG company ID lookup function
async function getMufgCompanyId(ipoName: string): Promise<string | null> {
  const cacheKey = ipoName.toLowerCase().trim();

  // Check cache first
  const cached = mufgCompanyIdCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached MUFG company ID for ${ipoName}: ${cached.id}`);
    return cached.id;
  }

  try {
    console.log(`Fetching MUFG company list for: ${ipoName}`);
    const companiesUrl = 'https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/GetDetails';

    const response = await apiClient.post(companiesUrl, {}, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.d) {
      // Decode HTML entities in the XML response
      let xmlData = response.data.d;
      // Handle both escaped and unescaped HTML entities
      xmlData = xmlData.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>');
      xmlData = xmlData.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      xmlData = xmlData.replace(/&amp;/g, '&');

      console.log('Decoded XML data sample:', xmlData.substring(0, 500));

      const $ = cheerio.load(xmlData, { xmlMode: true });

      // Look for company in the XML response
      const tables = $('Table');
      let companyId: string | null = null;

      console.log(`Searching for "${ipoName}" in ${tables.length} companies`);

      for (let i = 0; i < tables.length; i++) {
        const element = tables.eq(i);
        const companyName = element.find('companyname').text();
        const companyIdText = element.find('company_id').text();
        const searchName = ipoName.toLowerCase().trim();
        const companyNameLower = companyName.toLowerCase().trim();

        console.log(`Checking company: "${companyName}" (ID: ${companyIdText})`);

        // Skip empty entries
        if (!companyName || !companyIdText) continue;

        // Try different matching strategies similar to BigShare
        const normalizedSearch = searchName.replace(/[^a-z0-9]/g, '');
        const normalizedCompany = companyNameLower.replace(/[^a-z0-9]/g, '');

        if (companyNameLower.includes(searchName) ||
            searchName.includes(companyNameLower) ||
            normalizedCompany.includes(normalizedSearch) ||
            normalizedSearch.includes(normalizedCompany) ||
            companyName.toLowerCase().indexOf(searchName) !== -1) {
          companyId = companyIdText;
          console.log(`Found MUFG company ID for "${ipoName}": ${companyId} (matched with "${companyName}")`);
          break;
        }
      }

      if (companyId) {
        // Cache the successful result
        mufgCompanyIdCache.set(cacheKey, { id: companyId, timestamp: Date.now() });
        cleanupMufgCache();
        return companyId;
      }
    }
  } catch (error: any) {
    console.error(`Error fetching MUFG company ID:`, error.message);
  }

  console.log(`No MUFG company ID found for IPO name: ${ipoName}`);

  // Cache the result (even if null) to avoid repeated failed attempts
  mufgCompanyIdCache.set(cacheKey, { id: null, timestamp: Date.now() });
  cleanupMufgCache();
  return null;
}

// Clean up MUFG cache
function cleanupMufgCache(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, value] of mufgCompanyIdCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      mufgCompanyIdCache.delete(key);
    }
  }

  // Enforce size limit by removing oldest entries
  if (mufgCompanyIdCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(mufgCompanyIdCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, mufgCompanyIdCache.size - MAX_CACHE_SIZE);
    for (const [key] of entriesToRemove) {
      mufgCompanyIdCache.delete(key);
    }
  }
}

// Bigshare checker
async function checkBigshare({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs.bigshare;
  const url = `${config.baseUrl}${config.endpoint}`;

  // First, try to get the company ID by scraping
  let companyCode = ipoName;

  // Check if ipoName is already a numeric ID
  if (!/^\d+$/.test(ipoName)) {
    const scrapedCompanyId = await getBigshareCompanyId(ipoName);
    if (scrapedCompanyId) {
      companyCode = scrapedCompanyId;
    }
  }

  const body = {
    Applicationno: '',
    Company: companyCode, // Use scraped company code or original if numeric
    SelectionType: 'PN',
    PanNo: panNo,
    txtcsdl: '',
    txtDPID: '',
    txtClId: '',
    ddlType: '0',
    lang: 'en'
  };

  try {
    const response: AxiosResponse = await apiClient.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    let parsed;
    try {
      parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } catch {
      parsed = response.data;
    }

    // Parse BigShare response to determine allotment status
    let allotmentStatus = 'unknown';
    let allotmentDetails = null;

    if (parsed && parsed.d) {
      const data = parsed.d;

      // Check if there's any application data
      if (data.APPLICATION_NO && data.APPLICATION_NO !== '' && data.DPID !== 'No data found') {
        // Application found, check allotment status
        const allotedValue = data.ALLOTED || '';

        if (allotedValue.toLowerCase().includes('allot') && !allotedValue.toLowerCase().includes('non')) {
          allotmentStatus = 'Allotted';
        } else if (allotedValue.toLowerCase().includes('non-allot') || allotedValue.toLowerCase().includes('not allot')) {
          allotmentStatus = 'Not Allotted';
        } else {
          allotmentStatus = 'Pending'; // Status unclear
        }

        allotmentDetails = {
          applicationNumber: data.APPLICATION_NO,
          applicantName: data.Name,
          dpId: data.DPID,
          sharesApplied: data.APPLIED,
          allotmentStatus: allotedValue,
          status: allotmentStatus as 'allotted' | 'not allotted' | 'no record found'
        };
      } else {
        // No application data found
        allotmentStatus = 'No Record Found';
      }
    }

    return {
      success: true,
      registrar: 'bigshare',
      status: allotmentStatus,
      allotmentDetails: allotmentDetails || undefined,
      raw: parsed, // Keep raw data for debugging if needed
      details: companyCode !== ipoName ? `Used company ID: ${companyCode}` : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      registrar: 'bigshare',
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}

// KFintech checker
async function checkKfintech({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs.kfintech;
  const url = `${config.baseUrl}${config.endpoint}`;
  
  const body = { PAN: panNo, IPOName: ipoName };

  try {
    const response: AxiosResponse = await apiClient.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    let parsed;
    try { 
      parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data; 
    } catch { 
      parsed = response.data; 
    }

    return { 
      success: true, 
      registrar: 'kfintech', 
      raw: parsed, 
      status: parsed?.status || 'check_raw' 
    };
  } catch (error: any) {
    return {
      success: false,
      registrar: 'kfintech',
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}

// Link Intime checker
async function checkLinkIntime({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs.linkintime;
  const url = `${config.baseUrl}${config.endpoint}`;
  
  const body = { pan: panNo, issueName: ipoName };

  try {
    const response: AxiosResponse = await apiClient.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });

    let parsed;
    try { 
      parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data; 
    } catch { 
      parsed = response.data; 
    }

    return { 
      success: true, 
      registrar: 'linkintime', 
      raw: parsed, 
      status: parsed?.status || 'check_raw' 
    };
  } catch (error: any) {
    return {
      success: false,
      registrar: 'linkintime',
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}

// MUFG checker
async function checkMufg({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs.mufg;

  try {
    // Get company ID using the lookup function (similar to BigShare)
    let companyId = await getMufgCompanyId(ipoName);

    // If no company ID found and ipoName is numeric, use it directly
    if (!companyId && /^\d+$/.test(ipoName)) {
      companyId = ipoName;
      console.log(`Using provided numeric IPO name as company ID: ${companyId}`);
    }

    // If still no company ID found, return error
    if (!companyId) {
      return {
        success: false,
        registrar: 'mufg',
        raw: null,
        status: 'error',
        error: `No company found for IPO name: ${ipoName}`
      };
    }

    // Generate token (simplified version)
    const tokenUrl = `${config.baseUrl}/Initial_Offer/IPO.aspx/generateToken`;
    let token = '';

    try {
      const tokenResponse = await apiClient.post(tokenUrl, {}, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      token = tokenResponse.data.d || '';
    } catch (error) {
      console.log('Could not generate token, proceeding without it');
    }

    // Search for allotment status
    const searchUrl = `${config.baseUrl}${config.endpoint}`;
    const searchBody = {
      clientid: companyId,
      PAN: panNo,
      IFSC: '',
      CHKVAL: '1', // 1 for PAN search
      token: token
    };

    const response = await apiClient.post(searchUrl, JSON.stringify(searchBody), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    let parsed;
    try {
      parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } catch {
      parsed = response.data;
    }

    // Parse MUFG response to determine allotment status
    let allotmentStatus = 'unknown';
    let allotmentDetails = null;

    if (parsed && parsed.d) {
      const $ = cheerio.load(parsed.d);

      // Look for application data in Table elements
      const applications = $('Table');

      if (applications.length > 0) {
        // Take the first application result
        const firstApp = applications.eq(0);
        const allotted = firstApp.find('ALLOT').text();
        const sharesApplied = firstApp.find('SHARES').text();
        const applicantName = firstApp.find('NAME1').text();
        const applicationCategory = firstApp.find('PEMNDG').text();
        const dpClientId = firstApp.find('DPCLITID').text();

        // Determine allotment status
        if (allotted && parseInt(allotted) > 0) {
          allotmentStatus = 'Allotted';
        } else if (allotted === '0' || allotted === '') {
          allotmentStatus = 'Not Allotted';
        } else {
          allotmentStatus = 'Pending';
        }

        allotmentDetails = {
          applicationNumber: dpClientId || applicationCategory,
          applicantName: applicantName,
          dpId: dpClientId,
          sharesApplied: sharesApplied,
          allotmentStatus: allotted === '0' ? 'Not Allotted' : `${allotted} shares allotted`,
          status: allotmentStatus as 'allotted' | 'not allotted' | 'no record found'
        };
      } else {
        // Check for error messages in Table1
        const errorMessages = $('Table1');
        if (errorMessages.length > 0) {
          const errorMsg = errorMessages.find('Msg').text();
          if (errorMsg) {
            allotmentStatus = 'No Record Found';
          }
        } else {
          allotmentStatus = 'No Record Found';
        }
      }
    }

    return {
      success: true,
      registrar: 'mufg',
      status: allotmentStatus,
      allotmentDetails: allotmentDetails || undefined,
      raw: parsed,
      details: companyId !== ipoName ? `Used company ID: ${companyId}` : undefined
    };

  } catch (error: any) {
    return {
      success: false,
      registrar: 'mufg',
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}

// Generic HTML-based checker for other registrars
async function checkHtmlRegistrar(
  registrar: RegistrarType,
  { panNo, ipoName }: IPOAllotmentRequest
): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs[registrar];
  let url = `${config.baseUrl}${config.endpoint}`;

  // For Maashitla, add query parameters
  if (registrar === 'maashitla') {
    url += `?company=${encodeURIComponent(ipoName)}&search=${encodeURIComponent(panNo)}`;
  }

  try {
    const response: AxiosResponse = await apiClient.get(url);
    const html = response.data;

    return {
      success: true,
      registrar,
      raw: html,
      status: 'parse_needed'
    };
  } catch (error: any) {
    return {
      success: false,
      registrar,
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}

// Main dispatcher function
const registrarCheckers: Record<RegistrarType, (req: IPOAllotmentRequest) => Promise<IPOAllotmentResponse>> = {
  bigshare: checkBigshare,
  kfintech: checkKfintech,
  linkintime: checkLinkIntime,
  skyline: (req) => checkHtmlRegistrar('skyline', req),
  cameo: (req) => checkHtmlRegistrar('cameo', req),
  mas: (req) => checkHtmlRegistrar('mas', req),
  maashitla: (req) => checkHtmlRegistrar('maashitla', req),
  beetal: (req) => checkHtmlRegistrar('beetal', req),
  purva: (req) => checkHtmlRegistrar('purva', req),
  mufg: checkMufg
};

export class IPOAllotmentService {
  // Check specific registrar
  static async checkRegistrar(
    registrar: RegistrarType, 
    request: IPOAllotmentRequest
  ): Promise<IPOAllotmentResponse> {
    const checker = registrarCheckers[registrar];
    if (!checker) {
      return {
        success: false,
        registrar,
        raw: null,
        status: 'error',
        error: `Unknown registrar: ${registrar}`
      };
    }
    
    return await checker(request);
  }

  // Check all registrars sequentially
  static async checkAllRegistrars(request: IPOAllotmentRequest): Promise<IPOAllotmentResponse[]> {
    const results: IPOAllotmentResponse[] = [];
    
    for (const [registrar, checker] of Object.entries(registrarCheckers)) {
      try {
        const result = await checker(request);
        results.push(result);
        
        // If we get a successful result with meaningful data, we might want to stop
        // For now, we'll continue checking all registrars
      } catch (error: any) {
        results.push({
          success: false,
          registrar: registrar as RegistrarType,
          raw: null,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Get list of supported registrars
  static getSupportedRegistrars(): RegistrarConfig[] {
    return Object.entries(registrarConfigs).map(([key, config]) => ({
      ...config,
      name: key
    }));
  }

  // Clear BigShare company ID cache
  static clearBigshareCache(): void {
    bigshareCompanyIdCache.clear();
    console.log('BigShare company ID cache cleared');
  }

  // Clean up expired cache entries
  static cleanupBigshareCache(): void {
    cleanupCache();
    console.log('BigShare company ID cache cleaned up');
  }

  // Get BigShare cache stats
  static getBigshareCache(): { size: number; entries: Array<{ ipoName: string; companyId: string | null; age: number }> } {
    const entries = Array.from(bigshareCompanyIdCache.entries()).map(([key, value]) => ({
      ipoName: key,
      companyId: value.id,
      age: Date.now() - value.timestamp
    }));

    return {
      size: bigshareCompanyIdCache.size,
      entries
    };
  }

  // Clear MUFG company ID cache
  static clearMufgCache(): void {
    mufgCompanyIdCache.clear();
    console.log('MUFG company ID cache cleared');
  }

  // Clean up expired MUFG cache entries
  static cleanupMufgCache(): void {
    cleanupMufgCache();
    console.log('MUFG company ID cache cleaned up');
  }

  // Get MUFG cache stats
  static getMufgCache(): { size: number; entries: Array<{ ipoName: string; companyId: string | null; age: number }> } {
    const entries = Array.from(mufgCompanyIdCache.entries()).map(([key, value]) => ({
      ipoName: key,
      companyId: value.id,
      age: Date.now() - value.timestamp
    }));

    return {
      size: mufgCompanyIdCache.size,
      entries
    };
  }
}
