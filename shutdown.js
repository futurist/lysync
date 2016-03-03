
var request = require('request')
request(
    {
        method: 'POST',
        uri: 'http://127.0.0.1:8384/rest/system/shutdown', 
        headers:{
			'X-API-Key': 'Hr4wzdlhH05v9O9QHXJ5hdR600ZmoHF0'
		}
    },
    function  (err, res, body) {
        console.log(err, res.httpVersion,  res.statusCode, res.statusMessage, res.headers, body)
    }
)
