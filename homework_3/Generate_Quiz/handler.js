const connect_to_db = require('./db');
const talk = require('./talk_schema');
const crypto = require('crypto');

var AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
var lambda = new AWS.Lambda();

module.exports.generate_quiz = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2))
    
    let body = {}
    if (event.body) {
        body = JSON.parse(event.body)
    }
    
    // set default
    if(!body.id_list) {
        callback(null, {
            statusCode: 404,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Could not fetch the talks. id list is null.'
        })
    }
    
    var params = {
        title: "default",
        shortAnswer: false,
        recall: false,
        mcq: true,
        whQuestions: true
    }
    
    if(body.title) {
        params.title = body.title
    }

    if(body.short_answer) {
        params.shortAnswer = body.short_answer
    }
    
    if(body.recall) {
        params.recall = body.recall
    }
    
    if(body.mcq) {
        params.mcq = body.mcq
    }
    
    if(body.wh_questions) {
        params.whQuestions = body.wh_questions
    }
    
    connect_to_db().then(() => {
        talk.find({_id:  {$in: body.id_list} }).then(talks => {
            
            if(talks.length == 0) callback(null, {
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Could not fetch the talks. All ids are invalid.'
            })
            

            let hash = crypto.createHash('md5').update(params.title + body.id_list.join('') + event.requestContext.requestId).digest("hex")
            console.log('Hash: ' + hash)
            
            callback(null, {
                statusCode: 200,
                body: JSON.stringify({_id: hash})
            })
            
            var lambda_params = {
                FunctionName: 'Generate_Quiz_Async',
                InvocationType: 'Event',
                Payload: JSON.stringify({ quiz_id: hash, params: params, id_list: body.id_list })
            };
            
            lambda.invoke(lambda_params).send()
            
            console.log("Invoked")
        }).catch(err =>
            callback(null, {
                statusCode: err.statusCode || 500,
                headers: { 'Content-Type': 'text/plain' },
                body: 'Could not fetch the talks.' + err
            })
        )
    })
}