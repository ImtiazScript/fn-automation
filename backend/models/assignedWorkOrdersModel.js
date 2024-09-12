import mongoose from "mongoose";
import pkg from 'mongoose-sequence';

const AutoIncrement = pkg(mongoose);

const assignedWorkOrdersSchema = mongoose.Schema({
    assignedId: {
        type: Number,
        unique: true
    },
    userId: {
        type: Number,
        required: true
    },
    workOrderId: {
        type: Number,
        required: true
    },
    schedule: {
        type: Object,
        required: false,
    },
    pay: {
        type: Object,
        required: false,
    },
    eta: {
        type: Object,
        required: false,
    },
    assignee: {
        type: Object,
        required: false,
    }
},{

    timestamps: true // This will automatically add timestamps for any operations done.

});

assignedWorkOrdersSchema.plugin(AutoIncrement, { inc_field: 'assignedId' });

const AssignedWorkOrders = mongoose.model('AssignedWorkOrders', assignedWorkOrdersSchema);

export default AssignedWorkOrders;