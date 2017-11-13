var zetta = require('zetta');

var PORT = process.env.PORT || 1337;

zetta()
  .name('fablab-gateway')
  .expose('*')
  .listen(PORT, function(err) {
    if(err) {
      console.error(err);
      process.exit(1);
    }
    console.log('running on http://pigateway.local:', PORT)
  });
