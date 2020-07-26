const mqtt = require('mqtt');
const options={
    retain:true,
    qos:1
};

const ip = "mqtt://192.168.219.170";

const client = mqtt.connect(ip);

client.publish("/test","hello",options);
client.end();
