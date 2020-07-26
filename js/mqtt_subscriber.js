const mqtt = require('mqtt');

const ip = "mqtt://192.168.219.170";

const client = mqtt.connect(ip);

const my_topic = "/test";

function fun1(arg){
    client.end();
    console.log("time out");
    
}
//connect
client.on("connect",()=>{
    console.log("status :   "+client.connected);
    client.subscribe(my_topic,{qos:1});
    client.subscribe('/good',{qos:1});
    setTimeout(fun1,3000000);
    
});

client.on('message',(topic,message,packet)=>{
    console.log("message : "+message+", topic : "+topic);
    
});

//error
client.on("error",(error)=>{
    console.log("connect error! : "+error);
});

