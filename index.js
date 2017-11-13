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
  self.log(`error: database error: ${err}`)
})

let fabLabDetails = {
  fablab: {
    coordinates: {},
    equipment: []
  }
}

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
               if (reply !== null) {
                 cb (null, reply)
               }                        
            })
          },
  opdays: function (cb) {
            db.dbGetSetAll(rclient, dbKeys.opdays, reply => { 
               if (reply !== null) {
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
  }, function (err, results) {
       fabLabDetails.fablab.id = results.id 
       fabLabDetails.fablab.name = results.name
       fabLabDetails.fablab.web = results.web
       fabLabDetails.fablab.capacity = 0
       fabLabDetails.fablab.address = ''
       fabLabDetails.fablab.coordinates.latitude = results.geopos.latitude
       fabLabDetails.fablab.coordinates.longitude = results.geopos.longitude
       fabLabDetails.fablab.equipment = results.equip
  })

let app = express()
let child = cp.fork('./gateway/server.js')


// create the express router for APIs
apiRouter = express.Router()

//configure the middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set('json spaces', 2)

let client = new Siren() 

//connect to the fablab gateway every 60 secs.
var scheduler = new Scheduler(1);

scheduler.add(60000, function(done){
client.get(gateway.baseURL, (err, entity) => {
  let details = ['id', 'name', 'vendor', 'type', 'state']

  if (err) throw err
  logger.info('@wrapper: Retrieving fab lab status...'); 
  entity.links()
    .filter(link => link.title !== undefined && link.title.includes('machine'))
    .map(link => link.href)
    .forEach(link => client.follow(link, (err,  entity)=> {
        entity.entities()
             .forEach(link => {
               let machineId = link.data.properties.id 
               db.dbUsetAdd(rclient, dbKeys.machines, machineId, reply => {
                 let hash = []
                 if (reply === 1) {
                   //new machine emit the event 'serviceUp' on the websocket channel
                   details.forEach ( (key, index) => {
                     hash.push(key)
                     hash.push(link.data.properties[key])
                     if (index === details.length -1) {
                       db.dbSetHash (rclient, dbKeys.machine + machineId, hash, reply => {
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
