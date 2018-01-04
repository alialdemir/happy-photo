const http = require('http');

var options = {
    host: 'https://api.instagram.com',
    path: '/v1/users/search?callback=jQuery111105093242224368315_1515043766187&access_token=2255098913.e029fea.2fad30bbc7724958ba5864d37f16bc44&q=ali&_=1515043766193',
    method: 'GET'
};

var getPhotos = function (username) {// test
    return new Promise((resolve, reject) => {
        http.request(options, function (res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers));
            res.on('data', function (chunk) {
                console.log('BODY: ' + chunk);
                resolve(chunk);
            });
        }).end();
    });
}

module.exports = {
    getPhotos
}