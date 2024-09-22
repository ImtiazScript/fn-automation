import mongoose from "mongoose";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const cronSchema = mongoose.Schema({
    cronId: {
        type: Number,
        unique: true
    },
    userId: {
        type: Number,
        required: true
    },
    centerZip: {
        type: Number,
        required: true
    },
    cronStartAt: {
        type: Date,
        required: true
    },
    cronEndAt: {
        type: Date,
        required: true,
    },
    workingWindowStartAt: {
        type: String,
        required: true
    },
    workingWindowEndAt: {
        type: String,
        required: true,
    },
    drivingRadius: {
        type: Number,
        required: true
    },
    requestedWoIds: {
        type: [Number],
        required: false
    },
    totalRequested: {
        type: Number,
        required: false
    },
    status: {
        type: String,
        required: true
    },
    typesOfWorkOrder: {
        type: [String],
        required: false
    },
    isFixed: {
        type: Boolean,
        default: false,
    },
    fixedPayment: {
        type: Number,
        required: false
    },
    isHourly: {
        type: Boolean,
        default: false,
    },
    hourlyPayment: {
        type: Number,
        required: false
    },
    isPerDevice: {
        type: Boolean,
        default: false,
    },
    perDevicePayment: {
        type: Number,
        required: false
    },
    isBlended: {
        type: Boolean,
        default: false,
    },
    firstHourlyPayment: {
        type: Number,
        required: false
    },
    additionalHourlyPayment: {
        type: Number,
        required: false
    },
    isEnabledCounterOffer: {
        type: Boolean,
        default: false,
    },
    offDays: {
        type: [String],
        required: false
    },
    timeOffStartAt: {
        type: Date,
        required: false
    },
    timeOffEndAt: {
        type: Date,
        required: false,
    },
    timeZone: {
        type: String,
        required: true,
    },
    deleted: {
        type: Boolean,
        default: false,
    }

}, {

    timestamps: true // This will automatically add timestamps for any operations done.

});

cronSchema.plugin(AutoIncrement, { inc_field: 'cronId' });

const Cron = mongoose.model('Cron', cronSchema);

export default Cron;