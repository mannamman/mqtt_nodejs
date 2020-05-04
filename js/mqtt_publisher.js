const mqtt = require('mqtt');
const options={
    retain:true,
    qos:1
};

const ip = "mqtt://192.168.0.85";

const client = mqtt.connect(ip);

for(let i=0;i<10;i++){
    client.publish("test","hello",options);
}
client.end();