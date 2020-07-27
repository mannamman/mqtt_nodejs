var net = require('net')

var client = new net.Socket();
const ip = '127.0.0.1';
client.connect(1337,ip,function(){
  console.log('connected to server');
});

client.on('data',function(result){
  console.log('in on data');
  console.log('recevie from server : '+result);
  //client.write(result);
});

client.on('end',function(){
  console.log('disconnected');
});
client.on('error',function(err){
  console.log(err);
});
client.on('timeout',function(){
  console.log('connection timeout');
});