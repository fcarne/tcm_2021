const connect_to_db = require('./db');

// GET BY TALK HANDLER

const quiz = require('./quiz_schema');

module.exports.get_quiz_by_id = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log('Received event:', JSON.stringify(event, null, 2));
    let body = {}
    if (event.body) {
        body = JSON.parse(event.body)
    }
    // set default
    if(!body._id) {
        callback(null, {
                    statusCode: 404,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not fetch the quizzes. id is null.'
        })
    }
    
    connect_to_db().then(() => {
        console.log('=> get quiz ' + body._id);
        quiz.findOne({_id: body._id} ).then(quiz => {
            callback(null, {
                statusCode: 200,
                body: JSON.stringify(quiz)
            })
        }).catch(err =>
            callback(null, {
                statusCode: err.statusCode || 500,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Could not fetch the quizzes.'
            })
        );
    });
};