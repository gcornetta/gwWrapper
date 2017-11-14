const express = require('express')
const bodyParser = require('body-parser')
const url = require('url')
const redis = require('redis')
const randomstring = require('randomstring')
const Scheduler = require('nschedule');
const Siren = require('siren-client')
const cp = require('child_process')
const logger = require('./logger/winston')
const async = require('async')
const db = require('./db/db')
const swaggerTools = require('swagger-tools')
const YAML = require('yamljs')
const swaggerDoc = YAML.load('swagger.yaml')
const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:9999')

ws.on ('error', (err) => {
  logger.error(`@wrapper: Websocket error: ${err}.`)
})
  
swaggerTools.initializeMiddleware(swaggerDoc, function (middleware) {
  // Serve the Swagger documents and Swagger UI
  app.use(middleware.swaggerUi())
})


const gateway = {
  baseURL:   'http://pigateway.local:1337',
  serverURL: 'http://pigateway.local:1337/servers/'
}

let dbKeys = {
   id        : 'fablab:configuration:id',
   name      : 'fablab:configuration:name',
   web       : 'fablab:configuration:web',
   api       : 'fablab:configuration:api',
   geopos    : 'fablab:configuration:geoposition',
   opdays    : 'fablab:configuration:openingdays',  
   materials : 'fablab:materials',
   machines  : 'fablab:machines',
   machine   : 'fablab:machine:'  
}

let rclient = redis.createClient()

rclient.on('error', err => {
  logger.error (`@wrapper: Database error: ${err}`)
})

let fabLabDetails = {
  fablab: {
    coordinates: {},
    equipment: []
  }
}

//clean up db before exiting

process.stdin.resume() //so the program will not close instantly


let exitHandler = function () {
  db.dbGetUsetAll(rclient, dbKeys.machines, reply => {
    if (reply.length > 0) {
       reply.forEach ( (key, index) => {
         db.dbDel(rclient, dbKeys.machine + key, op => {
           //log op
           if (index === reply.length -1) {
             db.dbDel(rclient, dbKeys.machines, op => {
               logger.info ('@wrapper: Database deleted...exiting.')
               process.exit (0)
             })
           }
         })
       })
     } else {
       logger.info ('@wrapper: Nothing to delete...exiting.')
       process.exit (0)
     }
  })
}

process.on ('SIGINT', () => {
  logger.info ('@wrapper: Detected CTRL+C...');
  exitHandler() 
})

process.on('SIGUSR1', () => {
  console.log ('\nDetected SIGUSR1...');
  exitHandler()
})

process.on('SIGUSR2', () => {                                                                                                                  
  console.log ('\nDetected SIGUSR2...');
  exitHandler()
})

/*process.on('uncaughtException', () => {
  console.log ('\nUncaught exception...');
  exitHandler()
})*/

let refresh = function () {
    async.parallel ({
      id: function (cb) {
            db.dbGet(rclient, dbKeys.id, reply => {
              if (reply !== null) {
                cb (null, reply)
              }
            })
          },
      name: function (cb) { 
              db.dbGet(rclient, dbKeys.name, reply => {                                                                                                        
                if (reply !== null) {                                                                                                                       
                  cb (null, reply)                                                                                                       
                }                                                                                                                                           
              })
            },
      web: function (cb) {
             db.dbGet(rclient, dbKeys.web, reply => {                                                                                                        
               if (reply !== null) {                                                                                                                       
                 cb (null, reply)                                                                                                       
               }                                                                                                                                           
             })
           },
      api: function (cb) {
             db.dbGet(rclient, dbKeys.api, reply => {                                                                                                        
               if (reply !== null) {                                                                                                                       
                 cb (null, reply)                                                                                                       
               }                                                                                                                                           
             })
           },
      geopos: function (cb) {
                db.dbGetHash(rclient, dbKeys.geopos, reply => {
                   if (Object.keys(reply).length !== 0) {
                     cb (null, reply)
                   }                        
                })
              },
      opdays: function (cb) {
                db.dbGetSetAll(rclient, dbKeys.opdays, reply => {
                   if (reply.length !== 0) {
                     cb (null, reply)
                   }                        
                })
              },
      equip: function (cb) {
               db.dbGetUsetAll(rclient, dbKeys.machines, reply => {
                  let machines = []
                  if (reply.length !== 0) {
                    reply.forEach ( (key, index) => {
                      db.dbGetHash(rclient, dbKeys.machine + key, machine => {
                         if (machine != null) {
                           machines.push(machine)
                         }
                      })
                      if (index === Object.keys(reply).length -1) {
                        cb (null, machines)
                      }
                    })
                  } else {
                   cb (null, machines)
                  }
               })
             }
      }, (err, results) => {
           fabLabDetails.fablab.id = results.id 
           fabLabDetails.fablab.name = results.name
           fabLabDetails.fablab.web = results.web
           fabLabDetails.fablab.capacity = 0
           fabLabDetails.fablab.address = ''
           fabLabDetails.fablab.coordinates.latitude = results.geopos.latitude
           fabLabDetails.fablab.coordinates.longitude = results.geopos.longitude
           fabLabDetails.fablab.equipment = results.equip
      })
}

