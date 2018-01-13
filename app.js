

require('dotenv-extended').load({
    path: '.env'
});
var restify = require('restify');
var builder = require('botbuilder');
var InstagramService = require('./services/instagram.service');
var EmotionApiService = require('./services/emotion.api.service');

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

// Help menu options list
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

// Send carousel card
var cardBuilder = function (attachments, attachmentLayout) {
    var reply = new builder.Message(_session)
        .attachmentLayout(attachmentLayout)
        .attachments(attachments);

    _session.send(reply);
}
//Gives maximum emotio value and key
var getEmotionHighest = function (obj) {
    var maxKey = Object.keys(obj).sort(function (a, b) {
        return obj[a] < obj[b];
    })[0];

    return {
        key: maxKey,
        value: obj[maxKey]
    };
}

var emotionTurkish = function (emotionHighest) {
    switch (emotionHighest.key) {
        case 'anger': return 'öfkeli';
        case 'contempt': return 'aşağılama';
        case 'disgust': return 'iğrenme';
        case 'fear': return 'korkmuş';
        case 'happiness': return 'mutlu';
        case 'neutral': return 'duygusuz';
        case 'sadness': return 'kederli';
        case 'surprise': return 'şaşkın';
        default:
            return 'güzel';
    }
}

var photoCardCreator = function (scores, imageUrl) {
    var emotionHighest = getEmotionHighest(scores);

    var turkishEmotion = emotionTurkish(emotionHighest);
    return new builder.HeroCard(_session)
        .title('%' + emotionHighest.value + ' oranla ' + turkishEmotion + ' görünüyorsun.')
        .subtitle('')
        .text('')
        .images([
            builder.CardImage.create(_session, imageUrl)
        ])/*
        .buttons([
            builder.CardAction.openUrl(_session, 'https://azure.microsoft.com/en-us/services/storage/', 'Learn More')
        ])*/;
}

// 
var recognizeEmotions = function (url) {
    return new Promise((resolve, reject) => {
        EmotionApiService
            .recognizeEmotions(url)
            .then(data => {
                for (let i = 0; i < data.length; i++) {
                    const element = data[i];

                    var scores = {// Percent emotion calculations
                        anger: Math.ceil(element.scores.anger * 100),
                        contempt: Math.ceil(element.scores.contempt * 100),
                        disgust: Math.ceil(element.scores.disgust * 100),
                        fear: Math.ceil(element.scores.fear * 100),
                        happiness: Math.ceil(element.scores.happiness * 100),
                        neutral: Math.ceil(element.scores.neutral * 100),
                        sadness: Math.ceil(element.scores.sadness * 100),
                        surprise: Math.ceil(element.scores.surprise * 100),
                    }
                    var card = photoCardCreator(scores, url);
                    resolve(card);
                }
            }).catch(err => send((err)));
    });
}

// Search for images by user Id
var getPhotosByUserId = function (userId) {
    InstagramService
        .getPhotosByUserId(userId)
        .then(photos => {
            const photoCount = photos.length;
            if (photoCount > 0) {
                send('Hesapta  toplam ' + photoCount + ' resim var bunları sıra ile analiz ediyorum. Biraz bekle!');
                var photoCardItems = [];

                for (let i = 0; i < photoCount; i++) {
                    const url = photos[i];
                    recognizeEmotions(url).then(photoCard => {
                        photoCardItems.push(photoCard);
                        if (i === (photoCount - 1)) { cardBuilder(photoCardItems, builder.AttachmentLayout.carousel); }
                    });
                }
            }
            else { send('Bu hesabın resimlerine erişemedim.'); }
        }).catch(err => send((err)));
}

// Search for user by user name or fullname
var getUserByName = function (name) {
    InstagramService
        .getUserByName(name)
        .then(users => {
            userCardCreate(users);
        }).catch(err => send((err)));
}

// Returns the user card list
var userCardCreator = function (users) {
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

// Send carousel to chat
var userCardCreate = function (users) {
    var cards = userCardCreator(users);

    cardBuilder(cards, builder.AttachmentLayout.carousel);
}

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [function (session) {
    var text = session.message.text.toUpperCase().trim();
    _session = session;
    switch (text) {
        case 'MERHABA': send('Merhaba'); help(); break;
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