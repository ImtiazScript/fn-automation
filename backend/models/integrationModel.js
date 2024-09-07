import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const integrationSchema = mongoose.Schema({
    integrationId: {
        type: Number,
        unique: true
    },
    userId: {
        type: Number,
        required: true,
        unique: true,
    },
    fnUserId: {
        type: Number,
        required: true,
        unique: true,
    },
    fnUserName: {
        type: String,
        required: false
    },
    fnAccessToken: {
        type: String,
        required: false
    },
    fnRefreshToken: {
        type: String,
        required: false,
    },
    lastConnectedAt: {
        type: Date,
        required: false,
    },
    integrationStatus: {
        type: String,
        required: false
    },
    disabled: {
        type: Boolean,
        required: false,
        default: false,
    },
},{
    timestamps: true
});

integrationSchema.plugin(AutoIncrement, { inc_field: 'integrationId' });

const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;