const mqtt = require('mqtt');
const mysql = require('mysql');
const { json } = require('express');
const { PythonShell } = require('python-shell');

// Parse
//const ip = '192.168.0.117';

const ip = '192.168.0.117';
const url = "mqtt://" + ip;

//--------------------db
const db = mysql.createConnection({
     host:'localhost',
     user:'root',
     port:'3306',
     password:'4752580',
     database:'kiosk',
     dateStrings:'date'
});
db.connect();
const query = (sql)=>{
	console.log('query exec...');
  return new Promise((resolve,reject)=>{
    db.query(sql,(error,data)=>{
     if(error){
        //throw error
        reject(error);
     }
      else{
        resolve(data);
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
const cam_topics=['/cam/tx2/deter','/cam/tx2/signup','/cam/app/deter','cam/app/singup','/cam/tx2/singup/complete'];
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

function objLength(obj){
  var i=0;
  for (var x in obj){
    if(obj.hasOwnProperty(x)){
      i++;
    }
  } 
  return i;
}
//json_object("menu","ice americano", "count",1)
function makeOrderList(received){
	let basic = 'json_array(';
	let json_object = '';
	let cnt =0;
	for(var i in received){
		if(cnt===0){
			json_object = 'json_object("menu",';
		}
		else{
			json_object = ', json_object("menu",';
		}
		json_object = json_object + '"' +i+ '"' + ', "count",';
		json_object = json_object + received[i] + ")";
		basic = basic + json_object;
		cnt = cnt + 1;
	}
	basic = basic +")";
	return basic;
}
//app에게 보낼때

function toarr(data){
    for(var i=0;i<data.length;i++){
        data[i]['menu'] = JSON.parse(data[i]['menu'])
        data[i]['count'] = JSON.parse(data[i]['count'])
        //console.log('in to arr...menu',data[i]['menu']);
        //console.log('in to arr...count',data[i]['count']);
    }
}

function mymake(data){
	pretty_yymmdd(data);
    toarr(data);
    let send_json={
        "history":''
    }
    
    let smallO=[];
    for(var i=0;i<data.length;i++){
        var temp = {};
        for(var j = 0;j<data[i]['menu'].length;j++){
            temp[data[i]['menu'][j]] =data[i]['count'][j];
        }
        smallO.push(temp);
    }
    let bigO = [];
    for(var i =0;i<data.length;i++){
        var intemp = data[i]["time"];
        var temp={};
        temp[intemp] = smallO[i];
        bigO.push(temp);
    }
    send_json["history"] = bigO;
    return send_json;
}


function pretty_yymmdd(data){
	for(var i=0;i<data.length;i++){
		var temp = data[i]['time'];
		temp = temp.split(' ');
		data[i]['time'] = temp[0];
	}
}
//-------------parse message

ClientStatus.on('connect', function() { // When connected
  //toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때, toTx2구독
  ClientStatus.subscribe(topics[0], function() {
    console.log('subscribe on ',topics[0]);
    
    // 가정 1하강, 0정지, 2 상승
    ClientStatus.on('message', function(topic, message, packet) {
      message = toStr(message);
      // title -> wait, wait -> face
      if(message==='1'){
        console.log('at the toTx2... ',message);
		ClientStatus.publish(topics[1],message,options);
        ClientStatus.publish(topics[3],message,options);
      }
      
      //멈추었을시 정지했다고 알린후 얼굴판별후 DB접근
      else if(message==='0'){
        console.log('at the toTx2... ',message);
        //  if longtime, promise need
        ClientStatus.publish(topics[1],message,options);
		ClientStatus.publish(topics[3],message,options);
		try{
			PythonShell.run('./agePredict_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                console.log('face...');
                result = result[2].split(" ");
				let age = result[1];
				let id = result[0];
				//let id = 'Unknown';
				//let age = 25;
                //let data = "id : "+result[0]+", "+"age : "+result[1];
                //비회원
                if(id==='Unknown'){
					console.log('Unknown');
					// limit 사용 고려
					let select_sql = `select kiosk.order.number, kiosk.order.age, json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and  json_extract(orderlist, '$[0]."menu"') = menu.name where kiosk.order.age is not null and kiosk.order.age='${age}'`;			
					query(select_sql).
					then((data)=>{
						console.log('unknown',data);
						data=mymake(data);
						data['id'] = id;
						data['age'] = age;
						data = JSON.stringify(data);
						ClientCamDeter.publish(cam_topics[2],data,options)
						}).
					catch((error)=>console.log(error));
				}
				//회원
				else{
					console.log('member : ',id);
					let sql = `select kiosk.member.name, kiosk.order.number, json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.member join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and kiosk.member.id = kiosk.order.member_id and  json_extract(orderlist, '$[0]."menu"') = menu.name where member.id = '${id}'`;
					query(sql).
					then((data)=>{
						//data=JSON.toString(data);
						console.log('member',data);
						data = mymake(data);
						data['id'] = id;
						data['age'] = age;
						console.log(data);
						data = JSON.stringify(data);
						ClientCamDeter.publish(cam_topics[2],data,options)
						}).
					catch((error)=>console.log(error))
				}
        	})
		}
		catch(e){
			console.log(e);
		}        
        
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
      // message는 json형식일 것임
		message = toStr(message);
		try{
			message = toJson(message);
		}
		catch (e){
			console.log('json error',message);
		}
		console.log(message);
		let id = message['id'];
		let age = message['age'];
		let get_auto_increment_sql = "select count(number) from kiosk.order;"
		let auto_num = 0;
		let orderlist = '';
		try{
			orderlist = makeOrderList(message['orderlist']);
		}
		catch(e){
			console.log('order_list err');
		}
		//let auto_num = get_auto_num
		let insert_order_sql = ``;
		let insert_detail_sql='';
		if(id==='Unknown'){
			insert_order_sql = `insert into kiosk.order (age) values ('${age}')`;
		}
		else{
			insert_order_sql = `insert into kiosk.order (member_id) values ('${id}')`;
		}
		//query
		query(insert_order_sql)
		.then(()=>{
			console.log('done insert order');
			
			query(get_auto_increment_sql)
			.then((get_auto_num)=>{
				console.log('done get auto');
				auto_num = get_auto_num[0]['count(number)'];
				insert_detail_sql = `insert into detail(order_number, orderlist) values (${auto_num}, ${orderlist})`;
				
				query(insert_detail_sql)
				.then(()=>{
					console.log('done insert detail');
				})
				.catch(e=>console.log('insert detail',e))
				
			})
			.catch(e=>console.log('get auto',e))
			
		})
		.catch(e=>console.log('insert order',e))
		});
	});
})

//----------------cam

//sighup은 단순히 uuid만 반납

ClientCamSignUp.on('connect',()=>{
    ClientCamSignUp.subscribe(cam_topics[1],()=>{
        console.log('subscribe on ',cam_topics[1]);
        //message는 app에서 받아와야함
        ClientCamSignUp.on('message',(topic,message,packet)=>{
			console.log('into signup');
            PythonShell.run('./signUp_tx2.py', option, (err, result) => {
                if(err){
                    throw err;
                }
                result = result[2].split(" ")
                let info = {};
                let id = result[0];
                let age = result[1];
                info['id'] = id;
                info['age'] =age;
                info = JSON.toString(info);
                ClientCamSignUp.publish(cam_topics[3],info,options);
            })
        })
    })
})
ClientCamSignUpComplete.on('connect',()=>{
	ClientCamSignUpComplete.subscribe(cam_topics[4],()=>{
		console.log('subscribe on ',cam_topics[4]);
		ClientCamSignUpComplete.on('message',(topic,message,packet)=>{
			console.log('into signup complete');
			message = toStr(message);
			try{
				message = toJson(message);
			}
			catch (e){
				console.log('json error',message);
			}
			console.log(message);
			let id = message['id'];
			let name = message['name'];
			let age = message['age'];
			let insert_sql = `insert into member (id,name,age) values ('${id}','${name}','${age}')`;
			//query(insert_sql)
			//.then((log)=>console.log(log))
			//.catch((e)=>console.log(e));
		})
	})
})
