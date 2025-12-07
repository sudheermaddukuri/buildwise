const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { Home } = require('../models/Home');
const {
  getMyAccount,
  initMyAccount,
  inviteMember,
  updateMemberRole,
  removeMember,
  getSubscription,
  updateSubscription,
  getSubscriptions,
  createSubscription,
  updateHomeSubscription,
} = require('../controllers/accountController');

const router = express.Router();

router.get('/homes', requireAuth, async (req, res) => {
  const email = req.user?.email?.toLowerCase();
  if (!email) return res.status(401).json({ message: 'Unauthorized' });
  const homes = await Home.find({
    $or: [
      { 'client.email': email },
      { 'builder.email': email },
      { 'monitors.email': email },
      { 'participants.email': email },
    ],
  })
    .sort({ updatedAt: -1 })
    .limit(100);
  res.json(homes);
});

// Account + Subscription
router.get('/account', requireAuth, getMyAccount);
router.post('/account/init', requireAuth, initMyAccount);
router.post('/account/members', requireAuth, inviteMember);
router.patch('/account/members', requireAuth, updateMemberRole);
router.delete('/account/members/:email', requireAuth, removeMember);
router.get('/account/subscription', requireAuth, getSubscription);
router.patch('/account/subscription', requireAuth, updateSubscription);
// Per-home subscriptions
router.get('/account/subscriptions', requireAuth, getSubscriptions);
router.post('/account/subscriptions', requireAuth, createSubscription);
router.patch('/account/subscriptions/:homeId', requireAuth, updateHomeSubscription);

module.exports = router;


