import { Request, Response } from "express";
import axios, { AxiosInstance, AxiosResponse } from "axios";

const TRENDLYNE_BASE_URL: string =
  process.env.TRENDLYNE_BASE_URL || "https://trendlyne.com/ipo/api";

const IPO_TREND_BASE_URL: string =
  process.env.IPO_TREND_BASE_URL || "https://api.ipo-trend.com/ipo";

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
      message:
        "An error occurred while checking IPO allotment status via IPONinja API",
      details: error.message,
    });
  }
};

// Get IPO subscription list from IPO Trend API
export const getSubscriptionList = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const platform = "Android";

    const response: AxiosResponse = await apiClient.get(
      `${IPO_TREND_BASE_URL}/ipo-subscription-list/`,
      {
        params: { platform },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        platform,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch subscription list",
      message: "An error occurred while fetching IPO subscription list",
      details: error.message,
    });
  }
};

// Get banner IPO list from IPO Trend API
export const getBannerList = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const platform = "Android";

    const response: AxiosResponse = await apiClient.get(
      `${IPO_TREND_BASE_URL}/banner-ipo-list`,
      {
        params: { platform },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        platform,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch banner list",
      message: "An error occurred while fetching banner IPO list",
      details: error.message,
    });
  }
};

// Get list of IPOs from IPO Trend API
export const getIpoList = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const platform = "Android";

    const response: AxiosResponse = await apiClient.get(
      `${IPO_TREND_BASE_URL}/list-of-ipo`,
      {
        params: { platform },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        platform,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch IPO list",
      message: "An error occurred while fetching list of IPOs",
      details: error.message,
    });
  }
};

// Get new IPO list from IPO Trend API with dynamic parameters
export const getNewIpoList = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Extract parameters from request query - all dynamic
    const { ipo_type, category, page_size, page, search } = req.query;

    // Build query string manually to ensure proper encoding
    const queryParams = new URLSearchParams();

    // Platform is required for decoding the response
    queryParams.append("platform", "Android");

    // Add dynamic parameters only if provided
    if (ipo_type) {
      queryParams.append("ipo_type", ipo_type as string);
    }
    if (category) {
      queryParams.append("category", category as string);
    }
    if (page_size) {
      queryParams.append("page_size", page_size as string);
    }
    if (page) {
      queryParams.append("page", page as string);
    }
    if (search !== undefined) {
      queryParams.append("search", search as string);
    }

    const response: AxiosResponse = await apiClient.post(
      `${IPO_TREND_BASE_URL}/new-ipo-list?${queryParams.toString()}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        queryParams: Object.fromEntries(queryParams.entries()),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch new IPO list",
      message: "An error occurred while fetching new IPO list",
      details: error.message,
    });
  }
};

// Get GMP details for a specific IPO from IPO Trend API
export const getGmpDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { ipoName } = req.params;
    const platform = "Android";

    if (!ipoName) {
      res.status(400).json({
        error: "Missing required parameter",
        message: "ipoName is required in the URL path",
      });
      return;
    }

    const response: AxiosResponse = await apiClient.get(
      `${IPO_TREND_BASE_URL}/ipo-gmp-detail/${ipoName}/`,
      {
        params: { platform },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        ipoName,
        platform,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch GMP details",
      message: "An error occurred while fetching IPO GMP details",
      details: error.message,
    });
  }
};

// Get IPO details by symbol from IPO Trend API
export const getIpoDetailsBySymbol = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const platform = "Android";

    if (!symbol) {
      res.status(400).json({
        error: "Missing required parameter",
        message: "symbol is required in the URL path",
      });
      return;
    }

    const response: AxiosResponse = await apiClient.get(
      `${IPO_TREND_BASE_URL}/${symbol}/`,
      {
        params: { platform },
      }
    );

    res.json({
      success: true,
      data: response.data,
      metadata: {
        fetchedAt: new Date().toISOString(),
        symbol,
        platform,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to fetch IPO details",
      message: "An error occurred while fetching IPO details by symbol",
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
      getIpoDekhoListing: "/api/ipos/ipodekho-listing",
      getIpoDetails: "/api/ipos/ipo-details/:slug",
      getAllotedIPOs: "/api/ipos/allotedipo-list",
      checkAllotmentWithIPONinja: "/api/ipos/check-ipoallotment",
      getSubscriptionList: "/api/ipos/subscription-list",
      getBannerList: "/api/ipos/banner-list",
      getIpoList: "/api/ipos/ipo-list",
      getNewIpoList: "/api/ipos/new-ipo-list",
      getGmpDetails: "/api/ipos/gmp-detail/:ipoName",
      getIpoDetailsBySymbol: "/api/ipos/ipo-symbol/:symbol",
      health: "/api/ipos/health",
    },
  });
};