let app = express()
let child = cp.fork('./gateway/server.js')


// create the express router for APIs
apiRouter = express.Router()

//configure the middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set('json spaces', 2)

let client = new Siren() 

let machinesId = []

//connect to the fablab gateway every 60 secs.
let scheduler = new Scheduler(2);

scheduler.add(10000, function(done){
client.get(gateway.baseURL, (err, entity) => {
  let details = ['id', 'name', 'vendor', 'type', 'state']

  if (err) throw err
  logger.info('@wrapper: Retrieving fab lab status...'); 
  entity.links()
    .filter(link => link.title !== undefined && link.title.includes('machine'))
    .map(link => link.href)
    .forEach(link => client.follow(link, (err,  entity) => {
        entity.entities()
             .forEach(link => {
               let machineId = link.data.properties.id 
               db.dbUsetAdd(rclient, dbKeys.machines, machineId, reply => {
                 let hash = []
                 if (reply === 1) {
                   machinesId.push(machineId)
                   ws.on('open', function open () {
                      ws.send({
                        id      : fabLabDetails.fablab.id, 
                        event   : 'serviceUp' 
                      })
                   })
                   details.forEach ( (key, index) => {
                     hash.push(key)
                     hash.push(link.data.properties[key])
                     if (index === details.length -1) {
                       db.dbSetHash (rclient, dbKeys.machine + machineId, hash, reply => {
                         if (reply === 'OK') {
                           logger.info(`@wrapper: machine ${machineId} info saved on DB.`)
                           refresh ()
                         } else {
                           logger.error(`@wrapper: trouble updating DB.`)
                         }
                       }) 
                     }
                   })                  
                 } else {
                   db.dbGetHash(rclient, dbKeys.machine + machineId, reply => {
                      let hash = []
                      if (reply.state !== link.data.properties.state) {
                        hash.push('state')
                        hash.push(link.data.properties.state)
                        db.dbSetHash (rclient, dbKeys.machine + machineId, hash, reply => {
                         logger.info(`@wrapper: State change. Machine ${machineId} is now ${hash[1]}.`) 
                         refresh ()
                         ws.on('open', function open () {
                           ws.send({
                             id      : fabLabDetails.fablab.id,
                             event   : 'machineStateChange',
                             mId     :  machineId
                           })
                         })
                       })
                      }
                   })
                 }
               })
            })
       })
    )
})
done()
})

scheduler.add(10000, function(done){
 //add to the array object a new method called diff
 Array.prototype.diff = (a) =>  {
    return this.filter((i) => {return a.indexOf(i) < 0 });
 }

 machinesId.forEach (key => {
   console.log('>>>>>>>> ' + key + ' ' + machinesId.length )
 })
done()
})

// API endpoints
apiRouter.get('/', function (req, res) {
    res.statusCode = 200
    res.json(fabLabDetails)
})

apiRouter.post('/jobs', function (req, res) {
  //returns job id machine id
  var d = new Date()
  let machine  = req.query.machine
  let process  = req.query.process
  let material = req.query.material

  if (machine === undefined || process === undefined || material === undefined) {
    res.statusCode = 400
    res.json('Bad request')
    //devolver error si se rechaza el trabajo
  } else {
    res.statusCode = 200
    res.json('OK') //devolver un id para el trabajo si se acepta
  }
}) 
//implementar GET /quota que devuelve la cuota de llamadas a API remanentes
apiRouter.get('/jobs/status/:id', function (req, res) {
// returns status
   res.statusCode = 200
   res.json('OK')
})

apiRouter.delete('/jobs/:id', function (req, res) {
// return status
})

// Attach the router to the /fablab path
app.use('/fablab', apiRouter)

// Error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//deploy the wrapper server
app.listen(3000, function () {
  logger.info('@wrapper: API wrapper listening on port 3000')
})
