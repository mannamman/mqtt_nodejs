const express = require('express')
const app = express()
const port = 3000
//const { PythonShell } = require('python-shell');



const mqtt = require('mqtt');
const options={
    retain:true,
    qos:1
};

const ip = "mqtt://192.168.219.170";

const client = mqtt.connect(ip);


app.use(function(req, res, next) {
    console.log('hi');
    client.publish("/test","hello",options);
    client.publish("/good","what",options);
    //client.end();
    next();
    
});

app.use(function(req, res, next) {
  res.status(404).send('Sorry cant find that!');
});
 
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
});
 
app.listen(port, function() {
  console.log(`note Running! at ${port}`)
});

app.get('/', (req, res) => res.send('Hello World!'))
