import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    profileImageName: {
        type: String
    },
    userId: {
        type: Number,
        unique: true
    },
    isFnServiceCompanyAdmin: {
        type: Boolean,
        default: false
    },
    deleted: {
        type: Boolean,
        required: false
    },
},{
    timestamps: true
});

userSchema.plugin(AutoIncrement, { inc_field: 'userId' });

// ============= Password Hashing Middleware =============
userSchema.pre('save', async function (next) {
    if( !this.isModified('password') ) {
        next();
        // If the existing password in user schema was not modified, then avoid hashing and move to next middleware
        // This check is done here because the user schema will have other updates which dosen't involve password updation
        // in that case rehashing password will be skipped
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

});

// ============= Password Verifying Function =============
userSchema.methods.matchPassword = async function (userProvidedPassword) {
    const validPassword = await bcrypt.compare(userProvidedPassword, this.password);
    return validPassword;

};

// ============= Blocked Status Returning Function =============
userSchema.methods.isBlocked = function () {
    return this.blocked;
};

const User = mongoose.model('User', userSchema);
export default User;