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
    fnPassword: {
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
    fnRefreshTokenGeneratedAt: {
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


// ============= Field Nation Password Hashing Middleware =============
integrationSchema.pre('save', async function (next) {
    if( !this.isModified('fnPassword') ) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.fnPassword = await bcrypt.hash(this.fnPassword, salt);
});


// ============= Password Verifying Function =============
integrationSchema.methods.matchPassword = async function (userProvidedPassword) {
    const validPassword = await bcrypt.compare(userProvidedPassword, this.fnPassword);
    return validPassword;
};

const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;