
var http = require('http')
var url = require('url')
var fs = require('fs')
var path = require('path')
var util = require('util')
var exec = require('child_process').exec

var request = require('request')

var net=require("net") 

net.createServer(function(socket){
  socket.on("error",function(err){
    if(err){
      console.log(err)
    }
  })
  socket.on("data", function(data){
    if(!data)return
    data = data.toString()
    console.log(data)

    if(data==="exit"){
      socket.write("exit")
      return
    }
    
    try{
      data = JSON.parse(data)
    }catch(e){
      console.log('bad json')
    }
    
    

  })
})
.listen(81, function(){console.log('socket ready')})

var since = 0
function loopBack(){
  var param = since || '0&limit=1'
  request.get("http://localhost:8384/rest/events?since="+param, function(err, res, data){
    if (err) {
      return console.log('error connect server', err)
    }
    try{
      data=JSON.parse(data)
    }catch(e){
      return console.log('error parse data', data)
    }
    if(!data.length){
      setTimeout(loopBack, 1000)
      return console.log('no data available\n', JSON.stringify(data));
    }
    if(since===0) {
      console.log(data.id, data.type, typeof data, data) 
      since=data[0].id
    }else{
      since+=data.length
      console.log('*** data is',typeof data, data, '\n\n')
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
             var fullPath = path.join(item.data.folder, item.data.item)
             var fileObj = path.parse(item.data.item)
             if(fileObj.dir=='pdf'){
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
  var printerName = '\\\\pc03\\TOSHIBA e-STUDIO2507Series PCL6'
  var PDFReaderPath = "c:\\Program Files\\SumatraPDF\\SumatraPDF.exe"
  var cmd = util.format( '"%s" -silent -print-to "%s" "%s"', PDFReaderPath, printerName, file ) 
  var child = exec(cmd, function printFunc(err, stdout, stderr) {
    console.log('print result',child.pid, err, stdout, stderr)
    if(err) return console.log('print error', err)
    fs.unlink(file, function (err) {
      
    })
  })
}
