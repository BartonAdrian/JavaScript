const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    heading: {
        type: String
    },
    state: {
        type: String
    },
    date: {
        type: Date,
        required: false,
        default: Date.now
    }
})

//---------Export-----------
module.exports = mongoose.model('Task', taskSchema);
//--------------------------