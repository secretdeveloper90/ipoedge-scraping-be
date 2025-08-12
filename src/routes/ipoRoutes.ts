import { Router } from 'express';
import {
  getListingDetails,
  getCompanyDetails,
  getScreenerData,
  healthCheck
} from '../controllers/ipoController';

const router: Router = Router();

// GET /api/ipos/listing-details - Fetch list of all IPOs
router.get('/listing-details', getListingDetails);

// GET /api/ipos/company/:companyId - Fetch IPO data for a specific company
router.get('/company/:companyId', getCompanyDetails);

// GET /api/ipos/screener/:year - Fetch IPO screener data for a specific year
router.get('/screener/:year', getScreenerData);

// GET /api/ipos/health - Health check for IPO service
router.get('/health', healthCheck);

export default router;
