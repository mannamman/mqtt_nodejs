const mqtt = require('mqtt');
const { json } = require('express');
const { PythonShell } = require('python-shell');

// Parse
//const ip = '192.168.0.117';

const ip = '192.168.0.117';
const url = "mqtt://" + ip;

//
//

//---------------option
const options = {
    retain:false,
    qos:0
};
//-----------------clinet connect
const topics=['/status/toTx2','/status/wait','/status/complete','/motor'];
const cam_topics=['/cam/tx2/deter','/cam/tx2/signup','/cam/app/deter','/cam/app/signup','/cam/tx2/signup/complete'];
let ClientStatus = mqtt.connect(url, options);
let ClientJson = mqtt.connect(url, options);
let ClientCamDeter = mqtt.connect(url,options);
let ClientCamSignUp = mqtt.connect(url,options);
let ClientCamSignUpComplete = mqtt.connect(url,options);
//-----------------clinet connect


//-------------parse message
const toStr = (message)=>{
  message = message.toString();
  return message;
}
//-------------parse message

ClientStatus.on('connect', function() { // When connected
  //toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때, toTx2구독
  ClientStatus.subscribe(topics[0], function() {
    console.log('subscribe on ',topics[0]);
    
    // 가정 1하강, 0정지, 2 상승
    ClientStatus.on('message', function(topic, message, packet) {
      message = toStr(message);
      if(message==='1'){
			console.log('at the toTx2... ',message);
			ClientStatus.publish(topics[1],message,options);
			ClientStatus.publish(topics[3],message,options);
		}
		else if(message==='0'){
			console.log('at the toTx2... ',message);
			semapore = false;
			
			//topics[1]은 app에게 3은 motor
			ClientStatus.publish(topics[1],message,options);
			ClientStatus.publish(topics[3],message,options);
			ClientCamDeter.publish(cam_topics[2],'ok',options);       
		  }
		 else if(message==='2'){
			console.log('at the toTx2... ',message);
			ClientStatus.publish(topics[3],message,options);
		}
    });
  });
});


// complete를 구독
//insert into detail (order_number,orderlist) values (4,'[{"id":1,"test":2}]')
ClientJson.on('connect',function(){
	ClientJson.subscribe(topics[2],()=>{
		console.log('subscribe on ',topics[2]);
	ClientJson.on('message',(topic,message,packet)=>{
		console.log('in complete');
		message = toStr(message);
		console.log(message);
		});
	});
})

//----------------cam

ClientCamSignUp.on('connect',()=>{
    ClientCamSignUp.subscribe(cam_topics[1],()=>{
        console.log('subscribe on ',cam_topics[1]);
        //message는 app에서 받아와야함
        ClientCamSignUp.on('message',(topic,message,packet)=>{
			console.log('into signup');
			ClientCamSignUp.publish(cam_topics[3],'signup ok',options);
			
        })
    })
})
ClientCamSignUpComplete.on('connect',()=>{
	ClientCamSignUpComplete.subscribe(cam_topics[4],()=>{
		console.log('subscribe on ',cam_topics[4]);
		ClientCamSignUpComplete.on('message',(topic,message,packet)=>{
			console.log('into signup complete');
		})
	})
})
