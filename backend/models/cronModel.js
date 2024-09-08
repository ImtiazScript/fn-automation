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
    deleted: {
        type: Boolean,
        default: false,
    }

},{

    timestamps: true // This will automatically add timestamps for any operations done.

});

cronSchema.plugin(AutoIncrement, { inc_field: 'cronId' });

const Cron = mongoose.model('Cron', cronSchema);

export default Cron;