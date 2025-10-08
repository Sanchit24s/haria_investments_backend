const express = require('express');
const router = express.Router();
const {
    collectAnalytics,
    getAnalyticsOverview,
    getPageAnalytics,
    getVisitorAnalytics,
    getRealTimeAnalytics,
    exportAnalytics
} = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');

// Rate limiting middleware for analytics collection
const analyticsRateLimit = (() => {
    const requests = new Map();
    const WINDOW_SIZE = 60 * 1000; // 1 minute
    const MAX_REQUESTS = 100; // 100 requests per minute per IP

    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }

        const clientRequests = requests.get(clientId);

        // Remove old requests outside the window
        const validRequests = clientRequests.filter(time => now - time < WINDOW_SIZE);
        requests.set(clientId, validRequests);

        if (validRequests.length >= MAX_REQUESTS) {
            return res.status(429).json({
                success: false,
                message: 'Too many analytics requests. Please try again later.',
                retryAfter: Math.ceil(WINDOW_SIZE / 1000)
            });
        }

        validRequests.push(now);
        next();
    };
})();

// Validation middleware for analytics collection
const validateAnalyticsData = (req, res, next) => {
    const { visitorId, eventType, pageUrl, userAgent } = req.body;
    const errors = [];

    // Required field validation
    if (!visitorId || typeof visitorId !== 'string' || visitorId.trim().length === 0) {
        errors.push('Visitor ID is required and must be a non-empty string');
    }
    if (!eventType || !['pageview', 'heartbeat', 'pageleave'].includes(eventType)) {
        errors.push('Event type must be one of: pageview, heartbeat, pageleave');
    }
    if (!pageUrl || typeof pageUrl !== 'string' || pageUrl.trim().length === 0) {
        errors.push('Page URL is required and must be a non-empty string');
    }
    if (!userAgent || typeof userAgent !== 'string' || userAgent.trim().length === 0) {
        errors.push('User agent is required and must be a non-empty string');
    }

    // Optional field validation
    if (req.body.timeSpent !== undefined && (typeof req.body.timeSpent !== 'number' || req.body.timeSpent < 0)) {
        errors.push('Time spent must be a non-negative number');
    }

    if (req.body.deviceInfo && typeof req.body.deviceInfo !== 'object') {
        errors.push('Device info must be an object');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }

    next();
};

// Sanitization middleware
const sanitizeAnalyticsData = (req, res, next) => {
    if (req.body.visitorId) {
        req.body.visitorId = req.body.visitorId.trim();
    }
    if (req.body.pageUrl) {
        req.body.pageUrl = req.body.pageUrl.trim();
    }
    if (req.body.pageTitle) {
        req.body.pageTitle = req.body.pageTitle.trim();
    }
    if (req.body.referrer) {
        req.body.referrer = req.body.referrer.trim();
    }
    if (req.body.sessionId) {
        req.body.sessionId = req.body.sessionId.trim();
    }
    next();
};

// Routes

// POST /api/v1/analytics/collect - Collect analytics data (public endpoint)
router.post('/collect',
    analyticsRateLimit,
    sanitizeAnalyticsData,
    validateAnalyticsData,
    collectAnalytics
);

// GET /api/v1/analytics/overview - Get analytics overview (protected)
router.get('/overview', authenticate, getAnalyticsOverview);

// GET /api/v1/analytics/page/:pageUrl - Get page-specific analytics (protected)
router.get('/page/:pageUrl', authenticate, getPageAnalytics);

// GET /api/v1/analytics/visitor/:visitorId - Get visitor-specific analytics (protected)
router.get('/visitor/:visitorId', authenticate, getVisitorAnalytics);

// GET /api/v1/analytics/realtime - Get real-time analytics (protected)
router.get('/realtime', authenticate, getRealTimeAnalytics);

// GET /api/v1/analytics/export - Export analytics data (protected)
router.get('/export', authenticate, exportAnalytics);

module.exports = router;