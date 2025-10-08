const Analytics = require("../models/analyticsModel");
const logger = require("../config/logger");

// Collect analytics data
const collectAnalytics = async (req, res) => {
    try {
        const {
            visitorId,
            eventType,
            pageUrl,
            pageTitle,
            referrer,
            userAgent,
            deviceInfo,
            timeSpent,
            sessionId,
            isNewVisitor,
            isReturningVisitor
        } = req.body;

        // Validate required fields
        if (!visitorId || !eventType || !pageUrl || !userAgent) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: visitorId, eventType, pageUrl, userAgent"
            });
        }

        // Validate event type
        const validEventTypes = ['pageview', 'heartbeat', 'pageleave'];
        if (!validEventTypes.includes(eventType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid event type. Must be one of: pageview, heartbeat, pageleave"
            });
        }

        // Get client IP address
        const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
            (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
            req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.headers['x-real-ip'] ||
            'unknown';

        // Create analytics record
        const analyticsRecord = new Analytics({
            visitorId,
            eventType,
            pageUrl,
            pageTitle: pageTitle || '',
            referrer: referrer || '',
            userAgent,
            deviceInfo: deviceInfo || {},
            timeSpent: timeSpent || 0,
            timestamp: new Date(),
            ipAddress,
            sessionId: sessionId || '',
            isNewVisitor: isNewVisitor || false,
            isReturningVisitor: isReturningVisitor || false
        });

        await analyticsRecord.save();

        logger.info(`Analytics event recorded: ${eventType} for visitor ${visitorId} on ${pageUrl}`);

        res.status(201).json({
            success: true,
            message: "Analytics data collected successfully",
            data: {
                id: analyticsRecord._id,
                timestamp: analyticsRecord.timestamp
            }
        });
    } catch (error) {
        logger.error("Error collecting analytics:", error);

        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

// Get analytics overview
const getAnalyticsOverview = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        console.log(`Analytics Overview Request: ${days} days, startDate: ${startDate.toISOString()}`);

        // Get basic stats
        const [
            totalPageViews,
            uniqueVisitors,
            deviceStats,
            pagePerformance,
            trafficSources,
            dailyTraffic
        ] = await Promise.all([
            Analytics.countDocuments({
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }),
            Analytics.distinct('visitorId', {
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }),
            Analytics.getDeviceStats(startDate),
            Analytics.getPagePerformance(startDate),
            Analytics.getTrafficSources(startDate),
            Analytics.getDailyTraffic(days)
        ]);

        // Calculate bounce rate (visitors with only one pageview)
        const bounceRate = await Analytics.aggregate([
            {
                $match: {
                    eventType: 'pageview',
                    timestamp: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$visitorId',
                    pageCount: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    totalVisitors: { $sum: 1 },
                    bouncedVisitors: {
                        $sum: { $cond: [{ $eq: ['$pageCount', 1] }, 1, 0] }
                    }
                }
            }
        ]);

        const bounceRateData = bounceRate[0] || { totalVisitors: 0, bouncedVisitors: 0 };
        const bounceRatePercentage = bounceRateData.totalVisitors > 0
            ? Math.round((bounceRateData.bouncedVisitors / bounceRateData.totalVisitors) * 100)
            : 0;

        res.status(200).json({
            success: true,
            message: "Analytics overview retrieved successfully",
            data: {
                overview: {
                    totalPageViews,
                    uniqueVisitors: uniqueVisitors.length,
                    bounceRate: bounceRatePercentage,
                    avgPagesPerVisitor: uniqueVisitors.length > 0
                        ? Math.round((totalPageViews / uniqueVisitors.length) * 100) / 100
                        : 0
                },
                deviceStats,
                pagePerformance: pagePerformance.slice(0, 10), // Top 10 pages
                trafficSources: trafficSources.slice(0, 10), // Top 10 sources
                dailyTraffic
            }
        });
    } catch (error) {
        logger.error("Error retrieving analytics overview:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

// Get page analytics
const getPageAnalytics = async (req, res) => {
    try {
        const { pageUrl } = req.params;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [
            pageViews,
            uniqueVisitors,
            avgTimeSpent,
            hourlyTraffic,
            referrers
        ] = await Promise.all([
            Analytics.countDocuments({
                eventType: 'pageview',
                pageUrl,
                timestamp: { $gte: startDate }
            }),
            Analytics.distinct('visitorId', {
                eventType: 'pageview',
                pageUrl,
                timestamp: { $gte: startDate }
            }),
            Analytics.aggregate([
                {
                    $match: {
                        eventType: 'pageleave',
                        pageUrl,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgTime: { $avg: '$timeSpent' }
                    }
                }
            ]),
            Analytics.getHourlyTraffic(startDate),
            Analytics.aggregate([
                {
                    $match: {
                        eventType: 'pageview',
                        pageUrl,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: '$referrer',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const avgTime = avgTimeSpent[0]?.avgTime || 0;

        res.status(200).json({
            success: true,
            message: "Page analytics retrieved successfully",
            data: {
                pageUrl,
                pageViews,
                uniqueVisitors: uniqueVisitors.length,
                avgTimeSpent: Math.round(avgTime),
                hourlyTraffic,
                referrers
            }
        });
    } catch (error) {
        logger.error("Error retrieving page analytics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

// Get visitor analytics
const getVisitorAnalytics = async (req, res) => {
    try {
        const { visitorId } = req.params;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [
            visitorSessions,
            totalPageViews,
            totalTimeSpent,
            deviceInfo,
            behaviorData
        ] = await Promise.all([
            Analytics.find({
                visitorId,
                timestamp: { $gte: startDate }
            }).sort({ timestamp: -1 }),
            Analytics.countDocuments({
                visitorId,
                eventType: 'pageview',
                timestamp: { $gte: startDate }
            }),
            Analytics.aggregate([
                {
                    $match: {
                        visitorId,
                        timestamp: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalTime: { $sum: '$timeSpent' }
                    }
                }
            ]),
            Analytics.findOne({
                visitorId,
                timestamp: { $gte: startDate }
            }).select('deviceInfo userAgent'),
            Analytics.getVisitorBehavior(visitorId)
        ]);

        const totalTime = totalTimeSpent[0]?.totalTime || 0;

        res.status(200).json({
            success: true,
            message: "Visitor analytics retrieved successfully",
            data: {
                visitorId,
                totalPageViews,
                totalTimeSpent: Math.round(totalTime),
                deviceInfo: deviceInfo?.deviceInfo || {},
                userAgent: deviceInfo?.userAgent || '',
                sessions: behaviorData,
                recentActivity: visitorSessions.slice(0, 20) // Last 20 activities
            }
        });
    } catch (error) {
        logger.error("Error retrieving visitor analytics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

// Get real-time analytics
const getRealTimeAnalytics = async (req, res) => {
    try {
        const minutes = parseInt(req.query.minutes) || 5;
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() - minutes);

        const [
            activeVisitors,
            currentPageViews,
            topPages,
            deviceBreakdown
        ] = await Promise.all([
            Analytics.distinct('visitorId', {
                timestamp: { $gte: startTime }
            }),
            Analytics.countDocuments({
                eventType: 'pageview',
                timestamp: { $gte: startTime }
            }),
            Analytics.aggregate([
                {
                    $match: {
                        eventType: 'pageview',
                        timestamp: { $gte: startTime }
                    }
                },
                {
                    $group: {
                        _id: '$pageUrl',
                        pageTitle: { $first: '$pageTitle' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            Analytics.aggregate([
                {
                    $match: {
                        timestamp: { $gte: startTime }
                    }
                },
                {
                    $group: {
                        _id: '$deviceInfo.device',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);

        res.status(200).json({
            success: true,
            message: "Real-time analytics retrieved successfully",
            data: {
                timeRange: `${minutes} minutes`,
                activeVisitors: activeVisitors.length,
                currentPageViews,
                topPages,
                deviceBreakdown
            }
        });
    } catch (error) {
        logger.error("Error retrieving real-time analytics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

// Get analytics export data
const exportAnalytics = async (req, res) => {
    try {
        const { format = 'json', startDate, endDate, eventType } = req.query;

        let filter = {};

        if (startDate && endDate) {
            filter.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (eventType) {
            filter.eventType = eventType;
        }

        const analyticsData = await Analytics.find(filter)
            .sort({ timestamp: -1 })
            .limit(10000); // Limit to prevent memory issues

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = [
                'visitorId',
                'eventType',
                'pageUrl',
                'pageTitle',
                'referrer',
                'device',
                'browser',
                'os',
                'timeSpent',
                'timestamp',
                'ipAddress',
                'sessionId'
            ];

            const csvRows = analyticsData.map(record => [
                record.visitorId,
                record.eventType,
                record.pageUrl,
                record.pageTitle,
                record.referrer,
                record.deviceInfo?.device || '',
                record.deviceInfo?.browser || '',
                record.deviceInfo?.os || '',
                record.timeSpent,
                record.timestamp.toISOString(),
                record.ipAddress,
                record.sessionId
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
            res.send(csvContent);
        } else {
            res.status(200).json({
                success: true,
                message: "Analytics data exported successfully",
                data: analyticsData
            });
        }
    } catch (error) {
        logger.error("Error exporting analytics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
        });
    }
};

module.exports = {
    collectAnalytics,
    getAnalyticsOverview,
    getPageAnalytics,
    getVisitorAnalytics,
    getRealTimeAnalytics,
    exportAnalytics
};