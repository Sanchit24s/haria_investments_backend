const mongoose = require("mongoose");
const logger = require("./logger");
const config = require("./config");

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(config.mongo_url);
        logger.info(`MongoDB Connected: ${connection.connection.host}`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;