const mqtt = require('mqtt');
const mysql = require('mysql');
const { json } = require('express');
// Parse
const ip = '192.168.219.170';
const url = "mqtt://" + ip;
let status =['',''];
// const db = mysql.createConnection({
//     host:'172.17.0.2',
//     user:'namth',
//     port:'3306',
//     password:'',
//     database:'tx2',
//     dateStrings:'date'
// });

// db.connect();
const options = {
    retain:true,
    qos:1
};
// complete때만 mqtt는 db쩝속
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
const topics=['/status/toTx2','/status/wait','/status/complete','/motor'];
var ClientStatus = mqtt.connect(url, options);
var ClientJson = mqtt.connect(url, options);

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

ClientJson.on('connect',()=>{
  // complete를 구독
  ClientJson.subscribe(topics[2],()=>{
    console.log('subscribe on ',topics[2]);
    ClientJson.on('message',(topic,message,packet)=>{
      // message는 json형식일 것임
      message = toStr(message);
      message = toJson(message);
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
