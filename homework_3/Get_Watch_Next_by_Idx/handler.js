const connect_to_db = require('./db');

// GET BY TALK HANDLER

const talk = require('./talk_schema');

module.exports.get_watch_next_by_id = (event, context, callback) => {
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
                    body: 'Could not fetch the talks. id is null.'
        })
    }
    
    var slice= {}
    if (body.slice) {
        slice = { watch_next: { $slice: body.slice} }
    }
    
    connect_to_db().then(() => {
        console.log('=> get watch_next talks for ' + body._id);
        talk.findOne({_id: body._id}, slice )
            .then(talks => {
                    callback(null, {
                        statusCode: 200,
                        body: JSON.stringify(talks.watch_next)
                    })
                }
            )
            .catch(err =>
                callback(null, {
                    statusCode: err.statusCode || 500,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Could not fetch the talks.'
                })
            );
    });
};