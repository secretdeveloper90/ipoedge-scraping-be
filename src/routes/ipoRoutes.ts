import { Router } from 'express';
import {
  getListingDetails,
  getCompanyDetails,
  getScreenerData,
  getIpoDekhoListing,
  getIpoDetails,
  getAllotedIPOs,
  checkAllotmentWithIPONinja,
  getSubscriptionList,
  getBannerList,
  getIpoList,
  getGmpDetails,
  getIpoDetailsBySymbol,
  healthCheck
} from '../controllers/ipoController';

const router: Router = Router();

// GET /api/ipos/listing-details - Fetch list of all IPOs
router.get('/listing-details', getListingDetails);

// GET /api/ipos/company/:companyId - Fetch IPO data for a specific company
router.get('/company/:companyId', getCompanyDetails);

// GET /api/ipos/screener/:year - Fetch IPO screener data for a specific year
router.get('/screener/:year', getScreenerData);

// POST /api/ipos/ipodekho-listing - Get mainline IPO data from IPODekho
router.post('/ipodekho-listing', getIpoDekhoListing);

// GET /api/ipos/ipo-details/:slug - Get IPO details by slug from IPODekho
router.get('/ipo-details/:slug', getIpoDetails);

// GET /api/ipos/allotedipo-list - Get list of alloted IPOs from IPOWiz
router.get('/allotedipo-list', getAllotedIPOs);

// POST /api/ipos/check-ipoallotment - Check IPO allotment status using IPONinja API
router.post('/check-ipoallotment', checkAllotmentWithIPONinja);

// GET /api/ipos/subscription-list - Get IPO subscription list from IPO Trend
router.get('/subscription-list', getSubscriptionList);

// GET /api/ipos/banner-list - Get banner IPO list from IPO Trend
router.get('/banner-list', getBannerList);

// GET /api/ipos/ipo-list - Get list of IPOs from IPO Trend
router.get('/ipo-list', getIpoList);

// GET /api/ipos/gmp-detail/:ipoName - Get GMP details for a specific IPO from IPO Trend
router.get('/gmp-detail/:ipoName', getGmpDetails);

// GET /api/ipos/health - Health check for IPO service
router.get('/health', healthCheck);

// GET /api/ipos/:symbol - Get IPO details by symbol from IPO Trend (must be last to avoid conflicts)
router.get('/:symbol', getIpoDetailsBySymbol);

export default router;
