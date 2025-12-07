const express = require('express');
const { analyzeUrl, analyzeFiles, analyzeTradeContext, analyzeArchitecture } = require("../controllers/aiController");
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/analyze', requireAuth, analyzeUrl);
router.post('/analyze-files', requireAuth, analyzeFiles);
router.post('/analyze-trade', requireAuth, analyzeTradeContext);
router.post('/analyze-architecture', requireAuth, analyzeArchitecture);

module.exports = router;


