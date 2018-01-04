const axios = require('axios');

var recognizeEmotions = function (url) {
    return new Promise((resolve, reject) => {
        axios.post('https://api.projectoxford.ai/emotion/v1.0/recognize', {
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': 'PUT KEY HERE'
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