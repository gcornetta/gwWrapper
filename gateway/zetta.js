const zetta = require('zetta')
const redis = require('redis')
const db = require('../db/db')
const logger = require('../logger/winston')

let PORT = process.env.PORT || 1337;

zetta()
  .name('fablab-gateway')
  .expose('*')
  .listen(PORT, function(err) {
    if(err) {
      console.error(err);
      process.exit(1);
    }
    logger.info('running on http://pigateway.local:', PORT)
  })

let rclient = redis.createClient()

rclient.on('error', err => {
  logger.error (`@zetta: Database error: ${err}`)
})

process.stdin.resume() //so the program will not close instantly

let exitHandler = function () {
  db.dbGetUsetAll(rclient, 'fablab:machines', reply => {
    if (reply.length > 0) {
       reply.forEach ( (key, index) => {
         db.dbDel(rclient, 'fablab:machine' + key, op => {
           //log op
           if (index === reply.length -1) {
             db.dbDel(rclient, 'fablab:machines', op => {
               logger.info ('@zetta: Database deleted...exiting.')
               process.exit (0)
             })
           }
         })
       })
     } else {
       logger.info ('@zetta: Nothing to delete...exiting.')
       process.exit (0)
     }
  })
}

process.on ('SIGINT', () => {
  logger.info ('@wrapper: Detected CTRL+C or pm2.stop...')
  exitHandler()
})                                                                                                                       

process.on('SIGUSR1', () => {
  logger.info ('@wrapper: Detected SIGUSR1...')
  exitHandler()
})

process.on('SIGUSR2', () => {
  logger.info ('@wrapper: Detected SIGUSR2...')
  exitHandler()
})

process.on('SIGTERM', () => {
  logger.info ('@wrapper: Detected SIGTERM...')
  exitHandler()
})

/*process.on('uncaughtException', () => {
  console.log ('\nUncaught exception...');
  exitHandler()
})*/
