const { Router } = require("express");
const errorHandler = require("../middlewares/errorHandler");
const contactRouter = require("./contactRoutes");
const authRouter = require("./authRoutes");
const analyticsRouter = require("./analyticsRoutes");

const router = Router();

router.use("/auth", authRouter);
router.use("/contact", contactRouter);
router.use("/analytics", analyticsRouter);

router.use(errorHandler);

module.exports = router; 