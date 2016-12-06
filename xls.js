
var XLSX = require('xlsx')

function checkLastSheet (file, callback) {
  var prevStr = ''
  return function () {
    var workbook = XLSX.readFile(file || 'm:\\拉货计划\\2016年拉货计划.xls')

    var total = workbook.SheetNames.length
    var lastSheetName = workbook.SheetNames[total - 1]
    var sheet = workbook.Sheets[lastSheetName]

    var str = ''
    for (var z in sheet) {
      /* all keys that do not begin with "!" correspond to cell addresses */
      if (z[0] === '!') continue
      str += z + '=' + JSON.stringify(sheet[z]) + '\n'
    }

    if (str != prevStr) {
      console.log('changed!')
      prevStr = str
      callback(true)
    } else {
      callback(false)
    }
  }
}

setInterval(checkLastSheet(null, v=>console.log(v)), 5000)

module.exports = checkLastSheet

