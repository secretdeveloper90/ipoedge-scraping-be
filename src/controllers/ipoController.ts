import { Request, Response } from "express";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { IPOAllotmentService } from "../services/ipoAllotmentService";
import { IPOAllotmentRequest, RegistrarType } from "../types/ipoAllotment";

const TRENDLYNE_BASE_URL: string =
  process.env.TRENDLYNE_BASE_URL || "https://trendlyne.com/ipo/api";

// Define interfaces for API responses

interface IPOCompanyData {
  company_headers: {
    company_name: string;
    company_short_name: string;
    ipo_id: number;
    company_slug_name: string;
    stock_page_url: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface IPOScreenerData {
  table: {
    row_data: Array<{
      company_name: string;
      ipo_id: number;
      company_slug_name: string;
      stock_page_url: string;
      stock_code: string;
      isin: string;
      listing_date: string;
      issue_size: number;
      issue_price: number;
      is_sme: boolean;
      [key: string]: any;
    }>;
    totalCount: number;
  };
  [key: string]: any;
}

// Configure axios with default settings
const apiClient: AxiosInstance = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Sec-Ch-Ua":
      '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  },
});

// Get listing details (list of all IPOs) from Trendlyne API
export const getListingDetails = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const response: AxiosResponse = await apiClient.get(
      `${TRENDLYNE_BASE_URL}/listing-details/`
    );

    if (
      response.data &&
      response.data.head &&
      (response.data.head.status === 0 || response.data.head.status === "0")
    ) {
      // Success response from Trendlyne
      res.json({
        success: true,
        data: response.data.body,
        metadata: {
          fetchedAt: new Date().toISOString(),
          source: "trendlyne",
          apiVersion: "listing-details",
        },
      });
    } else {
      // API returned an error
      res.status(404).json({
        error: "Listing data not found",
        message: "No IPO listing data available",
        details: response.data.head || {},
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch listing details",
      message: "An error occurred while fetching IPO listing data",
      details: error.message,
    });
  }
};

