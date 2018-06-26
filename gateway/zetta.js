const zetta = require('zetta')
const redis = require('redis')
const pm2 = require('pm2')
const db = require('../db/db')
const logger = require('../logger/winston')

let PORT = process.env.PORT || 1337

zetta()
  .name('fablab-gateway')
  // .expose('*')
  .listen(PORT, function (err) {
    if (err) {
      logger.error(err)
      process.exit(1)
    }
    logger.info('running on http://pigateway.local:', PORT)
  })

let rclient = redis.createClient()

rclient.on('error', err => {
  logger.error(`@zetta: Database error: ${err}`)
})

process.stdin.resume() // so the program will not close instantly

let exitHandler = function () {
  pm2.connect(err => {
    if (err) {
      // self.log(`${err.toString().toLowerCase()}.`)
      process.exit(2)
    }
    pm2.stop('zetta', (err, app) => {
      if (err) {
        // self.log(`${err.toString().toLowerCase()}.`)
        process.exit(2)
      }
      logger.info('@zetta: Process terminated...exiting.')
      pm2.disconnect()
      db.dbGetUsetAll(rclient, 'fablab:machines', reply => {
        if (reply.length > 0) {
          reply.forEach((key, index) => {
            db.dbDel(rclient, 'fablab:machine' + key, op => {
             // log op
              if (index === reply.length - 1) {
                db.dbDel(rclient, 'fablab:machines', op => {
                  logger.info('@zetta: Database deleted...exiting.')
                  rclient.quit()
                  process.exit(0)
                })
              }
            })
          })
        } else {
          logger.info('@zetta: Nothing to delete...exiting.')
          rclient.quit()
          process.exit(0)
        }
      })
    })
  })
}

process.on('SIGINT', () => {
  logger.info('@zetta: Detected SIGINT...')
  exitHandler()
})

process.on('SIGTERM', () => {
  logger.info('@zetta: Detected SIGTERM...')
  exitHandler()
})

/* process.on('uncaughtException', () => {
  console.log ('\nUncaught exception...');
  exitHandler()
}) */
