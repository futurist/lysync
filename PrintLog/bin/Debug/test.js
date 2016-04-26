var fs = require('fs')
var path = require('path')
var os = require('os')
var moment = require('moment')

var jobLogFile = 'PrintLog0.txt'

function printLog(file, status){
  // tutpoint: moment.format('[plain YYYY]') will output plain string
  var filename = path.basename(file).replace('print_job_','')
  var content = fs.readFileSync(jobLogFile, 'utf8')
  if(content.indexOf(filename)>-1){
    content = content.replace(new RegExp(filename+'.*'), filename+' : '+status)
    fs.writeFileSync(jobLogFile, content, 'utf8')
  } else {
    fs.appendFile(jobLogFile, moment().format('\\[YYYY-MM-DD HH:mm:ss\\] ')+ filename + ' : ' + status +os.EOL, function (err) {})
  }
}

printLog('_PCWZY-20160426143635-4855.pdf', '新技术革命234')
