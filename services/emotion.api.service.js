require('dotenv-extended').load({
    path: '.env'
});
const axios = require('axios');

var recognizeEmotions = function (url) {
    return new Promise((resolve, reject) => {
        axios.post(process.env.Emotion_API_URL, {
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.Emotion_API_SUBSCRIPTION_KEY
            },
            body: JSON.stringify({
                url: url
            })
        })
            .then(response => {
                resolve(response);
            }).catch(error => console.log(error));
    });
}

module.exports = {
    recognizeEmotions
}