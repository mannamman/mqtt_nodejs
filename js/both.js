var mqtt = require('mqtt'), url = require('url');
// Parse
const ip = '192.168.0.77';
var url = "mqtt://" + ip;

var options = {
    retain:true,
    qos:1
};
const topics=['/status/toTx2','/status/toApp','/status/complete','/motor'];
var client1 = mqtt.connect(url, options);
var client2 = mqtt.connect(url, options);

client1.on('connect', function() { // When connected
  //toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때, toTx2구독
  client1.subscribe(topics[0], function() {
    console.log('subscribe on ',topics[0]);
    
    // 가정 1상승, 0정지, -1 하강
    client1.on('message', function(topic, message, packet) {
      //일단 1은 봉인시켜놓고 앱에서 주문완료시만 최상단으로 올라가도록
      if(message==-1){
        console.log('at the toTx2 ',message);
        client1.publish(topics[1],'-1',options);// 앱에게 올라간다고 알림 down
        client1.publish(topics[3],'-1',options);// 모터를 올라가도록 구동
      }
      else if(message==0){
        console.log('at the toTx2 ',message);
        client1.publish(topics[1],'0',options);// 앱에게 멈추었다고 알리면 앱은 http로 얼굴 정보 가져오기
        client1.publish(topics[3],'0',options);// stop
      }
      else{
        console.log('at the toTx2 ',message);
        client1.publish(topics[1],'1',options)// up; app에게만 알림 따로 못올라가고 앱에서 complete를 받아야지만 올라감
      }
    });
  });

  


  


});

client2.on('connect',()=>{
  // complete를 구독
  client2.subscribe(topics[2],()=>{
    console.log('subscribe on ',topics[2]);
    client2.on('message',(topic,message,packet)=>{
      if(message===1){
        console.log('at the complete ',message);
        client2.publish(topics[3],'1',options);// 이러면 최상단으로 올라가야함 /motor
      }
    });
    
  });
})