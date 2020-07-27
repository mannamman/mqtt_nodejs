var mqtt = require('mqtt'), url = require('url');
// Parse
const ip = '192.168.219.170';
var url = "mqtt://" + ip;

var options = {
    retain:true,
    qos:1
};
const topics=['/status/toTx2','/status/toRpi','/status/toApp','/motor'];

var client = mqtt.connect(url, options);

client.on('connect', function() { // When connected
  //toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때
  client.subscribe(topics[0], function() {
    // 가정 1상승, 0정지, -1 하강
    client.on('message', function(topic, message, packet) {
      console.log("Received '" + message + "' on '" + topic + "'");
      if(message==1){
        client.publish(topics[2],'up',options);// 앱에게 올라간다고 알림
        client.publish(topics[3],'up',options);// 모터를 올라가도록 구동
      }
      else if(message==0){
        client.publish(topics[2],'stop',options);// 앱에게 멈추었다고 알리면 앱은 http로 얼굴 정보 가져오기
        client.publish(topics[3],'stop',options);
      }
      else{
        client.publish(topics[2],'down',options);
        client.publish(topics[3],'down',options);
      }
    });
  });

  // toRpi
  client.subscribe(topics[1],()=>{
    //여기도 퍼블리시
  });

  // toApp
  client.subscribe(topics[2],()=>{
    //여기도 퍼블리시
  });

  // motor
  client.subscribe(topics[3],()=>{
    //여기도 퍼블리시
  });

});