const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    visitorId: {
        type: String,
        required: [true, 'Visitor ID is required'],
        index: true
    },
    eventType: {
        type: String,
        required: [true, 'Event type is required'],
        enum: ['pageview', 'heartbeat', 'pageleave'],
        index: true
    },
    pageUrl: {
        type: String,
        required: [true, 'Page URL is required'],
        index: true
    },
    pageTitle: {
        type: String,
        default: ''
    },
    referrer: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        required: [true, 'User agent is required']
    },
    deviceInfo: {
        browser: {
            type: String,
            default: ''
        },
        os: {
            type: String,
            default: ''
        },
        device: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet'],
            default: 'desktop'
        },
        screenResolution: {
            type: String,
            default: ''
        }
    },
    timeSpent: {
        type: Number,
        default: 0,
        min: 0
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    ipAddress: {
        type: String,
        default: ''
    },
    sessionId: {
        type: String,
        index: true
    },
    isNewVisitor: {
        type: Boolean,
        default: true
    },
    isReturningVisitor: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound indexes for better query performance
analyticsSchema.index({ visitorId: 1, timestamp: -1 });
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ pageUrl: 1, timestamp: -1 });
analyticsSchema.index({ 'deviceInfo.device': 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: -1 });

// Virtual for formatted timestamp
analyticsSchema.virtual('formattedTimestamp').get(function () {
    return this.timestamp.toISOString();
});

// Virtual for time spent in minutes
analyticsSchema.virtual('timeSpentMinutes').get(function () {
    return Math.round(this.timeSpent / 60000 * 100) / 100; // Convert to minutes with 2 decimal places
});

// Static method to get analytics by date range
analyticsSchema.statics.getByDateRange = function (startDate, endDate) {
    return this.find({
        timestamp: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    }).sort({ timestamp: -1 });
};

// Static method to get page views by URL
analyticsSchema.statics.getPageViews = function (url = null) {
    const filter = { eventType: 'pageview' };
    if (url) {
        filter.pageUrl = url;
    }
    return this.find(filter).sort({ timestamp: -1 });
};

// Static method to get visitor sessions
analyticsSchema.statics.getVisitorSessions = function (visitorId) {
    return this.find({ visitorId }).sort({ timestamp: -1 });
};

// Static method to get device statistics
analyticsSchema.statics.getDeviceStats = function (startDate) {
    return this.aggregate([
        {
            $match: {
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$deviceInfo.device',
                count: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$visitorId' }
            }
        },
        {
            $project: {
                device: '$_id',
                count: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static method to get page performance stats
analyticsSchema.statics.getPagePerformance = function (startDate) {
    return this.aggregate([
        {
            $match: {
                eventType: 'pageleave',
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$pageUrl',
                pageTitle: { $first: '$pageTitle' },
                totalViews: { $sum: 1 },
                avgTimeSpent: { $avg: '$timeSpent' },
                totalTimeSpent: { $sum: '$timeSpent' },
                uniqueVisitors: { $addToSet: '$visitorId' }
            }
        },
        {
            $project: {
                pageUrl: '$_id',
                pageTitle: 1,
                totalViews: 1,
                avgTimeSpent: { $round: ['$avgTimeSpent', 0] },
                totalTimeSpent: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { totalViews: -1 } }
    ]);
};

// Static method to get traffic sources
analyticsSchema.statics.getTrafficSources = function (startDate) {
    return this.aggregate([
        {
            $match: {
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$referrer',
                count: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$visitorId' }
            }
        },
        {
            $project: {
                referrer: '$_id',
                count: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static method to get hourly traffic
analyticsSchema.statics.getHourlyTraffic = function (date = null) {
    const matchStage = { eventType: 'pageview' };
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        matchStage.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { $hour: '$timestamp' },
                count: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$visitorId' }
            }
        },
        {
            $project: {
                hour: '$_id',
                count: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { hour: 1 } }
    ]);
};

// Static method to get daily traffic
analyticsSchema.statics.getDailyTraffic = function (days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        {
            $match: {
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$timestamp' },
                    month: { $month: '$timestamp' },
                    day: { $dayOfMonth: '$timestamp' }
                },
                count: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$visitorId' }
            }
        },
        {
            $project: {
                date: {
                    $dateFromParts: {
                        year: '$_id.year',
                        month: '$_id.month',
                        day: '$_id.day'
                    }
                },
                count: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' }
            }
        },
        { $sort: { date: 1 } }
    ]);
};

// Static method to get visitor behavior
analyticsSchema.statics.getVisitorBehavior = function (visitorId) {
    return this.aggregate([
        { $match: { visitorId } },
        {
            $group: {
                _id: '$sessionId',
                sessionStart: { $min: '$timestamp' },
                sessionEnd: { $max: '$timestamp' },
                pagesVisited: { $addToSet: '$pageUrl' },
                totalTimeSpent: { $sum: '$timeSpent' },
                eventCount: { $sum: 1 }
            }
        },
        {
            $project: {
                sessionId: '$_id',
                sessionStart: 1,
                sessionEnd: 1,
                pagesVisited: 1,
                pageCount: { $size: '$pagesVisited' },
                totalTimeSpent: 1,
                eventCount: 1,
                sessionDuration: {
                    $subtract: ['$sessionEnd', '$sessionStart']
                }
            }
        },
        { $sort: { sessionStart: -1 } }
    ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema);
