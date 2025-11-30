const express = require('express');
const { analyzeUrl, analyzeFiles } = require("../controllers/aiController");
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/analyze', requireAuth, analyzeUrl);
router.post('/analyze-files', requireAuth, analyzeFiles);

module.exports = router;


