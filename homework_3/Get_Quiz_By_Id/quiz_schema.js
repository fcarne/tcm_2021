const mongoose = require('mongoose');

const transcript_schema = new mongoose.Schema({
    timestamp: String,
    sentence: String,
});

const talk_schema = new mongoose.Schema({
    _id: String,
    title: String,
    url: String,
    transcript: [transcript_schema]
}, { collection: 'gerry_data' });

const quiz_schema = new mongoose.Schema({
    _id: String,
    status: String,
    talks: [talk_schema],
    title: String,
    question_params: Object,
    error: String,
    questions: Object
}, { collection: 'gerry_quiz_data'});


module.exports = mongoose.model('quiz', quiz_schema)