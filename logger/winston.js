var winston = require('winston')
var strftime = require('strftime')
var colors = require('colors')  // eslint-disable-line

/* var _getTimestamp = function () {
  var d = new Date()

  return (d.getFullYear()).toString() +
               (d.getMonth() + 1).toString() +
               (d.getDate()).toString() +
               (d.getHours()).toString() +
               (d.getMinutes()).toString() +
               (d.getSeconds()).toString()
} */

const timestamp = function () {
  return strftime('%b-%d-%Y %H:%M:%S ', new Date()).green
}

const logFormatter = function (options) {
    // Return string will be passed to logger.

  return options.timestamp() + ('[' + options.level + ']').blue +
        ` ` + (options.message ? options.message : ``).blue +
        (options.meta && Object.keys(options.meta).length
            ? `\n\t` + JSON.stringify(options.meta) : ``).blue
}

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      timestamp: timestamp,
           // handleExceptions: true,
      formatter: logFormatter,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
})

module.exports = logger
module.exports.stream = {
  write: function (message, encoding) {
    logger.info(message)
  }
}
