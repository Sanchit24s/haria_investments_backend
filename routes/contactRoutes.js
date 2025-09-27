const express = require('express');
const router = express.Router();
const {
    createContact,
    getContacts,
    getContactById,
    updateContact,
    deleteContact,
    getContactStats
} = require('../controllers/contactController');
const { authenticate } = require('../middlewares/authMiddleware');

// Validation middleware
const validateContact = (req, res, next) => {
    const { firstName, lastName, email, services } = req.body;
    const errors = [];

    // Required field validation
    if (!firstName || firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
    }
    if (!lastName || lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }
    if (!services || !Array.isArray(services) || services.length === 0) {
        errors.push('At least one service must be selected');
    }

    // Service validation
    const validServices = ['Insurance', 'Mutual Funds', 'Equity', 'Fixed Income'];
    if (services && Array.isArray(services)) {
        const invalidServices = services.filter(service => !validServices.includes(service));
        if (invalidServices.length > 0) {
            errors.push(`Invalid services: ${invalidServices.join(', ')}`);
        }
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
const sanitizeContact = (req, res, next) => {
    if (req.body.firstName) {
        req.body.firstName = req.body.firstName.trim();
    }
    if (req.body.lastName) {
        req.body.lastName = req.body.lastName.trim();
    }
    if (req.body.email) {
        req.body.email = req.body.email.trim().toLowerCase();
    }
    if (req.body.message) {
        req.body.message = req.body.message.trim();
    }
    next();
};

// Rate limiting middleware (simple implementation)
const rateLimit = (() => {
    const requests = new Map();
    const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes
    const MAX_REQUESTS = 5; // 5 requests per window

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
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(WINDOW_SIZE / 1000)
            });
        }

        validRequests.push(now);
        next();
    };
})();

// Routes

// POST /api/v1/contacts - Create new contact
router.post('/',
    rateLimit,
    sanitizeContact,
    validateContact,
    createContact
);

// GET /api/v1/contacts - Get all contacts (with pagination and filtering)
router.get('/', authenticate, getContacts);

// GET /api/v1/contacts/stats - Get contact statistics
router.get('/stats', authenticate, getContactStats);

// GET /api/v1/contacts/:id - Get contact by ID
router.get('/:id', authenticate, getContactById);

// PUT /api/v1/contacts/:id - Update contact
router.put('/:id', authenticate, updateContact);

// DELETE /api/v1/contacts/:id - Delete contact
router.delete('/:id', authenticate, deleteContact);

module.exports = router;
