const express = require('express');
const { analyzeUrl, analyzeFiles, analyzeTradeContext } = require("../controllers/aiController");
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/analyze', requireAuth, analyzeUrl);
router.post('/analyze-files', requireAuth, analyzeFiles);
router.post('/analyze-trade', requireAuth, analyzeTradeContext);

module.exports = router;


