var http = require('http')
var os = require('os')
var url = require('url')
var fs = require('fs')
var path = require('path')
var util = require('util')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var moment = require('moment')
var debug = require('debug')
var request = require('request')
var xml2js = require('xml2js')

var net=require("net")
var mkdirp=require("mkdirp")


var APIKEY = ''
var CONFIG = require('./config.json')
var CLIENT = CONFIG.client||0
console.log('client: ', CLIENT)
var filesFolder = CONFIG.filesFolder || ['E:\\公司共享资料_误删', 'D:\\传仓库资料_勿删'][CLIENT]
var jobFolder = filesFolder+'\\打印任务'
var jobLogFile = jobFolder+'\\PrintLog'+CLIENT+'.txt'
var jobLogFileLocal = jobFolder+'\\PrintLog'+(1-CLIENT)+'.txt'
var printerName = CONFIG.printerName || ['\\\\pcdyj\\TOSHIBA e-STUDIO181', '\\\\pc03\\TOSHIBA e-STUDIO2507Series PCL6'][CLIENT]
var PDFReaderPath = CONFIG.readerPath || "c:\\Program Files\\SumatraPDF\\SumatraPDF.exe"
var backupFolder = CONFIG.backupFolder || "e:\\sync_backup"

var syncthingFolder = path.resolve(__dirname, '..')
var syncthingConfig = syncthingFolder + '/config/config.xml'
var SyncChild = null
var SyncConfig = {}

mkdirp(backupFolder)
mkdirp(jobFolder)
reloadConfig()

function reloadConfig(){
    fs.readFile( syncthingConfig, function(err, data) {
        var parser = new xml2js.Parser()
        parser.parseString(data, function (err, result) {
            if(err) return console.log( 'error parsing syncthing config.xml' )
            SyncConfig = result
            // console.dir( JSON.stringify(result) );
            APIKEY = result.configuration.gui[0].apikey[0]
            console.log(APIKEY)
            var app = result.configuration.folder.find(function(v){ return v.$.id=='app' })
            if(app){
              var xml = fs.readFileSync(syncthingConfig, 'utf8')
              xml = xml.replace( /<folder id="app" path="[^"]*"/, '<folder id="app" path="'+ __dirname +'"' )
              xml = xml.replace( /<folder id="files" path="[^"]*"/, '<folder id="files" path="'+ filesFolder +'"' )
              fs.writeFileSync(syncthingConfig, xml)
              // app.$.path = __dirname
              // var builder = new xml2js.Builder()
              // var xml = builder.buildObject(result)
              // fs.writeFileSync(syncthingFolder+'/abc.xml', xml)
            }
            if(!SyncChild) SyncChild = exec('syncthing.exe -home=config -no-browser', {cwd:syncthingFolder}, function(err){ console.log(err) })
        })
    })
}

function closeSyncThing(cb){
  request({ method: 'POST', uri: 'http://127.0.0.1:8384/rest/system/shutdown',  headers:{ 'X-API-Key': APIKEY } }, cb)
}

var PrintTcp = exec(path.join(__dirname, 'PrintTcp.exe'), {cwd:__dirname}, function(err){ console.log(err) })
var PrintLogCmd = path.join(__dirname, 'PrintLog.exe') + ' "'+jobFolder+'" ' + CLIENT
// var PrintLog = exec(PrintLogCmd, {cwd:__dirname}, function(err){ console.log(err) })
console.log(PrintLogCmd)

function log_old(str) {
  if(!CONFIG.debug) return
  console.log(moment().format('[YYYY-MM-DD HH:mm:ss]'), str)
}
var log = debug('app:lysync')

http.createServer(function (req, res) {
  var obj = url.parse(req.url, true)
  var query = obj.query
  if(query.action=='shutdown'){
    closeSyncThing(function(err, retRes, body){
      res.writeHead(retRes.statusCode, retRes.headers)
      res.end(body)
    })
    return
  }
  res.writeHead(200, {'Content-Type': 'text/plain'})
  res.end(req.url)
}).listen(12301)



