const connect_to_db = require('./db');
const https = require('https')
require('dotenv').config({ path: './variables.env' });


const {talk, quiz} = require('./schemas');

async function request_to_api(params, transcripts_string) {
    return new Promise((resolve, reject) => {
        var query_params = Object.keys(params).map(key => key + '=' + params[key]).join('&');
        var options = {
            host: "app.quillionz.com",
            port: 8243,
            path: '/quillionzapifree/1.0.0/API/SubmitContent_GetQuestions?' + query_params,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': transcripts_string.length,
                'Authorization': 'Bearer '+ process.env.BEARER
            }
        }
        
        console.log('Options: ' + options)

        try {
            const req = https.request(options, function(res) {
                res.setEncoding('utf8');
                console.log('Status: ' + res.statusCode);
                if(res.statusCode != 200) {
                    reject(res.statusCode + ': ' + res.statusMessage)
                }
                var result = ''
                res.on('data', function(data) { result += data })
                res.on('end', function() { resolve(JSON.parse(result)) })
            });
            
            req.write(transcripts_string)
            req.end();
        } catch(err) {
            console.log(err)
            reject(err)
        }
    })
}


module.exports.async_handler = (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 2))
    
    connect_to_db().then(() => {
        var new_id = true
        quiz.find({_id: event.quiz_id}).then(talks => { if(talks.length != 0) new_id = false })
        
        if(new_id) {
            talk.find({ _id: { $in: event.id_list } }).then(async function(talks) {
                var params_clone = Object.assign({}, event.params);
                delete params_clone.title;
                
                await quiz.create({ _id: event.quiz_id, status: "generating", talks: talks, title: event.params.title, question_params: params_clone })

                var transcripts = []
                talks.forEach(talk => {
                    var sentences = talk.transcript.map(transcript => { return transcript.sentence })
                    transcripts.push(sentences.join(''))
                })
                
                var transcripts_string =  transcripts.join("\n\n")
                
                console.log("Transcript: " + transcripts_string)
                
                await request_to_api(event.params, transcripts_string).then(result => {
                    var questions = result.Data
                    questions.whQuestions.questionVariations = questions.whQuestions.questionVariations.filter(variation => {
                        variation.questionList = variation.questionList.filter(question => question.Answer != 'Quillionz is unable to find the answer.')
                        return variation.questionList.length > 0
                    })
                    console.log('Questions: ' + JSON.stringify(questions))
                    quiz.findByIdAndUpdate(event.quiz_id, {status: "to_validate", questions: questions }, function() {})
                }, error => {
                    quiz.findByIdAndUpdate(event.quiz_id, { status: "error", error: error })              
                }).catch(err => quiz.findByIdAndUpdate(event.quiz_id, { status: "error", error: err }) )
                
                
                console.log('Done!')
            }).catch(err => quiz.findByIdAndUpdate(event.quiz_id, {status: "error", error: err}))
        }
    })
}