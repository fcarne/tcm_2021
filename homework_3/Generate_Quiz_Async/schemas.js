const mongoose = require('mongoose');


const talk_schema = new mongoose.Schema({
    _id: String,
    title: String,
    url: String,
    transcript: [Object]
}, { collection: 'gerry_data' });

const quiz_schema = new mongoose.Schema({
    _id: String,
    status: String,
    talks: [talk_schema],
    title: String,
    question_params: Object,
    error: String,
    questions: Object
}, { collection: 'gerry_quiz_data', versionKey: false});


module.exports = {
    talk: mongoose.model('talk', talk_schema),
    quiz: mongoose.model('quiz', quiz_schema)
}