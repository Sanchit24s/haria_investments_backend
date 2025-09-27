const { Router } = require("express");
const errorHandler = require("../middlewares/errorHandler");
const contactRouter = require("./contactRoutes");
const authRouter = require("./authRoutes");

const router = Router();

router.use("/auth", authRouter);
router.use("/contact", contactRouter);

router.use(errorHandler);

module.exports = router; 