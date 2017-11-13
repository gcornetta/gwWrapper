//db wrappers

module.exports.dbGet = function (client, key, cb) {
   client.get(key, (err, reply) => {
     if (err) throw err
     cb (reply)
   })
}

module.exports.dbGetHash = function (client, key, cb) {
   client.hgetall(key, (err, reply) => {
     if (err) throw err
     cb (reply)
   })
}

module.exports.dbGetSetAll = function (client, key, cb) {
  client.zcard(key, (err, reply) => {
    if (err) throw err
    client.zrange(key, 0, (reply-1), (err, reply) => {
      if (err) throw err
      //optional callback
      typeof cb === 'function' && cb(reply)
    })
  })
}
