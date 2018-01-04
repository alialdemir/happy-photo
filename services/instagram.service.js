const axios = require('axios');

// search for images by user Id
var getPhotosByUserId = function (userId) {
    return new Promise((resolve, reject) => {
        console.log('user idddddddddddddddddddddd' + userId)
        axios.get('https://api.instagram.com/v1/users/' + userId + '/media/recent/?access_token=2255098913.e029fea.2fad30bbc7724958ba5864d37f16bc44&_=1515043766194')
            .then(response => {
                var photos = response.data.data;
                var result = [];
                for (let i = 0; i < photos.length; i++) {
                    const element = photos[i];
                    result.push(element.images.standard_resolution.url);
                }
                resolve(result);
            }).catch(error => console.log(error));
    });
}

module.exports = {
    getPhotosByUserId
}