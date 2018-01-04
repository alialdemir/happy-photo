
require('dotenv-extended').load({
    path: '.env'
});
var restify = require('restify');
var builder = require('botbuilder');
var InstagramService = require('./services/instagram.service');

// Setup Restify Server
var server = restify.createServer({ url: 'localhost' });

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var _session;

var DialogLabels = {
    UserNameSearch: 'Kulanıcı adına göre arama yap',
};

// Send message
var send = function (message) {
    _session.send(message);
}

// Yardım menüsü seçenekleri listeleme
var help = function () {
    builder.Prompts.choice(
        _session,
        'Size yardımcı olabileceğim seçenekler..',
        [DialogLabels.UserNameSearch],
        {
            maxRetries: 3,
            retryPrompt: 'Geçerli bir seçenek değil!'
        });
}


// search for images by user Id
var getPhotosByUserId = function (userId) {
    InstagramService
        .getPhotosByUserId(userId)
        .then(photos => {
            for (let i = 0; i < photos.length; i++) {
                const element = photos[i];
                send(element)// test
            }
        }).catch(err => send((err)));
}

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [function (session) {
    var text = session.message.text.toUpperCase().trim();
    _session = session;
    switch (text) {
        case 'MERHABA': send('Merhaba'); break;
        case 'YARDIM':
        case 'YARDIM ET': help(); break;
        default:
            send(`Üzgünüm, '${text}' içeriğini tam olarak anlayamadım. Size nasıl yardımcı olacağımı 'yardım' veya 'yardım et' yazarak öğrenebilirsiniz..`)
            break;
    }

},
function (session, result) {
    if (!result.response) {
        // exhausted attemps and no selection, start over
        session.send('Ooops! Too many attemps :( But don\'t worry, I\'m handling that exception and you can try again!');
        return session.endDialog();
    }

    // on error, start over
    session.on('error', function (err) {
        session.send('Failed with message: %s', err.message);
        session.endDialog();
    });
    // continue on proper dialog
    var selection = result.response.entity;
    switch (selection) {
        case DialogLabels.UserNameSearch: session.beginDialog('userNameSearch');
    }
}
]);

// Instagram search dialog by user name
bot.dialog('userNameSearch', [
    (session, args, next) => {
        // store reprompt flag
        if (args) {
            session.dialogData.isReprompt = args.isReprompt;
        }

        // prompt user
        builder.Prompts.text(session, 'Instagram hesabınızın kullanıcı adı nedir?');
    },
    (session, results, next) => {
        const userId = results.response;
        getPhotosByUserId('2111701772');// sample user id
    }
]);
