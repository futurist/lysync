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

var WmiClient = require('wmi-client')

var wmi = new WmiClient({
  host: '127.0.0.1'
})

var sheetGetAllText = require('./xls.js')
var xlsTexts = {}

// for pint in queue
var printQueue = []
var prefixSelf = 'printjob_'+CLIENT+'_'

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

mkdirp.sync(backupFolder)
mkdirp.sync(jobFolder)

startupQueue()
reloadConfig()

function startupQueue () {
  fs.readdir(jobFolder, function(err, files) {
    files.forEach(function(v, i) {
      // if it's queued, do nothing
      var ext = path.extname(v)
      var fullPath =  path.join(jobFolder, v)
      if ( v.indexOf('printjob_') == 0 && v.indexOf(prefixSelf) < 0 && ext === '.pdf') {
        // remote print, yours
        printQueue.push(fullPath)
      }
    })
  })
}

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
function loopBack() {
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
            // if(v.match(/\.pdf$/)) printLog(v, 'LocalIndexUpdated')
            // else if(v.match(/\.sta$/)){}
          })
        }

        // remote print
        if(item.type=='ItemFinished' &&
           item.data.action=='update' &&
           item.data.type=='file' &&
           item.data.error==null  ){
          //nircmd qboxcom "sdoifj" "111" shexec "open" "c:\abc.log"
          var file = item.data.item
          var fullPath = path.join(filesFolder, file)
          var fileObj = path.parse(file)
          if(fileObj.base.match(/^printjob_/)) {
            if(fileObj.ext=='.pdf') {
              printQueue.push(fullPath)
            }
            if (fileObj.ext == '.sta') {
              fs.readFile(fullPath, 'utf8', function (e, data) {
                if (e) return log(e)
                printLog(file, data)
                setTimeout(function () { fs.unlink(fullPath, function () {}) }, 1000)
              })
            }
            if(fileObj.base.indexOf('拉货计划.xls') > -1) {
              var text = sheetGetAllText(fullPath)
              if(xlsTexts[fullPath] !== text) {
                xlsTexts[fullPath] = text
                ;['PC33'].forEach(function(host) {
                  nircmd('nircmd qboxcomtop "拉货计划有更新，是否打开?" "拉货计划有更新" shexec "open" "'+ path.join('M:', file) +'"', host)
                })
              }
            }
          }
        }
      }
    }
    // setTimeout(loopBack, 1000)
    loopBack()
  })
}
loopBack()

function checkAndPrint () {
  if (!printQueue.length) return
  var printer = printerName.replace(/\\/g, '\\\\')
  // printer = 'Bull'
  wmi.query('SELECT * FROM Win32_Printer WHERE DeviceID = "' + printer + '"', function (err, result) {
    if (err || !result || !result.length) {
      // printer not exists
      return console.log('printer not found', printerName)
    }
    var p = result[0]
    var printerID = p.DeviceID
    if (p.PrinterStatus == 3 && p.WorkOffline === false) {
      // printer exists, and it's ready: GO PRINT
      //  2='Unknown', 3='Idle', 4='Printing', 5='Warmup'
      printQueue.forEach(function (v) {
        console.log('printing', printerID)
        printPDF(v, printerID)
      })
      printQueue = []
    } else {
      // printer exists, but ait's not ready
      console.log('printer offline', printerID)
    }
  })
}

var printerInterval = setInterval(checkAndPrint, 1000)

function nircmd(cmd, host) {
  host = host || '127.0.0.1'
  // try c++ version
  request.get('http://' + host + ':12310/cmd?' + encodeURIComponent(cmd), {timeout: 10000}, function (err, resp) {
    if (!err && resp.statusCode == 200 && resp.headers['x-app'] == 'tcpmsg') return
    // try c# version
    request.get('http://' + host + ':12300/?cmd=' + encodeURIComponent(cmd), {timeout: 10000}, function (err, resp) {
      if (err) return console.log('nircmd error', cmd)
    })
  })
}

function printPDF(file, printerID) {
  var cmd = util.format( CONFIG.printCommand || '"%s" -silent -print-to "%s" -print-settings "fit" "%s"', PDFReaderPath, printerID, file )
  log(cmd)
  // exec( path.join(__dirname, 'sound.vbs'), {cwd:__dirname}, function(e){ console.log(e) })
  // return
  var child = exec(cmd, function printFunc(err, stdout, stderr) {
    log('print result',child.pid, err, stdout, stderr)
    if(err) {
      // printLog(file, '失败', jobLogFile)
      fs.writeFile(file+'.sta', '打印失败', 'utf8', function(){})
      return log('print error', file, err)
    }
    // printLog(file, '成功', jobLogFile)
    fs.writeFile(file+'.sta', '打印成功', 'utf8', function(){})
    nircmd('mediaplay 10000 "success.wav"')

    // use below instead of rename
    fs.createReadStream(file).pipe(fs.createWriteStream(path.join(backupFolder, path.basename(file))))
      .on('finish', function(){
        fs.unlink(file)
      })

    setTimeout(function(){
      // fs.unlink(file, function (err) {
      //   if(err) log('cannot delete file ', file)
      // })
      log('rename file', file,path.join(backupFolder, path.basename(file)))
      // below not work when d: to e: : Error: EXDEV: cross-device link not permitted, rename, use pipe above
		  // fs.rename(file, path.join(backupFolder, path.basename(file)), function(e){ if(e) console.log(e) })
    }, 1000)
  })
}

function printLog(file, status, logFileName) {
  logFileName = logFileName || jobLogFileLocal
  var content,filename = path.basename(file).replace(/^printjob_\d+_/, '').replace(/\.sta$/, '')
  try { content = fs.readFileSync(logFileName, 'utf8')} catch(e) {content = '' }
  var isNew = content.indexOf(filename)<0
  if(status==='LocalIndexUpdated'){
    if(!isNew) return
    status = isNew ? '未发送' : '打印成功'
  }
  if(!isNew){
    content = content.replace(new RegExp(filename+'.*'), filename+' : '+status)
    fs.writeFile(logFileName, content, 'utf8', function(){})
  } else {
    // tutpoint: moment.format('[plain YYYY]') will output plain string
    fs.appendFile(logFileName, moment().format('\\[YYYY-MM-DD HH:mm:ss\\] ')+ filename + ' : ' + status +os.EOL, function (err) {})
  }

  try{
    var host = filename.split('-').slice(0,-2).join('-').substr(1)
    nircmd('exec show "M:\\打印任务\\打印记录.exe" "" ' + CLIENT, host)
  }catch(e) {
    log('send host nircmd error')
  }
}

var checkInterval = setInterval(checkStatus, 5000)

function checkStatus() {
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
      mkdirp.sync( app.$.path )
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

