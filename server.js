require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./config/logger");
const config = require("./config/config");
const router = require("./routes/index");
const connectDB = require("./config/db");


const app = express();

connectDB();

app.use(helmet());
app.use(
    cors({
        origin: config.client_url || "http://localhost:8080",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    morgan("combined", {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    })
);

app.get("/", (req, res) => {
    logger.info("Root route hit");
    res.status(200).json({ msg: "Hello" });
});

app.use("/api/v1", router);

const PORT = config.port || 8000;

app.listen(PORT, () => {
    logger.info(`🚀 Server running locally at http://localhost:${PORT}`);
});