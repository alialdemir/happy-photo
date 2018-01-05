require('dotenv-extended').load({
    path: '.env'
});
const axios = require('axios');
var querystring = require('querystring');


var recognizeEmotions = function (imageUrl) {
    return new Promise((resolve, reject) => {
        // Send a POST request
        axios({
            method: 'post',
            url: process.env.Emotion_API_URL,
            data: {
                url: imageUrl
            },
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.Emotion_API_SUBSCRIPTION_KEY
            }
        }).then((response) => {
            resolve(response.data);
        }).catch((error) => {
            console.log(error)

        });
    });
}

module.exports = {
    recognizeEmotions
}