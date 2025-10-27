# IPO Edge API Documentation

Complete API documentation for IPO Edge Scraping Backend.

**Base URL (Production):** `https://ipoedge-scraping-be.vercel.app`  
**Base URL (Local):** `http://localhost:5000`

---

## 📋 Table of Contents

- [Health Check Endpoints](#health-check-endpoints)
- [Trendlyne API Endpoints](#trendlyne-api-endpoints)
- [IPODekho API Endpoints](#ipodekho-api-endpoints)
- [IPOWiz API Endpoints](#ipowiz-api-endpoints)
- [IPONinja API Endpoints](#iponinja-api-endpoints)
- [IPO Trend API Endpoints](#ipo-trend-api-endpoints)

---

## Health Check Endpoints

### 1. Main API Health Check
**Endpoint:** `GET /api/health`

**Description:** Check if the main API is running.

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "IPO Edge Panel Backend API is running",
  "timestamp": "2025-10-27T10:00:00.000Z"
}
```

---

### 2. IPO Service Health Check
**Endpoint:** `GET /api/ipos/health`

**Description:** Check IPO service health and get list of all available endpoints.

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-27T10:00:00.000Z",
  "endpoints": {
    "getListingDetails": "/api/ipos/listing-details",
    "getCompanyDetails": "/api/ipos/company/:companyId",
    "getScreenerData": "/api/ipos/screener/:year",
    "getIpoDekhoListing": "/api/ipos/ipodekho-listing",
    "getIpoDetails": "/api/ipos/ipo-details/:slug",
    "getAllotedIPOs": "/api/ipos/allotedipo-list",
    "checkAllotmentWithIPONinja": "/api/ipos/check-ipoallotment",
    "getSubscriptionList": "/api/ipos/subscription-list",
    "getBannerList": "/api/ipos/banner-list",
    "getIpoList": "/api/ipos/ipo-list",
    "getGmpDetails": "/api/ipos/gmp-detail/:ipoName",
    "getIpoDetailsBySymbol": "/api/ipos/ipo-symbol/:symbol",
    "health": "/api/ipos/health"
  }
}
```

---

## Trendlyne API Endpoints

### 3. Get Listing Details
**Endpoint:** `GET /api/ipos/listing-details`

**Description:** Fetch list of all IPOs from Trendlyne.

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/listing-details
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "trendlyne"
  }
}
```

---

### 4. Get Company Details
**Endpoint:** `GET /api/ipos/company/:companyId`

**Description:** Fetch IPO data for a specific company by company ID.

**Path Parameters:**
- `companyId` (required) - Company identifier

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/company/12345
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyId": "12345",
    "companyName": "Example Company",
    ...
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "trendlyne"
  }
}
```

---

### 5. Get Screener Data
**Endpoint:** `GET /api/ipos/screener/:year`

**Description:** Fetch IPO screener data for a specific year.

**Path Parameters:**
- `year` (required) - Year (e.g., 2024, 2025)

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/screener/2024
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "trendlyne",
    "year": "2024"
  }
}
```

---

## IPODekho API Endpoints

### 6. Get IPODekho Listing
**Endpoint:** `POST /api/ipos/ipodekho-listing`

**Description:** Get mainline IPO data from IPODekho.

**Request:**
```bash
curl -X POST https://ipoedge-scraping-be.vercel.app/api/ipos/ipodekho-listing \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipodekho"
  }
}
```

---

### 7. Get IPO Details by Slug
**Endpoint:** `GET /api/ipos/ipo-details/:slug`

**Description:** Get detailed IPO information by slug from IPODekho.

**Path Parameters:**
- `slug` (required) - IPO slug identifier

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/ipo-details/example-company-ipo
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slug": "example-company-ipo",
    ...
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipodekho"
  }
}
```

---

## IPOWiz API Endpoints

### 8. Get Alloted IPO List
**Endpoint:** `GET /api/ipos/allotedipo-list`

**Description:** Get list of alloted IPOs from IPOWiz.

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/allotedipo-list
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipowiz"
  }
}
```

---

## IPONinja API Endpoints

### 9. Check IPO Allotment Status
**Endpoint:** `POST /api/ipos/check-ipoallotment`

**Description:** Check IPO allotment status using IPONinja API.

**Request Body:**
```json
{
  "panNo": "ABCDE1234F",
  "ipoName": "Example Company IPO"
}
```

**Request:**
```bash
curl -X POST https://ipoedge-scraping-be.vercel.app/api/ipos/check-ipoallotment \
  -H "Content-Type: application/json" \
  -d '{
    "panNo": "ABCDE1234F",
    "ipoName": "Example Company IPO"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "status": "allotted",
    "shares": 100,
    "applicationNumber": "123456789",
    ...
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "iponinja"
  }
}
```

**Response (Not Allotted):**
```json
{
  "success": true,
  "data": {
    "status": "not allotted",
    ...
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "iponinja"
  }
}
```

---

## IPO Trend API Endpoints

### 10. Get IPO Subscription List
**Endpoint:** `GET /api/ipos/subscription-list`

**Description:** Get IPO subscription list from IPO Trend. Platform parameter is automatically set to "Android".

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/subscription-list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": true,
      "status_code": 200,
      "message": "Subscription list fetched successfully."
    },
    "data": [...]
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipo-trend",
    "platform": "Android"
  }
}
```

---

### 11. Get Banner IPO List
**Endpoint:** `GET /api/ipos/banner-list`

