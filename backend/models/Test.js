const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    title:{
        type : String,
        required : true,
        trim : true
    },
    // modules
    module:{
        type : String,
        required : true,
        enum : ['listening', 'reading', 'writing', 'speaking']
    },
    description:{
        type : String,
        trim : true
    },
    // number of totalQuestions 
    totalQuestions:{
        type : Number,
        required : true,
        default : 0
    },
    //number of totalSections
    totalSections:{
        type : Number,
        required : true,
        default : 0
    },
    //duration of the test in minutes 
    duration: {
        type : Number,
        required : true
    },
    difficulty:{
        type : String,
        enum : ['easy', 'medium', 'hard'],
        default : 'medium'
    },
    //test status
    isActive : {
        type : Boolean,
        default : true
    },
    //created by admin or teacher
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required : true
    },
    //instructions for test
    instructions:{
        type : String,
        trim : true,
    }
},
{
    timestamps : true
})

// Virtual field to get sections
testSchema.virtual('sections', {
  ref: 'Section',
  localField: '_id',
  foreignField: 'testId'
});

// Make sure virtuals are included when converting to JSON
testSchema.set('toJSON', { virtuals: true });
testSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Test', testSchema);