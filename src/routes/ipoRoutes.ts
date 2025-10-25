import { Router } from 'express';
import {
  getListingDetails,
  getCompanyDetails,
  getScreenerData,
  checkAllotmentStatus,
  getSupportedRegistrars,
  getIpoDekhoListing,
  getIpoDetails,
  getAllotedIPOs,
  checkAllotmentWithIPONinja,
  healthCheck
} from '../controllers/ipoController';

const router: Router = Router();

// GET /api/ipos/listing-details - Fetch list of all IPOs
router.get('/listing-details', getListingDetails);

// GET /api/ipos/company/:companyId - Fetch IPO data for a specific company
router.get('/company/:companyId', getCompanyDetails);

// GET /api/ipos/screener/:year - Fetch IPO screener data for a specific year
router.get('/screener/:year', getScreenerData);

// POST /api/ipos/allotment-status - Check IPO allotment status
router.post('/check-allotment', checkAllotmentStatus);

// GET /api/ipos/registrars - Get list of supported registrars
router.get('/registrars', getSupportedRegistrars);

// POST /api/ipos/ipodekho-listing - Get mainline IPO data from IPODekho
router.post('/ipodekho-listing', getIpoDekhoListing);

// GET /api/ipos/ipo-details/:slug - Get IPO details by slug from IPODekho
router.get('/ipo-details/:slug', getIpoDetails);

// GET /api/ipos/allotedipo-list - Get list of alloted IPOs from IPOWiz
router.get('/allotedipo-list', getAllotedIPOs);

// POST /api/ipos/check-ipoallotment - Check IPO allotment status using IPONinja API
router.post('/check-ipoallotment', checkAllotmentWithIPONinja);

// GET /api/ipos/health - Health check for IPO service
router.get('/health', healthCheck);

export default router;
