
var XLSX = require('xlsx')

function sheetGetLastText (file, sheet) {
  var workbook = XLSX.readFile(file || 'm:\\拉货计划\\2016年拉货计划.xls')

  var total = workbook.SheetNames.length
  var sheetName = typeof sheet=='string'
      ? sheet
      : workbook.SheetNames[typeof sheet=='number'
                            ? (sheet>=0 ? sheet : total + sheet)
                            : 0]
  var targetSheet = workbook.Sheets[sheetName]

  var str = ''
  for (var z in targetSheet) {
    /* all keys that do not begin with "!" correspond to cell addresses */
    if (z[0] === '!') continue
    str += z + '=' + JSON.stringify(targetSheet[z]) + '\n'
  }
  return str
}

module.exports = sheetGetLastText

