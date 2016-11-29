
var WmiClient = require('wmi-client')

var wmi = new WmiClient({
  host: '127.0.0.1'
})

const name = 'Toshiba'

wmi.query('SELECT * FROM Win32_Printer WHERE DeviceID like "%pc03%'+ name +'%"', function (err, result) {
  console.log(result)
  if (result.length) {
    const p = result[0]
    if (p.PrinterStatus == 3 && p.WorkOffline === false) {
      //  2='Unknown', 3='Idle', 4='Printing', 5='Warmup'
      console.log(233333)
    }
  }
})

