const mongoose = require('mongoose');
const validator = require('validator');

const contactSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long'],
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long'],
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        validate: {
            validator: function (email) {
                return validator.isEmail(email);
            },
            message: 'Please provide a valid email address'
        }
    },
    services: {
        type: [String],
        required: [true, 'At least one service must be selected'],
        validate: {
            validator: function (services) {
                return services && services.length > 0;
            },
            message: 'At least one service must be selected'
        },
        enum: {
            values: ['Insurance', 'Mutual Funds', 'Equity', 'Fixed Income'],
            message: 'Invalid service selected'
        }
    },
    message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters'],
        default: ''
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'in_progress', 'completed', 'closed'],
        default: 'new'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
contactSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for age of contact
contactSchema.virtual('ageInDays').get(function () {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Index for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Static method to get contacts by status
contactSchema.statics.getByStatus = function (status) {
    return this.find({ status });
};

// Static method to get contacts by service
contactSchema.statics.getByService = function (service) {
    return this.find({ services: { $in: [service] } });
};

// Instance method to update status
contactSchema.methods.updateStatus = function (newStatus) {
    this.status = newStatus;
    return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);
