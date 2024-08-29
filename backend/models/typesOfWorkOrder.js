import mongoose from "mongoose";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const cronSchema = mongoose.Schema({
    typeId: {
        type: Number,
        unique: true
    },
    typeName: {
        type: String,
        required: true
    },
    fnTypeId: {
        type: Number,
        unique: true
    },
    fnTypeName: {
        type: String,
        required: true
    },
    deleted: {
        type: Boolean,
        default: false,
    }
},{

    timestamps: true // This will automatically add timestamps for any operations done.

});

cronSchema.plugin(AutoIncrement, { inc_field: 'typeId' });

const typesOfWorkOrder = mongoose.model('typesOfWorkOrder', cronSchema);

export default typesOfWorkOrder;