
var XLSX = require('xlsx')

function sheetGetAllText (file, sheet) {
  var workbook = XLSX.readFile(file || 'm:\\拉货计划\\2016年拉货计划.xls')

  var total = workbook.SheetNames.length
  var lastSheetName = workbook.SheetNames[total - 1]
  var sheet = workbook.Sheets[sheet || lastSheetName]

  var str = ''
  for (var z in sheet) {
    /* all keys that do not begin with "!" correspond to cell addresses */
    if (z[0] === '!') continue
    str += z + '=' + JSON.stringify(sheet[z]) + '\n'
  }
  return str
}

module.exports = sheetGetAllText

