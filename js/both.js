const mqtt = require('mqtt');
const mysql = require('mysql');
const { json } = require('express');
const { PythonShell } = require('python-shell');
// Parse
//const ip = '192.168.0.117';
const ip = '192.168.219.170';
const url = "mqtt://" + ip;

//--------------------db
//const db = mysql.createConnection({
//     host:'localhost',
//     user:'root',
//     port:'3306',
//     password:'4752580',
//     database:'kiosk',
//     //dateStrings:'date'
//});
//db.connect();
const query = (sql)=>{
  return new Promise((resolve,reject)=>{
    db.query(sql,(error,result)=>{
     if(error){
        throw error
        reject(error('query error'));
     }
      else{
        resolve(result);
      }
    })
  });
}
//-------------------db

//---------------option
const options = {
    retain:false,
    qos:0
};
const option = {
        mode: 'text',
        pythonPath: '',
        pythonOptions: ['-u'],
        scriptPath: '',
        args: ''
};

//-----------------clinet connect
const topics=['/status/toTx2','/status/wait','/status/complete','/motor'];
const cam_topics=['/cam/tx2/deter','/cam/tx2/singup','/cam/app/deter','cam/app/singup'];
const test_topic = '/status/complete';
let ClientStatus = mqtt.connect(url, options);
let ClientJson = mqtt.connect(url, options);
let ClientCamDeter = mqtt.connect(url,options);
let ClientCamSignUp = mqtt.connect(url,options);
//-----------------clinet connect


//-------------parse message
const toStr = (message)=>{
  message = message.toString();
  return message;
}
const toJson = (message)=>{
  message = JSON.parse(message);
  
  return message;
}
const makeDic=(order_list)=>{{
  let tempdic={};
  for(var i in order_list){
    if(tempdic[order_list[i]]===undefined){
      tempdic[order_list[i]] = 1;
    }
    else{
      tempdic[order_list[i]] = tempdic[order_list[i]] + 1;
    }
  }
  return tempdic;
}}
//-------------parse message

ClientStatus.on('connect', function() { // When connected
  //toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때, toTx2구독
  ClientStatus.subscribe(topics[0], function() {
    console.log('subscribe on ',topics[0]);
    
    // 가정 1상승, 0정지, 2 하강
    ClientStatus.on('message', function(topic, message, packet) {
      message = toStr(message);
      // title -> wait, wait -> face
      if(message===2){
        console.log('at the toTx2...2 ',message);
        ClientStatus.publish(topics[1],'2',options);// 앱에게 올라간다고 알림 down
        ClientStatus.publish(topics[3],'2',options);// 모터를 올라가도록 구동
      }
      else if(message===0){
        console.log('at the toTx2...0 ',message);
        //  if longtime, promise need
        ClientStatus.publish(topics[1],'0',options);
        ClientStatus.publish(topics[3],'0',options);// stop
      }
      else if(message==='1'){
        console.log('at the toTx2...1 ',message);
        ClientStatus.publish(topics[1],'1',options)// up
        ClientStatus.publish(topics[3],'1',options);
      }
    });
  });
});


// complete를 구독
ClientJson.on('connect',function(){

  ClientJson.subscribe(topics[2],()=>{
    console.log('subscribe on ',topics[2]);
    ClientJson.on('message',(topic,message,packet)=>{
      // message는 json형식일 것임
      message = toStr(message);
      try{
          message = toJson(message);
      }
      catch (e){
          console.log('json error',message);
      }
      console.log(message);
      //let sql = `insert into history (client_age, order_list, member_id) values('22', json_object('EA', json_array(1,1), 'food', json_array('케익','아이스 아메리카노')),'3')`
      //비동기 처리
      //query(sql).
      //then(()=>console.log('done')).
      //catch(error=>console.log(error))
      ClientJson.publish(topics[3],'1',options);// 이러면 최상단으로 올라가야함 /motor
    });
    
  });
})

//----------------cam
//deter는 회원일경우 DB조회
ClientCamDeter.on('connect',function(){
    ClientCamDeter.subscribe(cam_topics[0],()=>{
        console.log('subscribe on ',cam_topics[0]);
        ClientCamDeter.on('message',(topic,message,packet)=>{
			console.log('into detet');
            PythonShell.run('./agePredict_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                result = result[2].split(" ");
                let data = "id : "+result[0]+", "+"age : "+result[1];
                ClientCamDeter.publish(cam_topics[2],data,options);
            })
        })
    })
})
//sighup은 단순히 uuid만 반납

ClientCamSignUp.on('connect',()=>{
    ClientCamSignUp.subscribe(cam_topics[1],()=>{
        console.log('subscribe on ',cam_topics[1]);
        ClientCamSignUp.on('message',(topic,message,packet)=>{
			console.log('into signin');
            PythonShell.run('./signUp_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                result = result[2].split(" ")
                let data = "id : "+result[0]+", "+"age : "+result[1];
                ClientCamSignUp.publish(cam_topics[3],data,options);
            })
        })
    })
})
