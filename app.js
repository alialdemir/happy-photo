

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
    UserNameSearch: 'Ad soyad veya kullanıcı adına göre arama yap',
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

// search for user by user name or fullname
var getUserByName = function (name) {
    InstagramService
        .getUserByName(name)
        .then(users => {
            cardCreate(users);
        }).catch(err => send((err)));
}

var cardCreator = function (users) {
    var result = [];
    send('Toplam ' + users.length + ' adet kayıt buldum. Hangi profilin analizini yapmamı istersin?')
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        var card = new builder.HeroCard(_session)
            .title(user.full_name)
            .subtitle(user.username)
            .text('')
            .images([
                builder.CardImage.create(_session, user.profile_picture)
            ])
            .buttons([
                builder.CardAction.postBack(_session, user.id, 'Analiz Et')
            ]);
        result.push(card);
    }
    return result;
}

var cardCreate = function (users) {
    var cards = cardCreator(users);


    // create reply with Carousel AttachmentLayout
    var reply = new builder.Message(_session)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);

    _session.send(reply);
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
        if (args) {
            session.dialogData.isReprompt = args.isReprompt;
        }
        if (session.message.text !== '1') {//Image analysis section
            builder.Prompts.text(session, 'Analiz yapılıyor');
            getPhotosByUserId(session.message.text);
        }
        else { // fullname or username input
            builder.Prompts.text(session, 'Aradığınız instagram hesabının kullanıcı adı veya ad soyad bilgisi nedir?');
        }
    },
    (session, results, next) => {
        const name = results.response;
        getUserByName(name);
    }
]);