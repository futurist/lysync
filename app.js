var http = require('http')
var url = require('url')
var fs = require('fs')
var path = require('path')
var util = require('util')
var exec = require('child_process').exec
var debug = require('debug')
var request = require('request')

var net=require("net") 


var CONFIG = require('./config.json')
var CLIENT = CONFIG.client||0
console.log('client: ', CLIENT)
var filesFolder = ['E:\\公司共享资料_误删', 'D:\\传仓库资料_勿删'][CLIENT]
var printerName = ['\\\\pcdyj\\TOSHIBA e-STUDIO181', '\\\\pc03\\TOSHIBA e-STUDIO2507Series PCL6'][CLIENT]
var PDFReaderPath = "c:\\Program Files\\SumatraPDF\\SumatraPDF.exe"

function log_old(str) {
  if(!CONFIG.debug) return
  console.log(moment().format('[YYYY-MM-DD HH:mm:ss]'), str)
}
var log = debug('app:lysync')

net.createServer(function(socket){
  socket.on("error",function(err){
    if(err){
      log(err)
    }
  })
  socket.on("data", function(data){
    if(!data)return
    data = data.toString()
    log(data)

    if(data==="exit"){
      socket.write("exit")
      return
    }
    
    try{
      data = JSON.parse(data)
    }catch(e){
      log('bad json')
    }
    
    

  })
})
.listen(81, function(){log('socket ready')})

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
  var cmd = util.format( '"%s" -silent -print-to "%s" "%s"', PDFReaderPath, printerName, file ) 
  log(cmd)
  exec( path.join(__dirname, 'sound.vbs'), {cwd:__dirname}, function(e){ console.log(e) })
  return
  var child = exec(cmd, function printFunc(err, stdout, stderr) {
    log('print result',child.pid, err, stdout, stderr)
    if(err) return log('print error', err)
    setTimeout(function(){
      fs.unlink(file, function (err) {
        if(err) log('cannot delete file ', file)
      })
    }, 3000)
  })
}
