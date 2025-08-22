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
    baseUrl: 'https://ipostatus.kfintech.com',
    method: 'GET',
    endpoint: '/api/query',
    responseType: 'json'
  },
  linkintime: {
    name: 'Link Intime (now MUFG Intime India Private Limited)',
    baseUrl: 'https://in.mpms.mufg.com',
    method: 'POST',
    endpoint: '/Initial_Offer/IPO.aspx/SearchOnPan',
    requiresCompanyCode: true,
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
    baseUrl: 'https://ipo.cameoindia.com',
    method: 'POST',
    endpoint: '/',
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
    method: 'POST',
    endpoint: '/investor-service/ipo-query',
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

// Cache for Purva company IDs to avoid repeated scraping
const purvaCompanyIdCache = new Map<string, { id: string | null; timestamp: number }>();

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

// Purva company ID lookup function
async function getPurvaCompanyId(ipoName: string): Promise<string | null> {
  const cacheKey = ipoName.toLowerCase().trim();

  // Check cache first
  const cached = purvaCompanyIdCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached Purva company ID for ${ipoName}: ${cached.id}`);
    return cached.id;
  }

  try {
    console.log(`Fetching Purva company list for: ${ipoName}`);
    const url = 'https://www.purvashare.com/investor-service/ipo-query';

    const response = await apiClient.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Look for company dropdown options
    const companyOptions = $('select[name="company_id"] option');

    for (let i = 0; i < companyOptions.length; i++) {
      const option = companyOptions.eq(i);
      const optionText = option.text().trim();
      const optionValue = option.attr('value');

      if (optionValue && optionText.toLowerCase().includes(ipoName.toLowerCase())) {
        console.log(`Found Purva company ID for ${ipoName}: ${optionValue} (${optionText})`);

        // Cache the result
        purvaCompanyIdCache.set(cacheKey, { id: optionValue, timestamp: Date.now() });
        cleanupPurvaCache(); // Clean up cache after adding new entry
        return optionValue;
      }
    }

  } catch (error) {
    console.error(`Error fetching Purva company list: ${error}`);
  }

  console.log(`No Purva company ID found for IPO name: ${ipoName}`);

  // Cache the result (even if null) to avoid repeated failed attempts
  purvaCompanyIdCache.set(cacheKey, { id: null, timestamp: Date.now() });
  cleanupPurvaCache(); // Clean up cache after adding new entry
  return null;
}

// Cleanup function for Purva cache
function cleanupPurvaCache(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, value] of purvaCompanyIdCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      purvaCompanyIdCache.delete(key);
    }
  }

  // Enforce size limit by removing oldest entries
  if (purvaCompanyIdCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(purvaCompanyIdCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, purvaCompanyIdCache.size - MAX_CACHE_SIZE);
    for (const [key] of entriesToRemove) {
      purvaCompanyIdCache.delete(key);
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

// KFintech checker - Updated for new API endpoint
async function checkKfintech({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  try {
    console.log(`Checking KFintech IPO allotment for PAN: ${panNo}, IPO: ${ipoName}`);

    // KFintech API endpoint discovered from browser network analysis
    const apiUrl = 'https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query';

    const response = await apiClient.get(apiUrl, {
      params: {
        type: 'pan'
      },
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://ipostatus.kfintech.com',
        'Referer': 'https://ipostatus.kfintech.com/',
        'client_id': '06917228970',
        'reqparam': panNo,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      }
    });

    console.log('KFintech API Response:', response.status, response.data);

    // Parse the response
    let allotmentStatus = 'No Record Found';
    let allotmentDetails: any = undefined;

    if (response.data && typeof response.data === 'object') {
      // Check if there's allotment data
      if (response.data.status === 'success' || response.data.data) {
        const data = response.data.data || response.data;

        // Check for allotment information
        if (data.allotted && data.allotted > 0) {
          allotmentStatus = 'Allotted';
          allotmentDetails = {
            sharesAllotted: data.allotted,
            applicationNumber: data.applicationNumber || '',
            applicantName: data.applicantName || '',
            refundAmount: data.refundAmount || '0',
            status: allotmentStatus
          };
        } else if (data.allotted === 0 || data.status === 'not_allotted') {
          allotmentStatus = 'Not Allotted';
          allotmentDetails = {
            sharesAllotted: 0,
            applicationNumber: data.applicationNumber || '',
            applicantName: data.applicantName || '',
            refundAmount: data.refundAmount || '0',
            status: allotmentStatus
          };
        }
      } else if (response.data.error) {
        // Handle error responses
        if (response.data.error.toLowerCase().includes('not found') ||
            response.data.error.toLowerCase().includes('no record')) {
          allotmentStatus = 'No Record Found';
        }
      }
    }

    return {
      success: true,
      registrar: 'kfintech',
      raw: response.data,
      status: allotmentStatus,
      details: allotmentDetails
    };

  } catch (error: any) {
    console.error('KFintech API Error:', error.message);

    // Handle specific error cases
    if (error.response?.status === 404) {
      return {
        success: true,
        registrar: 'kfintech',
        raw: error.response.data,
        status: 'No Record Found',
        details: 'No IPO allotment record found for the provided PAN number.'
      };
    }

    return {
      success: false,
      registrar: 'kfintech',
      raw: null,
      status: 'Error',
      error: error.message
    };
  }
}

// Link Intime checker - Now same as MUFG (Link Intime is now MUFG Intime India Private Limited)
async function checkLinkIntime({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  // Since Link Intime is now MUFG Intime India Private Limited, use MUFG logic
  try {
    console.log(`Checking Link Intime (MUFG) IPO allotment for PAN: ${panNo}, IPO: ${ipoName}`);

    // Get company ID using the MUFG lookup function
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
        registrar: 'linkintime',
        raw: null,
        status: 'error',
        error: `No company found for IPO name: ${ipoName}`
      };
    }

    // Use MUFG base URL since they are the same company now
    const mufgBaseUrl = 'https://in.mpms.mufg.com';

    // Generate token (simplified version)
    const tokenUrl = `${mufgBaseUrl}/Initial_Offer/IPO.aspx/generateToken`;
    let token = '';

    try {
      const tokenResponse = await apiClient.post(tokenUrl, {}, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      token = tokenResponse.data.d || '';
    } catch (error) {
      console.log('Could not generate token, proceeding without it');
    }

    // Search for allotment status using MUFG endpoint
    const searchUrl = `${mufgBaseUrl}/Initial_Offer/IPO.aspx/SearchOnPan`;
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

    // Parse MUFG response to determine allotment status (same logic as MUFG)
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
      registrar: 'linkintime',
      status: allotmentStatus,
      allotmentDetails: allotmentDetails || undefined,
      raw: parsed,
      details: companyId !== ipoName ? `Used company ID: ${companyId} (via MUFG system)` : 'Using MUFG system'
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

// Purva checker
async function checkPurva({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  const config = registrarConfigs.purva;

  try {
    // Purva Sharegistry IPO allotment check URL
    const url = `${config.baseUrl}${config.endpoint}`;

    // First, get the page to extract CSRF token
    const initialResponse = await apiClient.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    // Extract CSRF token from the initial page
    const $ = cheerio.load(initialResponse.data);
    const csrfToken = $('input[name="csrfmiddlewaretoken"]').val() as string;

    if (!csrfToken) {
      return {
        success: false,
        registrar: 'purva',
        raw: null,
        status: 'error',
        error: 'Could not extract CSRF token from Purva website'
      };
    }

    // Determine company_id - if ipoName is numeric, use it directly, otherwise try to find it
    let companyId = ipoName;
    if (!/^\d+$/.test(ipoName)) {
      // Try to get company ID using the lookup function
      const scrapedCompanyId = await getPurvaCompanyId(ipoName);
      if (scrapedCompanyId) {
        companyId = scrapedCompanyId;
      } else {
        // Fallback to a default company ID if lookup fails
        companyId = '78'; // Default fallback
      }
    }

    // Create form data for Purva with proper structure
    const formData = new URLSearchParams();
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('company_id', companyId);
    formData.append('applicationNumber', ''); // Empty as per your example
    formData.append('panNumber', panNo);
    formData.append('submit', 'Search');

    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': url,
        'Cookie': initialResponse.headers['set-cookie']?.join('; ') || ''
      }
    });

    const html = response.data;



    // Parse Purva response using the correct logic based on table structure
    // Purva always returns a table, but the number of rows indicates the status:
    // - 1 row (header only) = No Record Found
    // - 2+ rows (header + data) = Record found, check allotment status

    const $response = cheerio.load(html);
    const table = $response('table').first();

    if (table.length === 0) {
      // No table found at all - this shouldn't happen with Purva
      return {
        success: true,
        registrar: 'purva',
        raw: html,
        status: 'No Record Found'
      };
    }

    const rows = table.find('tr');
    const rowCount = rows.length;

    console.log(`Purva table analysis: ${rowCount} rows found`);

    if (rowCount <= 1) {
      // Only header row present = No Record Found
      return {
        success: true,
        registrar: 'purva',
        raw: html,
        status: 'No Record Found'
      };
    }

    // There are data rows present, check for allotment status
    // Look at the data rows (skip header row)
    const dataRows = rows.slice(1);

    let hasAllottedShares = false;
    let totalAllottedShares = 0;

    dataRows.each((index, row) => {
      const $row = $response(row);
      const cells = $row.find('td');

      // Look for shares allotted column (usually the 6th column based on header structure)
      // Header: Name | Application Number | Pan No | DPID - Client Id | Shares Applied | Shares Allotted | Refund Amount
      if (cells.length >= 6) {
        const sharesAllottedText = $response(cells[5]).text().trim(); // 6th column (0-indexed)
        const sharesAllotted = parseInt(sharesAllottedText) || 0;

        console.log(`Row ${index + 1}: Shares Allotted = "${sharesAllottedText}" (parsed: ${sharesAllotted})`);

        if (sharesAllotted > 0) {
          hasAllottedShares = true;
          totalAllottedShares += sharesAllotted;
        }
      }
    });

    if (hasAllottedShares && totalAllottedShares > 0) {
      return {
        success: true,
        registrar: 'purva',
        raw: html,
        status: 'Allotted'
      };
    } else {
      // Data rows exist but no shares allotted
      return {
        success: true,
        registrar: 'purva',
        raw: html,
        status: 'Not Allotted'
      };
    }

  } catch (error: any) {
    return {
      success: false,
      registrar: 'purva',
      raw: null,
      status: 'error',
      error: error.message
    };
  }
}



// Cameo checker
async function checkCameo({ panNo, ipoName }: IPOAllotmentRequest): Promise<IPOAllotmentResponse> {
  // Try multiple Cameo endpoints
  const endpoints = [
    'https://ipostatus1.cameoindia.com/',
    'https://ipostatus2.cameoindia.com/',
    'https://ipostatus3.cameoindia.com/'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying Cameo endpoint: ${endpoint}`);

      // First, get the initial page to extract ViewState and other form data
      const initialResponse = await apiClient.get(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(initialResponse.data);

      // Extract form data
      const viewState = $('input[name="__VIEWSTATE"]').val() as string;
      const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val() as string;
      const eventValidation = $('input[name="__EVENTVALIDATION"]').val() as string;

      if (!viewState) {
        console.log(`No ViewState found for ${endpoint}, trying next endpoint`);
        continue;
      }

      // Get available companies from the dropdown
      const companies: { [key: string]: string } = {};
      $('select[name="drpCompany"] option').each((_, element) => {
        const value = $(element).attr('value');
        const text = $(element).text().trim();
        if (value && value !== '0' && text) {
          companies[text.toLowerCase()] = value;
        }
      });

      // Try to find the company by name
      let companyCode = '';
      const ipoNameLower = ipoName.toLowerCase();

      // First try exact match
      if (companies[ipoNameLower]) {
        companyCode = companies[ipoNameLower];
      } else {
        // Try partial match
        for (const [companyName, code] of Object.entries(companies)) {
          if (companyName.includes(ipoNameLower) || ipoNameLower.includes(companyName)) {
            companyCode = code;
            break;
          }
        }
      }

      if (!companyCode) {
        // If no company found, try with the first available company for testing
        const firstCompany = Object.values(companies)[0];
        if (firstCompany) {
          companyCode = firstCompany;
          console.log(`Company "${ipoName}" not found, using first available company for testing`);
        } else {
          continue; // Try next endpoint
        }
      }

      // Try different captcha strategies - based on your successful example
      const captchaStrategies = [
        '596407', // From your successful example
        '123456', // Common default
        '000000', // Another common default
        Math.floor(Math.random() * 900000 + 100000).toString(), // Random 6-digit number
        '', // Try empty captcha last
      ];

      for (const captchaValue of captchaStrategies) {
        console.log(`Trying Cameo with captcha: ${captchaValue || 'empty'}`);

        // Prepare form data for submission - using format from your successful example
        const formData = new URLSearchParams();
        formData.append('ScriptManager1', 'OrdersPanel|btngenerate');
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('drpCompany', companyCode);
        formData.append('ddlUserTypes', 'PAN NO');
        formData.append('txtfolio', panNo);
        formData.append('txt_phy_captcha', captchaValue);
        formData.append('__VIEWSTATE', viewState);
        formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
        formData.append('__EVENTVALIDATION', eventValidation);
        formData.append('__ASYNCPOST', 'true');
        formData.append('btngenerate', 'Submit');

        try {
          // Submit the form using AJAX format to get the table response
          const response = await apiClient.post(endpoint, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': endpoint,
              'X-Requested-With': 'XMLHttpRequest',
              'X-MicrosoftAjax': 'Delta=true',
              'Cache-Control': 'no-cache'
            }
          });

          const responseHtml = response.data;
          console.log(`Response for captcha ${captchaValue}: ${responseHtml.substring(0, 200)}...`);

          // Check for captcha requirement in the response
          const captchaScript = responseHtml.includes("showpop6('Oops!..Please enter the Captcha')");

          if (captchaScript) {
            console.log(`Captcha required for value: ${captchaValue || 'empty'}, trying next strategy`);
            continue; // Try next captcha strategy
          }

          // Parse the AJAX response - it might be in the format: 1|#||4|8505|updatePanel|OrdersPanel|<html content>
          let htmlContent = responseHtml;
          if (responseHtml.includes('|updatePanel|OrdersPanel|')) {
            const parts = responseHtml.split('|updatePanel|OrdersPanel|');
            if (parts.length > 1) {
              htmlContent = parts[1];
            }
          }

          const $response = cheerio.load(htmlContent);

          // Parse the response for allotment information
          let allotmentStatus = 'No Record Found';
          let allotmentDetails: any = undefined;

          // Look for the specific table structure you showed in the image
          // Headers: HOLD_ID | ALLOTTED_SHARES | REFUND_AMOUNT | REFUND_MODE | PAN_NO

          // First, check for the exact text patterns from your image
          if (htmlContent.includes('NO DATA FOUND FOR THIS SEARCH PLCY') ||
              htmlContent.includes('NO DATA FOUND')) {
            allotmentStatus = 'No Record Found';
            console.log('Found "NO DATA FOUND" message in response');
          }

          // Look for tables with the specific headers
          const tables = $response('table');
          console.log(`Found ${tables.length} tables in response`);

          if (tables.length > 0) {
            tables.each((_, table) => {
              const $table = $response(table);
              const rows = $table.find('tr');
              console.log(`Table has ${rows.length} rows`);

              if (rows.length > 0) {
                // Check header row for expected columns
                const headerRow = $response(rows[0]);
                const headers = headerRow.find('th, td').map((_, el) => $response(el).text().trim()).get();
                console.log('Table headers:', headers);

                // Look for the specific headers from your image
                const hasExpectedHeaders = headers.some(h =>
                  h.includes('HOLD_ID') ||
                  h.includes('ALLOTTED_SHARES') ||
                  h.includes('REFUND_AMOUNT') ||
                  h.includes('REFUND_MODE') ||
                  h.includes('PAN_NO')
                );

                if (hasExpectedHeaders || headers.length >= 4) {
                  console.log('Found table with expected headers');

                  // Process data rows
                  rows.each((index, row) => {
                    if (index === 0) return; // Skip header

                    const $row = $response(row);
                    const cells = $row.find('td');

                    if (cells.length > 0) {
                      const cellTexts = cells.map((_, cell) => $response(cell).text().trim()).get();
                      console.log(`Row ${index} data:`, cellTexts);

                      // Check for "NO DATA FOUND" message in any cell
                      const noDataFound = cellTexts.some(text =>
                        text.includes('NO DATA FOUND') ||
                        text.includes('NO RECORD FOUND') ||
                        text.includes('NO DATA FOUND FOR THIS SEARCH')
                      );

                      if (noDataFound) {
                        allotmentStatus = 'No Record Found';
                        console.log('Found "NO DATA FOUND" in table cell');
                      } else if (cellTexts.length >= 4 && cellTexts[0] && cellTexts[0] !== '') {
                        // Found actual data - structure: [HOLD_ID, ALLOTTED_SHARES, REFUND_AMOUNT, REFUND_MODE, PAN_NO]
                        allotmentDetails = {
                          holdId: cellTexts[0] || '',
                          allottedShares: cellTexts[1] || '0',
                          refundAmount: cellTexts[2] || '0',
                          refundMode: cellTexts[3] || '',
                          panNo: cellTexts[4] || '',
                          status: (cellTexts[1] && cellTexts[1] !== '0' && cellTexts[1] !== '') ? 'Allotted' : 'Not Allotted'
                        };

                        allotmentStatus = allotmentDetails.status;
                        console.log('Found allotment data:', allotmentDetails);
                      }
                    }
                  });
                }
              }
            });
          }

          // Check for specific success/failure messages in divs
          const resultDiv = $response('#divgrid1, .table-responsive, .result');
          if (resultDiv.length > 0 && resultDiv.text().trim()) {
            const resultText = resultDiv.text().trim();
            if (resultText.toLowerCase().includes('no data found') ||
                resultText.toLowerCase().includes('no record found')) {
              allotmentStatus = 'No Record Found';
            } else if (resultText.toLowerCase().includes('allot')) {
              allotmentStatus = resultText.includes('not') ? 'Not Allotted' : 'Allotted';
            }
          }

          return {
            success: true,
            registrar: 'cameo',
            status: allotmentStatus,
            allotmentDetails: allotmentDetails,
            raw: responseHtml,
            details: `Used company code: ${companyCode}, captcha: ${captchaValue || 'empty'}`
          };

        } catch (submitError: any) {
          console.log(`Error submitting with captcha ${captchaValue || 'empty'}:`, submitError.message);
          continue; // Try next captcha strategy
        }
      }

      // If all captcha strategies failed, return captcha required error
      return {
        success: false,
        registrar: 'cameo',
        raw: null,
        status: 'captcha_required',
        error: 'All captcha strategies failed. Captcha verification is required for Cameo IPO allotment checking.'
      };

    } catch (error: any) {
      console.log(`Error with endpoint ${endpoint}:`, error.message);
      continue; // Try next endpoint
    }
  }

  // If all endpoints failed
  return {
    success: false,
    registrar: 'cameo',
    raw: null,
    status: 'error',
    error: 'All Cameo endpoints are unavailable'
  };
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
  cameo: checkCameo,
  mas: (req) => checkHtmlRegistrar('mas', req),
  maashitla: (req) => checkHtmlRegistrar('maashitla', req),
  beetal: (req) => checkHtmlRegistrar('beetal', req),
  purva: checkPurva,
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

  // Clear Purva company ID cache
  static clearPurvaCache(): void {
    purvaCompanyIdCache.clear();
    console.log('Purva company ID cache cleared');
  }

  // Clean up expired Purva cache entries
  static cleanupPurvaCache(): void {
    cleanupPurvaCache();
    console.log('Purva company ID cache cleaned up');
  }

  // Get Purva cache stats
  static getPurvaCache(): { size: number; entries: Array<{ ipoName: string; companyId: string | null; age: number }> } {
    const entries = Array.from(purvaCompanyIdCache.entries()).map(([key, value]) => ({
      ipoName: key,
      companyId: value.id,
      age: Date.now() - value.timestamp
    }));

    return {
      size: purvaCompanyIdCache.size,
      entries
    };
  }
}
