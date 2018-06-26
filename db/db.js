// db wrappers

module.exports.dbGet = function (client, key, cb) {
  client.get(key, (err, reply) => {
    if (err) throw err
    cb(reply)
  })
}

module.exports.dbSet = function (client, key, value, cb) {
  client.set(key, value, (err, reply) => {
    if (err) {
      // vorpal.log(`${err}.`)
    } else {
       // optional callback
      typeof cb === 'function' && cb(reply)
    }
  })
}

module.exports.dbGetHash = function (client, key, cb) {
  client.hgetall(key, (err, reply) => {
    if (err) throw err
    cb(reply)
  })
}

module.exports.dbGetSetAll = function (client, key, cb) {
  client.zcard(key, (err, reply) => {
    if (err) throw err
    client.zrange(key, 0, (reply - 1), (err, reply) => {
      if (err) throw err
      // optional callback
      typeof cb === 'function' && cb(reply)
    })
  })
}

module.exports.dbDel = function (client, key, cb) {
  client.del(key, (err, reply) => {
    if (err) throw err
    cb(reply)
  })
}

module.exports.dbSetHash = function (client, key, hash, cb) {
  if (hash.length > 2) {
    client.hmset(key, hash, (err, reply) => {
      if (err) throw err
       // optional callback
      typeof cb === 'function' && cb(reply)
    })
  } else {
    client.hset(key, hash[0], hash[1], (err, reply) => {
      if (err) throw err
       // optional callback
      typeof cb === 'function' && cb(reply)
    })
  }
}

module.exports.dbUsetAdd = function (client, key, value, cb) {
  client.sadd(key, value, (err, reply) => {
    if (err) throw err
     // optional callback
    typeof cb === 'function' && cb(reply)
  })
}

module.exports.dbUsetRem = function (client, key, value, cb) {
  client.srem(key, value, (err, reply) => {
    if (err) throw err
     // optional callback
    typeof cb === 'function' && cb(reply)
  })
}

module.exports.dbGetUsetAll = function (client, key, cb) {
  client.smembers(key, (err, reply) => {
    if (err) throw err
    typeof cb === 'function' && cb(reply)
  })
}
