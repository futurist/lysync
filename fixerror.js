
var exec = require('child_process').exec
var mkdirp = require('mkdirp')
var fs = require('fs')
var request = require('request')

APPFOLDER = 'f:\\上传\\syncthing\\oijojoj'
APIKEY = 'zw5AUmHbOcWgWXiUSq9Lz4zCdLDtrONd'

function clearAllErrors(){
  // POST /rest/system/error/clear
  request(
    {method: 'POST', uri: 'http://127.0.0.1:8384/rest/system/error/clear',  headers:{ 'X-API-Key': APIKEY }}, 
    function(err, res, body){ console.log('clearAllErrors', body) }
  )
}

mkdirp( APPFOLDER )
fs.writeFileSync(APPFOLDER + '\\.stfolder', '')
exec('attrib +a +s +h "'+ APPFOLDER + '\\.stfolder"')
clearAllErrors()


