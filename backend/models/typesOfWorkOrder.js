import mongoose from "mongoose";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const serviceTypeSchema = mongoose.Schema({
    id: Number,
    name: String
}, { _id: false });

const legacyTypeOfWorkSchema = mongoose.Schema({
    id: Number,
    name: String,
    industry: String
}, { _id: false });

const typesOfWorkOrderSchema = mongoose.Schema({
    typeId: {
        type: Number,
        unique: true
    },
    fnTypeId: {
        type: Number,
        unique: true
    },
    fnTypeName: {
        type: String,
        required: true
    },
    level: {
        type: Number
    },
    parentIds: [Number],
    childrenIds: [Number],
    legacyTypeOfWork: legacyTypeOfWorkSchema,
    serviceTypes: [serviceTypeSchema],
    disabled: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true // This will automatically add timestamps for any operations done.
});

typesOfWorkOrderSchema.plugin(AutoIncrement, { inc_field: 'typeId' });

const typesOfWorkOrder = mongoose.model('typesOfWorkOrder', typesOfWorkOrderSchema);

export default typesOfWorkOrder;