**Description:** Get banner/featured IPO list from IPO Trend. Platform parameter is automatically set to "Android".

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/banner-list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": true,
      "status_code": 200,
      "message": "Banner list fetched successfully."
    },
    "data": [...]
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipo-trend",
    "platform": "Android"
  }
}
```

---

### 12. Get IPO List
**Endpoint:** `GET /api/ipos/ipo-list`

**Description:** Get comprehensive list of IPOs from IPO Trend. Platform parameter is automatically set to "Android".

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/ipo-list
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": true,
      "status_code": 200,
      "message": "Ipo list fetched successfully.",
      "message_code": "SUCCESS"
    },
    "data": {
      "count": 1215,
      "total_page": 174,
      "next": "https://api.ipo-trend.com/ipo/list-of-ipo?page=2&platform=Android",
      "previous": null,
      "results": [
        {
          "id": 3130,
          "company_name": "Midwest Limited",
          "start_date": "2025-10-15",
          "end_date": "2025-10-17",
          "symbol": "MIDWESTLTD",
          "status": "Listed"
        }
      ]
    }
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipo-trend",
    "platform": "Android"
  }
}
```

---

### 13. Get GMP Details
**Endpoint:** `GET /api/ipos/gmp-detail/:ipoName`

**Description:** Get Grey Market Premium (GMP) details for a specific IPO from IPO Trend. Platform parameter is automatically set to "Android".

**Path Parameters:**
- `ipoName` (required) - IPO name/identifier

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/gmp-detail/midwest-limited
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": true,
      "status_code": 200,
      "message": "GMP details fetched successfully."
    },
    "data": {
      "ipoName": "Midwest Limited",
      "gmp": "92",
      "estimatedListing": "1157"
    }
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "source": "ipo-trend",
    "ipoName": "midwest-limited",
    "platform": "Android"
  }
}
```

---

### 14. Get IPO Details by Symbol
**Endpoint:** `GET /api/ipos/ipo-symbol/:symbol`

**Description:** Get comprehensive IPO details by symbol from IPO Trend. Platform parameter is automatically set to "Android".

**Path Parameters:**
- `symbol` (required) - IPO symbol (e.g., MIDWESTLTD, CANHLIFE)

**Request:**
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/ipo-symbol/MIDWESTLTD
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": true,
      "status_code": 200,
      "message": "Ipo retrieved successfully.",
      "message_code": "SUCCESS"
    },
    "data": {
      "id": 3130,
      "company_name": "Midwest Limited",
      "symbol": "MIDWESTLTD",
      "security_type": "EQ",
      "start_date": "2025-10-15",
      "end_date": "2025-10-17",
      "allotment_date": "2025-10-20",
      "listing_date": "2025-10-24",
      "listing_at_group": "NSE, BSE",
      "face_value": "₹5 per share",
      "price_range": "₹1014 - ₹1065",
      "issue_size": 4234742,
      "subscription": 92.34,
      "gmp": "92",
      "status": "Listed",
      "about_the_company": "Midwest Limited, incorporated in 1981...",
      "subscription_history": [],
      "valuation": [],
      "financial_performance": [],
      "ipo_subscription_detail": [],
      "company_financial_data": {}
    }
  },
  "metadata": {
    "fetchedAt": "2025-10-27T10:00:00.000Z",
    "symbol": "MIDWESTLTD",
    "platform": "Android"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Missing required parameter",
  "message": "Detailed error message"
}
```

### 404 Not Found
```json
{
  "success": true,
  "data": {
    "meta": {
      "status": false,
      "status_code": 404,
      "message": "Validation error",
      "validations": [
        {
          "error": ["No IpoData matches the given query."]
        }
      ],
      "message_code": "ERROR"
    },
    "data": {}
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch data",
  "message": "An error occurred while processing your request",
  "details": "Detailed error message"
}
```

---

## Quick Reference

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/api/health` | Main API health check |
| 2 | GET | `/api/ipos/health` | IPO service health check |
| 3 | GET | `/api/ipos/listing-details` | Get all IPOs (Trendlyne) |
| 4 | GET | `/api/ipos/company/:companyId` | Get company details (Trendlyne) |
| 5 | GET | `/api/ipos/screener/:year` | Get screener data (Trendlyne) |
| 6 | POST | `/api/ipos/ipodekho-listing` | Get IPO listing (IPODekho) |
| 7 | GET | `/api/ipos/ipo-details/:slug` | Get IPO details by slug (IPODekho) |
| 8 | GET | `/api/ipos/allotedipo-list` | Get alloted IPOs (IPOWiz) |
| 9 | POST | `/api/ipos/check-ipoallotment` | Check allotment status (IPONinja) |
| 10 | GET | `/api/ipos/subscription-list` | Get subscription list (IPO Trend) |
| 11 | GET | `/api/ipos/banner-list` | Get banner list (IPO Trend) |
| 12 | GET | `/api/ipos/ipo-list` | Get IPO list (IPO Trend) |
| 13 | GET | `/api/ipos/gmp-detail/:ipoName` | Get GMP details (IPO Trend) |
| 14 | GET | `/api/ipos/ipo-symbol/:symbol` | Get IPO by symbol (IPO Trend) |

---

## Notes

- All IPO Trend API endpoints automatically use `platform=Android` parameter
- All timestamps are in ISO 8601 format (UTC)
- All responses include a `metadata` object with `fetchedAt` timestamp
- Rate limiting may apply on the production server
- CORS is enabled for all origins

---

## Support

For issues or questions, please contact: ipoedge.app@gmail.com

**Repository:** https://github.com/secretdeveloper90/ipoedge-scraping-be