// Get company details by ID from Trendlyne API
export const getCompanyDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      res.status(400).json({
        error: "Missing company ID",
        message: "Company ID is required",
      });
      return;
    }

    const response: AxiosResponse<IPOCompanyData> = await apiClient.get(
      `${TRENDLYNE_BASE_URL}/company-details/${companyId}/`,
      {
        headers: {
          Referer: "https://trendlyne.com/ipo/",
          Origin: "https://trendlyne.com",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (response.data && typeof response.data === "object") {
      // Success response from Trendlyne
      res.json({
        success: true,
        data: response.data,
        metadata: {
          companyId,
          fetchedAt: new Date().toISOString(),
          source: "trendlyne",
        },
      });
    } else {
      // API returned unexpected data
      res.status(404).json({
        error: "Company data not found",
        message: `No IPO data found for company ID: ${companyId}`,
      });
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      res.status(404).json({
        error: "Company not found",
        message: `Company with ID ${req.params.companyId} not found`,
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch company details",
        message: "An error occurred while fetching company data",
        details: error.message,
      });
    }
  }
};

// Get IPO screener data by year from Trendlyne API
export const getScreenerData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { year } = req.params;

    if (!year) {
      res.status(400).json({
        error: "Missing year parameter",
        message: "Year is required",
      });
      return;
    }

    // Validate year format
    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2030) {
      res.status(400).json({
        error: "Invalid year",
        message: "Year must be a valid number between 2000 and 2030",
      });
      return;
    }

    const response: AxiosResponse<IPOScreenerData> = await apiClient.get(
      `${TRENDLYNE_BASE_URL}/screener-v2/year/${year}/`,
      {
        headers: {
          Referer: "https://trendlyne.com/ipo/",
          Origin: "https://trendlyne.com",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (
      response.data &&
      response.data.head &&
      (response.data.head.status === 0 || response.data.head.status === "0")
    ) {
      // Success response from Trendlyne
      res.json({
        success: true,
        data: response.data.body || {},
        metadata: {
          year,
          fetchedAt: new Date().toISOString(),
          source: "trendlyne",
          totalCount: response.data.body?.table?.totalCount || 0,
          apiVersion: "screener-v2",
          headInfo: response.data.head,
        },
      });
    } else {
      // API returned an error
      res.status(404).json({
        error: "Screener data not found",
        message: `No IPO screener data found for year: ${year}`,
        details: response.data.head || {},
      });
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      res.status(404).json({
        error: "Screener data not found",
        message: `No IPO screener data available for year ${req.params.year}`,
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch screener data",
        message: "An error occurred while fetching screener data",
        details: error.message,
      });
    }
  }
};

// Check IPO allotment status
export const checkAllotmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { panNo, ipoName, registrar }: IPOAllotmentRequest = req.body;

    // Validate required fields
    if (!panNo || !ipoName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "panNo and ipoName are required",
      });
      return;
    }

    // Validate PAN format (basic validation)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNo)) {
      res.status(400).json({
        success: false,
        error: "Invalid PAN format",
        message: "PAN should be in format: ABCDE1234F",
      });
      return;
    }

    if (registrar) {
      // Check specific registrar
      const validRegistrars: RegistrarType[] = [
        "bigshare",
        "kfintech",
        "linkintime",
        "skyline",
        "cameo",
        "mas",
        "maashitla",
        "beetal",
        "purva",
        "mufg",
      ];

      if (!validRegistrars.includes(registrar as RegistrarType)) {
        res.status(400).json({
          success: false,
          error: "Invalid registrar",
          message: `Registrar must be one of: ${validRegistrars.join(", ")}`,
        });
        return;
      }

      const result = await IPOAllotmentService.checkRegistrar(
        registrar as RegistrarType,
        { panNo, ipoName, registrar }
      );

      res.json({
        success: true,
        data: result,
        metadata: {
          panNo: panNo.substring(0, 3) + "XXXXX" + panNo.substring(8), // Mask PAN for privacy
          ipoName,
          registrar,
          checkedAt: new Date().toISOString(),
        },
      });
    } else {
      // Check all registrars
      const results = await IPOAllotmentService.checkAllRegistrars({
        panNo,
        ipoName,
      });

      res.json({
        success: true,
        data: results,
        metadata: {
          panNo: panNo.substring(0, 3) + "XXXXX" + panNo.substring(8), // Mask PAN for privacy
          ipoName,
          totalRegistrarsChecked: results.length,
          checkedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to check allotment status",
      message: "An error occurred while checking IPO allotment status",
      details: error.message,
    });
  }
};

// Get supported registrars list
export const getSupportedRegistrars = (_req: Request, res: Response): void => {
  try {
    const registrars = IPOAllotmentService.getSupportedRegistrars();

    res.json({
      success: true,
      data: registrars,
      metadata: {
        totalRegistrars: registrars.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch supported registrars",
      message: "An error occurred while fetching registrar information",
      details: error.message,
    });
  }
};

// Get mainline IPO data from IPODekho API
export const getIpoDekhoListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { CategoryForIPOS, type } = req.body;

    if (!CategoryForIPOS || !type) {
      res.status(400).json({
        error: "Missing required parameters",
        message: "CategoryForIPOS and type are required in request body",
      });
      return;
    }

    const payload = {
      CategoryForIPOS,
      type,
    };

    const response: AxiosResponse = await apiClient.post(
      "https://app.ipodekho.com/GetMainLineIpo",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    if (response.data) {
      // Success response from IPODekho
      res.json({
        success: true,
        data: response.data,
        metadata: {
          categoryForIPOS: CategoryForIPOS,
          type: type,
          fetchedAt: new Date().toISOString(),
        },
      });
    } else {
      // API returned unexpected data
      res.status(404).json({
        error: "Mainline IPO data not found",
        message: "No mainline IPO data available",
        details: response.data || {},
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch mainline IPO data",
      message:
        "An error occurred while fetching mainline IPO data from IPODekho",
      details: error.message,
    });
  }
};

// Get IPO details by slug from IPODekho API
export const getIpoDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({
        error: "Missing required parameter",
        message: "IPO slug is required in URL path",
      });
      return;
    }

    const response: AxiosResponse = await apiClient.post(
      `https://app.ipodekho.com/GetSlugByMainLineIpo/${slug}`,
      {},
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "content-length": "0",
          origin: "https://ipodekho.com",
          referer: "https://ipodekho.com/",
          "sec-ch-ua":
            '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        },
      }
    );

    if (response.data) {
      // Success response from IPODekho
      res.json({
        success: true,
        data: response.data,
        metadata: {
          slug: slug,
          fetchedAt: new Date().toISOString(),
        },
      });
    } else {
      // API returned unexpected data
      res.status(404).json({
        error: "IPO details not found",
        message: `No IPO details found for slug: ${slug}`,
        details: response.data || {},
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch IPO details",
      message: "An error occurred while fetching IPO details from IPODekho",
      details: error.message,
    });
  }
};

