const mqtt = require('mqtt');
const mysql = require('mysql');
const { json } = require('express');
const { PythonShell } = require('python-shell');
// Parse
const ip = '192.168.0.117';
const url = "mqtt://" + ip;

//--------------------db
// const db = mysql.createConnection({
//     host:'172.17.0.2',
//     user:'namth',
//     port:'3306',
//     password:'',
//     database:'tx2',
//     dateStrings:'date'
// });
// db.connect();
//const query = (sql)=>{
//  return new Promise((resolve,reject)=>{
//    db.query(sql,(error,result)=>{
//      if(error){
//        throw error
//        reject(error('query error'));
//      }
//      else{
//        resolve(result);
//      }
//    })
//  });
//}
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
      console.log(message);
      // title -> wait, wait -> face
      //일단 1은 봉인시켜놓고 앱에서 주문완료시만 최상단으로 올라가도록
      if(message==2){
        console.log('at the toTx2 ',message);
        ClientStatus.publish(topics[1],'2',options);// 앱에게 올라간다고 알림 down
        ClientStatus.publish(topics[3],'2',options);// 모터를 올라가도록 구동
      }
      else if(message==0){
        console.log('at the toTx2 ',message);
        //  if longtime promise need
        setTimeout(function() {
        }, 30000);
        ClientStatus.publish(topics[1],'0',options);// 앱에게 멈추었다고 알리면 앱은 http로 얼굴 정보 가져오기
        ClientStatus.publish(topics[3],'0',options);// stop
      }
      else{
        console.log('at the toTx2 ',message);
        ClientStatus.publish(topics[1],'1',options)// up; app에게만 알림 따로 못올라가고 앱에서 complete를 받아야지만 올라감
      }
    });
  });
});

ClientJson.on('connect',function(){
  // complete를 구독
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
      //sql = `INSERT INTO mqtt_test ('name','history','date') values ("${name}","${order_list}",now())`;
      //비동기 처리
      // query(sql).
      // then(()=>console.log('done')).
      // catch(error=>console.log(error))
      ClientJson.publish(topics[3],'1',options);// 이러면 최상단으로 올라가야함 /motor
    });
    
  });
})

ClientCamDeter.on('connect',function(){
    ClientCamDeter.subscribe(cam_topics[0],()=>{
        console.log('subscribe on ',cam_topics[0]);
        ClientCamDeter.on('message',(topic,message,packet)=>{
            PythonShell.run('./agePredict_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                result = result[2].split(" ");
                let data = "id : "+result[0]+", "+"age"+result[1];
                ClientCamDeter.publish(cam_topics[2],data,options);
            })
        })
    })
})

ClientCamSignUp.on('connect',()=>{
    ClientCamSignUp.subscribe(cam_topics[1],()=>{
        console.log('subscribe on ',cam_topics[1]);
        ClientCamSignUp.on('message',(topic,message,packet)=>{
            PythonShell.run('./signUp_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                result = result[2].split(" ")
                let data = "id : "+result[0]+", "+"age"+result[1];
                ClientCamSignUp.publish(cam_topics[3],data,options);
            })
        })
    })
})
