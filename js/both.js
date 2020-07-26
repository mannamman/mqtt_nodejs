var mqtt = require('mqtt'), url = require('url');
// Parse
var mqtt_url = url.parse(process.env.CLOUDAMQP_MQTT_URL || 'mqtt://localhost:1883');
var auth = (mqtt_url.auth || ':').split(':');
var url = "mqtt://" + mqtt_url.host;

//username: auth[0] + ":" + auth[0] if you are on a shared instance
var options = {
    retain:true,
    qos:1
};
const topic='test'

// Create a client connection
var client = mqtt.connect(url, options);

client.on('connect', function() { // When connected

  // subscribe to a topic
  client.subscribe(topic, function() {
    // when a message arrives, do something with it
    client.on('message', function(topic, message, packet) {
      console.log("Received '" + message + "' on '" + topic + "'");
    });
  });

  // publish a message to a topic
  client.publish(topic, 'my message', function() {
    console.log("Message is published");
    client.end(); // Close the connection when published
  });
});