// Get alloted IPOs from IPONinja API
export const getAllotedIPOs = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const response: AxiosResponse = await apiClient.get(
      "https://iponinjaapi.matalia.co.in/api/v1/Ipo/ipo/getallotmentoutipo"
    );

    if (response.data) {
      const ipoData = response?.data?.dataResult;
      res.json({
        success: true,
        data: ipoData,
        message: "IPOs retrieved successfully",
        metadata: {
          fetchedAt: new Date().toISOString(),
          totalCount: Array.isArray(ipoData) ? ipoData.length : 0,
        },
      });
    } else {
      res.status(404).json({
        error: "Alloted IPOs data not found",
        message: "No alloted IPOs data available",
        details: response.data || {},
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch alloted IPOs",
      message: "An error occurred while fetching alloted IPOs data",
      details: error.message,
    });
  }
};

// Check IPO allotment status using IPONinja API
export const checkAllotmentWithIPONinja = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { ipoid, pancard } = req.body;

    // Validate required fields
    if (!ipoid || !pancard) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "ipoid and pancard are required",
      });
      return;
    }

    // Check if pancard is an array or a single value
    const pancards = Array.isArray(pancard) ? pancard : [pancard];

    // Validate PAN format for all entries
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]?$/;
    for (const pan of pancards) {
      if (!panRegex.test(pan)) {
        res.status(400).json({
          success: false,
          error: "Invalid PAN format",
          message: "All PANs should be in format: ABCDE1234 or ABCDE1234F",
          invalidPan: pan,
        });
        return;
      }
    }

    // Make separate API calls for each PAN card
    const results = [];
    for (const pan of pancards) {
      try {
        const payload = {
          ipoid,
          pancard: pan,
        };

        const response: AxiosResponse = await apiClient.post(
          "https://iponinjaapi.matalia.co.in/api/v1/IpoBids/fetchliveallotment",
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        results.push({
          pancard: pan,
          data: response.data,
        });
      } catch (error: any) {
        results.push({
          pancard: pan,
          error: error.message,
          data: null,
        });
      }
    }

    res.json({
      success: true,
      data: results,
      totalRequests: pancards.length,
      successfulRequests: results.filter((r) => !r.error).length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: "Failed to check allotment status",
      message: "An error occurred while checking IPO allotment status via IPONinja API",
      details: error.message,
    });
  }
};

// Health check endpoint
export const healthCheck = (_req: Request, res: Response): void => {
  res.json({
    status: "OK",
    message: "IPO service is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      getListingDetails: "/api/ipos/listing-details",
      getCompanyDetails: "/api/ipos/company/:companyId",
      getScreenerData: "/api/ipos/screener/:year",
      checkAllotmentStatus: "/api/ipos/check-allotment",
      getSupportedRegistrars: "/api/ipos/registrars",
      getIpoDekhoListing: "/api/ipos/ipodekho-listing",
      getIpoDetails: "/api/ipos/ipo-details/:slug",
      getAllotedIPOs: "/api/ipos/allotedipo-list",
      checkAllotmentWithIPONinja: "/api/ipos/check-ipoallotment",
      health: "/api/ipos/health",
    },
  });
};