var since = 0
function loopBack(){
  var param = since || '0&limit=1'
  request.get("http://localhost:8384/rest/events?since="+param, {timeout:11000}, function(err, res, data){
    if (err) {
      since = 0
      setTimeout(loopBack, 1000)
      return log('error connect server', err)
    }
    try{
      data=JSON.parse(data)
    }catch(e){
      since = 0
      setTimeout(loopBack, 1000)
      return log('error parse data', data)
    }
    if(!data.length){
      since = 0
      setTimeout(loopBack, 1000)
      return log('no data available\n', JSON.stringify(data));
    }
    if(since===0) {
      log(data.id, data.type, typeof data, data) 
      since=data[0].id
    }else{
      since+=data.length
      if(data.length>1|| !/StateChanged|Ping/.test(data[0].type)) {
        log('*** data is',typeof data, data, '\n\n') 
      }
      for (var i = 0, len = data.length; i < len; i++) {
        // Data Format:
        // {type:'ItemFinished', id:1, data:{ action: 'update',
        //   error: null,
        //   folder: 'files',
        //   item: 'pdf\\复件 app.txt',
        //   type: 'file' }}
        var item = data[i]
        // config changed
        if(item.type=='ConfigSaved') reloadConfig()

        // local print
        if(item.type=='LocalIndexUpdated' && item.data.items){
          item.data.filenames.forEach(function(v, i){
            if(v.match(/\.pdf/)) printLog(v, 'LocalIndexUpdated')
          })
        }

        // remote print
        if(item.type=='ItemFinished' && 
           item.data.action=='update' && 
           item.data.type=='file' &&
           item.data.error==null  ){
             var fullPath = path.join(filesFolder, item.data.item)
             var fileObj = path.parse(item.data.item)
             if(fileObj.base.match(/^print_job_/) && fileObj.ext=='.pdf'){
               printPDF(fullPath)
             }
        }
      }
    }
    // setTimeout(loopBack, 1000)
    loopBack()
  })
}
loopBack()


function printPDF(file) {
  var cmd = util.format( CONFIG.printCommand || '"%s" -silent -print-to "%s" -print-settings "fit" "%s"', PDFReaderPath, printerName, file )
  log(cmd)
  // exec( path.join(__dirname, 'sound.vbs'), {cwd:__dirname}, function(e){ console.log(e) })
  // return
  var child = exec(cmd, function printFunc(err, stdout, stderr) {
    log('print result',child.pid, err, stdout, stderr)
    if(err) {
        printLog(file, '失败')
        return log('print error', file, err)
    }
    printLog(file, '成功')
    request.get('http://127.0.0.1:12300', {timeout:100}, function(err){ console.log(err) })
    setTimeout(function(){
//      fs.unlink(file, function (err) {
//        if(err) log('cannot delete file ', file)
//      })
		fs.rename(file, path.join(backupFolder, path.basename(file)), function(e){ if(e) console.log(e) })
    }, 3000)
  })
}

function printLog(file, status){
  // tutpoint: moment.format('[plain YYYY]') will output plain string
  var filename = path.basename(file).replace('print_job_','')
  var content = fs.readFileSync(jobLogFile, 'utf8')
  var isNew = content.indexOf(filename)<0
  if(status==='LocalIndexUpdated'){
    if(!isNew) return
    jobLogFile = jobLogFileLocal
    status = isNew ? '未发送' : '打印成功'
  }
  if(!isNew){
    content = content.replace(new RegExp(filename+'.*'), filename+' : '+status)
    fs.writeFileSync(jobLogFile, content, 'utf8')
  } else {
    fs.appendFile(jobLogFile, moment().format('\\[YYYY-MM-DD HH:mm:ss\\] ')+ filename + ' : ' + status +os.EOL, function (err) {})
  }
}

var checkInterval = setInterval(checkStatus, 5000)

function checkStatus(){
  request.get('http://127.0.0.1:8384/rest/system/error', function(err, res, data){
    if (err) {
      return log('error connect server', err)
    }
    try{
      data=JSON.parse(data)
    }catch(e){
      return log('error parse data', data)
    }
    // {"errors":[{"when":"2016-03-04T15:06:10.74125+08:00","message":"Stopping folder \"files\" - folder marker missing"}]}
    // {"errors":null}
    if(!data.errors) return
    var msg = data.errors.shift().message.match( /folder "([^"]*)"/ )
    var folder = msg && msg.pop()
    if( folder ){
      var app = SyncConfig.configuration.folder.find(function(v){ return v.$.id==folder })
      mkdirp( app.$.path )
      fs.writeFileSync(app.$.path + '\\.stfolder', '')
      exec('attrib +a +s +h "'+ app.$.path + '\\.stfolder"')
      clearAllErrors()
    }
  })
}

function clearAllErrors(){
  // POST /rest/system/error/clear
  request(
    {method: 'POST', uri: 'http://127.0.0.1:8384/rest/system/error/clear',  headers:{ 'X-API-Key': APIKEY }}, 
    function(err, res, body){ console.log('clearAllErrors', body) }
  )
}

