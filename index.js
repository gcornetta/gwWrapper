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
const cron = require('node-schedule')
const request = require('request')
const formidable = require('formidable')
const fs = require('fs')


const ws = new WebSocket('ws://192.168.100.135:3333')

require('dotenv').config()

ws.on ('error', (err) => {
  logger.error(`@wrapper: Websocket error: ${err}.`)
})
  
ws.on ('message', (data) => {
  logger.info(`@wrapper:  ${data}.`)
});

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
   opday     : 'fablab:openingdays:',
   address   : 'fablab:address:detailed',
   contact   : 'fablab:contact',   
   materials : 'fablab:materials:',
   machines  : 'fablab:machines',
   machine   : 'fablab:machine:',
   quota     : 'fablab:configuration:quota',
   calls     : 'fablab:apicalls',
   jobs      : 'fablab:jobs:'  
}

let rclient = redis.createClient()

rclient.on('error', err => {
  logger.error (`@wrapper: Database error: ${err}`)
})

let materials = ['wood', 'copper', 'acrylic', 'vinyl', 'mylar', 'cardboard'] 

let fabLabDetails = {
    fablab: {},
    jobs: {}
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
      address: function (cb) {
                db.dbGetHash(rclient, dbKeys.address, reply => {
                   if (Object.keys(reply).length !== 0) {
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
      contact: function (cb) {
                db.dbGetHash(rclient, dbKeys.contact, reply => {
                   if (Object.keys(reply).length !== 0) {
                     cb (null, reply)
                   }
                })
              },
      opdays: function (cb) {
                db.dbGetSetAll(rclient, dbKeys.opdays, reply => {
                        let opDays = []
                    if (reply.length !== 0) {

                    reply.forEach ( (day, index) => {
                       db.dbGetHash(rclient, dbKeys.opday + day, rep => {
                         let d = {} 
                         if (Object.keys(rep).length !== 0) {
                           d.day = day     
                           d.from = rep.from                                                                                                     
                           d.to = rep.to                                                                                                         
                           opDays.push(d)

                           if (index === reply.length -1) {
                             cb (null, opDays)
                           }
                         }
                       })
                     })

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
             },
   materials: function (cb) {
                    let mat = []

                    materials.forEach ( (material, index) => {
                       m = {}
                       db.dbGet(rclient, dbKeys.materials + material, reply => {
                         if (reply !== null) {
                           m.type = material
                           m.quantity = reply
                           mat.push(m)
                         }
                           if (index === materials.length -1) {
                             cb (null, mat)
                           }
             
                       })
                     })
              },
   jobs: function (cb) {
               let jobs = {}
               db.dbGetUsetAll(rclient, dbKeys.machines, reply => {
                  let details = []
                  if (reply.length !== 0) {
                    reply.forEach ( (key, index) => {
                      db.dbGetHash(rclient, dbKeys.machine + key, machine => {
                         let m = {}
                         if (machine != null) {
                           m.machineId = machine.id
                           m.type = machine.type
                           m.vendor = machine.vendor
                           request.post({url: machine.url + 'api/login', form: {name: process.env.USER_NAME, password: process.env.PASSWORD}}, function(error, response, body) {
                               let options = {
                                   url: machine.url + 'api/jobs',
                                   headers: {
                                     'Authorization': 'JWT ' + JSON.parse(response.body).token
                                   }
                               }
                               request.get(options ,function(error, response, body) {
                                  m.jobs = JSON.parse(response.body).jobs
                                  details.push(m)
                               })
                           })
                         }
                      })
                      if (index === Object.keys(reply).length -1) {
                        jobs.running = 0
                        jobs.queued = 0
                        jobs.details = details
                        cb (null, jobs)
                      }
                    })
                  } else {
                    cb (null, jobs)
                  }
               })
        }
      }, (err, results) => {
           fabLabDetails['fablab'].id = results.id 
           fabLabDetails['fablab'].name = results.name
           fabLabDetails['fablab'].web = results.web
           fabLabDetails['fablab'].api= results.api
           fabLabDetails['fablab'].capacity = 0
           fabLabDetails['fablab'].address = results.address
           fabLabDetails['fablab'].coordinates = results.geopos
           fabLabDetails['fablab'].contact = results.contact
           fabLabDetails['fablab'].openingDays = results.opdays
           fabLabDetails['fablab'].equipment = results.equip
           fabLabDetails['fablab'].materials = results.materials
           fabLabDetails['jobs'] = results.jobs
      })
}

let initCalls = function () {
   db.dbGet(rclient, dbKeys.calls, reply => {
     if (reply === null) {
       db.dbGet(rclient, dbKeys.quota, quota => {
         if (quota === null) {
           logger.error (`@wrapper: DB error, cannot retrieve API quota.`)
         } else {
           db.dbSet(rclient, dbKeys.calls, quota, reply => {
             if (reply === 'OK') {
               logger.info(`@wrapper: API quota initialized to ${quota}.`)
             } else {
               logger.error(`@wrapper: DB error, cannot write.`)
             }
           }) 
         }
       })
      }
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

// global object with all the detected machine Ids
let machinesId = []

//initialize the number of allowed API calls
initCalls()

// start the scheduler to reset quota the 1st day of every month
let job  = cron.scheduleJob('* 0 0 1 * *', () => {
  db.dbGet(rclient, dbKeys.quota, quota => {
    if (quota === null ) {
      logger.error (`@wrapper: DB error, cannot retrieve API quota.`)
    } else {
      db.dbSet(rclient, dbKeys.calls, quota, reply => {
        if (reply === 'OK') {
          logger.info(`@wrapper: API quota reset to ${quota}.`)
        } else {
          logger.info(`@wrapper: DB error, cannot reset quota.`)
        }
      })
    }
  })
})


//connect to the fablab gateway every 60 secs.
let scheduler = new Scheduler(2);

scheduler.add(10000, function(done){
client.get(gateway.baseURL, (err, entity) => {
  let details = ['id', 'url', 'name', 'vendor', 'type', 'state']

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
                   db.dbGet(rclient, dbKeys.id, reply => {
                     if (reply !== null) {
                       ws.send(JSON.stringify({
                         id      : reply,
                         mId     : machineId,
                         event   : 'serviceUp'
                       }), (err) => {
                         if (err){
                            logger.error(`@wrapper ws: ${err}.`)
                         }
                      })
                     }
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
                      
                      if (reply !== null && (reply.state !== link.data.properties.state)) {
                        hash.push('state')
                        hash.push(link.data.properties.state)
                        db.dbSetHash (rclient, dbKeys.machine + machineId, hash, reply => {
                         logger.info(`@wrapper: State change. Machine ${machineId} is now ${hash[1]}.`) 
                         refresh ()
  
                         db.dbGet(rclient, dbKeys.id, reply => {
                           if (reply !== null) {
                             ws.send(JSON.stringify({
                               id      : reply,                                                                                                      
                               mId     : machineId,
                               event   : 'machineStateChange',
                               state   : hash[1]
                             }), (err) => {
                                if (err){
                                    logger.error(`@wrapper ws: ${err}.`)
                                }
                             })
                           }
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

scheduler.add(10000, function(done) {
 //add to the array object a new method called diff
 Array.prototype.diff = function (a) {
    return this.filter((i) => {return a.indexOf(i) < 0 });
 }

  client.get(gateway.baseURL, (err, entity) => {
    let services = []

    if (err) throw err
    logger.info('@wrapper: Retrieving fab lab status...');
    let links = entity.links()
      .filter(link => link.title !== undefined && link.title.includes('machine'))
     
     if (links.length !== 0 ) {
        links.map(link => link.href)
         .forEach(link => client.follow(link, (err,  entity) => {
            let index = 0
            entity.entities()
              .forEach(link => {
                  index++
                  services.push(link.data.properties.id)
              })
              if (index === links.length) {
                db.dbGet(rclient, dbKeys.id, reply => {
                  if (reply !== null) {
                    if (machinesId.length !== 0) {
                      machinesId
                        .diff(services)
                        .forEach( service => {
                           if (!services.includes(service)) {
                              //remove it from machinesId
                              ws.send(JSON.stringify({
                                id      : reply,
                                event   : 'serviceDown'
                              }), (err) => {
                                if (err){
                                    logger.error(`@wrapper ws: ${err}.`)
                                }
                              })
                           }
                        })
                    }
                  }
                })
              }
          }))
     } else {
        db.dbGet(rclient, dbKeys.id, reply => {
          if (reply !== null) {
            ws.send(JSON.stringify({                                                                                                
                      id      : reply,
                      event   : 'fabLabDown'
                    }), (err) => {
                        if (err){
                            logger.error(`@wrapper ws: ${err}.`)
                        }
                    })                                                                                                                       
           }
        })
     }
   })
done()
})

// API endpoints
apiRouter.get('/', function (req, res) {
    if (fabLabDetails !== null) {
      res.statusCode = 200
      res.json(fabLabDetails)
    } else {
      res.statusCode = 500
      res.json = ({code: 1, message: 'Internal server error. Please, try later.', details: 'Fablab communication error.'})
    }
})

apiRouter.get('/quota', function(req, res) {
  db.dbGet(rclient, dbKeys.id, id => {
    if (id === null) {
      res.statusCode = 500
      res.json = ('Internal server error. Please, try later.')
    } else {
      db.dbGet(rclient, dbKeys.calls, reply => {
        if (reply === null) {
          res.statusCode = 500
          res.json = ({code: 2, message: 'Internal server error. Please, try later.', details: 'Database error.'})
        } else {
          res.statusCode = 200
          res.json({id: id, quota: reply})
        }
      })
    }
  })
})

apiRouter.post('/jobs', function (req, res) {
  let user = req.query.user
  let machine  = req.query.machine
  let fabProcess  = req.query.process
  let material = req.query.material
  let design 


  db.dbGet(rclient, dbKeys.calls, reply => {
     if (reply === null) {
       res.statusCode = 500
       res.json({code: 8, message: 'Internal server error', details: 'Database error. Cannot write.'})
     } else {
       reply--
       if ( reply < 0) {
         res.statusCode = 400
         res.json({code: 9, message: 'Bad request.', details: 'API quota consumed.'})
       } else {
         db.dbSet(rclient, dbKeys.calls, reply, status => {
          if (status === 'OK') {
            if (user === undefined) {
              res.statusCode = 500
              res.json('Bad request')
            } else if (machine === undefined) {
              res.statusCode = 400
              res.json('Bad request')
            } else if (machine !== '3D printer' && fabProcess === undefined && material === undefined) {
              res.statusCode = 400
              res.json('Bad request')
            } else { 
              let form = new formidable.IncomingForm()
              form.uploadDir = './'
              form.keepExtensions = true
              form.parse(req)

              form.on('fileBegin', (name, file) => {
                design = file.path = file.name
              })

              form.on('end', ()  => {
                refresh()
                let m = {} 
                if ( fabLabDetails['fablab'].equipment !== undefined) {                                                                                                                                
                  if ( (m = fabLabDetails['fablab'].equipment.find( equip => {
                         return equip.type === machine && (equip.state === 'idle' || equip.jobsQueued < 25) //TODO: Equip object doesn't have jobsQueued
                       })) !== undefined) {
                             request.post({url: m.url + 'api/login', form: {name: process.env.USER_NAME, password: process.env.PASSWORD}}, (error, response, body) => {
                     
                               if (response !== undefined) {
                                 let options = {
                                    url: m.url + 'api/jobs',
                                    headers: {
                                       'Authorization': 'JWT ' + JSON.parse(response.body).token
                                    },
                                    formData: {
                                      file: fs.createReadStream('./' + design)
                                    },
                                    qs: req.query
                                 }
                                 request.post(options, (error, response, body) => {
                                   //check response it is undefined
                                   if (JSON.parse(response.statusCode) === 200) {
                                     if (JSON.parse(response.body).jobId !== undefined) {
                                       db.dbSet(rclient, dbKeys.jobs + JSON.parse(response.body).jobId, m.url, reply => {
                                         if (reply === 'OK') {
                                           res.statusCode = 200
                                           res.json ({id: fabLabDetails['fablab'].id, mId: m.id, jobId: JSON.parse(response.body).jobId})
                                         } else {
                                           res.statusCode = 500
                                           res.json ({code: 6, message: 'Internal server error', details: 'Database error. Cannot write'})
                                         }
                                       })
                                     } else {
                                       res.statusCode = 200
                                       res.json(JSON.parse(response.body))
                                     }
                                   } else {
                                     res.statusCode = 500
                                     res.json({code: 5, message: 'Internal server error', details: 'Machine unknown error.'})
                                   }
                                 })
                               } else {
                                 res.statusCode = 500
                                 res.json({code: 4, message: 'Internal server error', details: 'Unknown authorization error.'})
                               } 
                             })                                                                                                                                       
                  } else {                                                                                                                                   
                    res.statusCode = 200                                                                                                                     
                    res.json({code: 7, message: 'Fablab busy', details: fabLabDetails['fablab'].id})                                                                                                                           
                  }
                } else {
                  res.statusCode = 200
                  res.json({code: 3, message: 'Fablab is alive but not ready.', details: 'The fablab object has not been built yet.'})
                }
              })
            }
          } else {
            res.statusCode = 500
            res.json({code: 9, message: 'Internal server error.', details: 'Database error. Cannot read.'})
          }   
         })
       }
     }
  })
})

apiRouter.get('/jobs/status/:id', function (req, res) {
// returns status
   let parts = req.url.split('/')
   let id = parts.pop() || parts.pop()
   
   
   db.dbGet(rclient, dbKeys.calls, reply => {
     if (reply === null) {
       res.statusCode = 500
       res.json({code: 8, message: 'Internal server error', details: 'Database error. Cannot read.'})
     } else {
       reply--
       if (reply < 0) {
         res.statusCode = 400                                                                                                                  
         res.json({code: 9, message: 'Bad request.', details: 'API quota consumed.'})                                                          
       } else {
         db.dbSet(rclient, dbKeys.calls, reply, status => {
           if (status === 'OK') {
             db.dbGet(rclient, dbKeys.jobs + id, route => {
               if (route !== null) {
                 //route contains the route
                 request.post({url: route + 'api/login', form: {name: process.env.USER_NAME, password: process.env.PASSWORD}}, function(error, response, body) {
                   let options = {
                     url: route + 'api/jobs/' + id,
                     headers: {
                      'Authorization': 'JWT ' + JSON.parse(response.body).token
                     }
                   }
                   request.get(options, (error, response, body) => {
                     //check response it is undefined
                     if (response === undefined) {
                       res.statusCode = 500
                       res.json({code: 4, message: 'Internal server error.', details: 'Cannot connect to the target machine.'})
                     } else {
                       res.statusCode = 200
                       res.json(JSON.parse(response.body).job)
                     }                                                                              
                   })
                 }) 
               } else {
                 res.statusCode = 400
                 res.json({code: 10, message: 'Bad request', details: 'Invalid route. Job not in Data base.'})
               }
             })
           } else {
             res.statusCode = 500
             res.json({code: 9, message: 'Internal server error', details: 'Database error. Cannot write.'}) 
           }
         })
       }
     }
   })
})

apiRouter.delete('/jobs/:id', function (req, res) {
   let parts = req.url.split('/')
   let id = parts.pop() || parts.pop()

   db.dbGet(rclient, dbKeys.jobs +id, route => {   
     db.dbDel(rclient, dbKeys.jobs + id, reply => {
        if (reply === 1) {    
          if (route !== null) {
            request.post({url: route + 'api/login', form: {name: process.env.USER_NAME, password: process.env.PASSWORD}}, function(error, response, body) { 
              let options = {
                url: route + 'api/jobs/' + id,
                headers: {
                  'Authorization': 'JWT ' + JSON.parse(response.body).token
                }
              }
              request.del(options, function(error, response, body) {
                if (response === undefined) {
                  res.statusCode = 500
                  res.json({code: 4, message: 'Internal server error.', details: 'Cannot connect to the target machine.'})
                } else {
                  res.statusCode = response.statusCode
                  res.json(JSON.parse(response.body))
                } 
              })
            })
          } else {
            res.statusCode = 400                                                                                                                   
            res.json({code: 10, message: 'Bad request', details: 'Invalid route. Job not in Data base.'}) 
          }
        } else {
          res.statusCode = 500
          res.json({code: 9, message: 'Internal server error.', details: 'Database eror. Cannot delete.'})
        }
     })
   })
})

// Attach the router to the /fablab path
app.use('/fablab', apiRouter)

// Error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
        message: err.message,
        error: err
  })
})

//deploy the wrapper server
/*app.listen(3000, function () {
  logger.info('@wrapper: API wrapper listening on port 3000')
})*/

const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', client => {
   logger.info(`@piwrapper: conected to .....`) 
   client.on ('deleteJob', function (data) {
        ws.send(JSON.stringify({
            jobId   : data,
            event   : 'deleteJob'
        }), (err) => {
            if (err){
                logger.error(`@wrapper ws: ${err}.`)
            }
        })
   })
   client.on ('updateJob', function (data) {
        ws.send(JSON.stringify({
            job   : data,
            event   : 'updateJob'
        }), (err) => {
            if (err){
                logger.error(`@wrapper ws: ${err}.`)
            }
        })
   })
   client.on ('disconnect', function (data) {

   })
});

server.listen(3000, () => {
  logger.info('@wrapper: API wrapper listening on port 3000')  
});

