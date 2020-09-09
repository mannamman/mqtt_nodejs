const mqtt = require('mqtt');
const pool = require('./db.js');
const { json } = require('express');
const { PythonShell } = require('python-shell');

// Parse
//const ip = '192.168.0.117';

const ip = '192.168.0.117';
const url = "mqtt://" + ip;

//
let semapore = true;
let season_term = [[3,6],[6,9],[9,12],[12,3]];
//

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
	console.log('to arr',data[2]['menu'][0]);
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
		temp = temp[0];
		let nonbar = '';
		for(var j = 0;j<temp.length;j++){
			if(temp[j]!=='-'){
				nonbar = nonbar + temp[j];
			}
		}
		data[i]['time'] = nonbar;
	}
}
function basic(data){
	//toarr(data);
	pretty_yymmdd(data);
	return data;
}
function AddKey(data,key){
	let ObjData = {};
	ObjData[key] = data;
	return ObjData;
}

function favorite(data){
	let Obj = {};
	let result = [];
	data.forEach((element)=>{
		element['menu'].forEach((inelement)=>{
			if(Obj[inelement]===undefined){
				Obj[inelement] = 1;
			}
			else{
				Obj[inelement] = Obj[inelement] + 1;
			}
		});
	});
	let sortable = [];
	for (var i in Obj) {
		sortable.push([i, Obj[i]]);
	}
	let sorted = sortable.sort(function(a, b) {
		return a[1] - b[1];
	});
	sorted = sorted.reverse();
	for(var i=0;i<sorted.length;i++){
		if(i>5){break;}
		result.push(sorted[i][0]);
	}
	return result;
}

function get_season(){
	let date = new Date();
	let month = date.getMonth();
	if(month>=3 && month<=5){
		return season_term[0];
	}
	else if(month>=6 && month<=8){
		return season_term[1];
	}
	else if(month>=9 && month<=11){
		return season_term[2];
	}
	else{
		return season_term[3];
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
      if(semapore===true){
		  if(message==='1'){
			console.log('at the toTx2... ',message);
			semapore = false;
			ClientStatus.publish(topics[1],message,options);
			ClientStatus.publish(topics[3],message,options);
			semapore = true;
		  }
      
      //멈추었을시 정지했다고 알린후 얼굴판별후 DB접근
		  else if(message==='0'){
			console.log('at the toTx2... ',message);
			semapore = false;
			
			//topics[1]은 app에게 3은 motor
			ClientStatus.publish(topics[1],message,options);
			ClientStatus.publish(topics[3],message,options);
			try{
				PythonShell.run('./agePredict_tx2.py', option, async (err, result) => {
					if(err){
						throw err;
					}
					console.log('into deter...');
					result = result[2].split(" ");
					let age = result[1];
					let id = result[0];
					let cur_range = get_season();
					let orand = 'and';
					if(cur_range[0]===12){
						orand = 'or';
					}
					let season_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and  json_extract(orderlist, '$[0]."menu"') = menu.name where month(now()) >= ${cur_range[0]} ${orand} month(now()) <= ${cur_range[1]}`;
					let hot_menu_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and json_extract(orderlist, '$[0]."menu"') = menu.name order by kiosk.order.time desc limit 100`;
					//temp
					//id = 'Unknown';
					//age = 25;
					//temp
					//let data = "id : "+result[0]+", "+"age : "+result[1];
					//비회원
					if(id==='Unknown'){
						console.log('Unknown');	
						try{
							const connection = await pool.getConnection(async (conn)=>conn);
							try{
								let select_sql = `select json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and  json_extract(orderlist, '$[0]."menu"') = menu.name where kiosk.order.member_id is null`;
								let [rows] = await connection.query(select_sql);
								let [rows_season] = await connection.query(season_sql);
								let [rows_hot_menu] = await connection.query(hot_menu_sql);
								rows = basic(rows);
								rows = AddKeyHistory(rows);
								rows['id'] = id;
								rows['age'] = age;
								rows['name'] = id;
								rows['season'] = favorite(rows_season);
								rows['hot'] = favorite(rows_hot_menu)
								rows = JSON.stringify(rows);
								connection.release();
								ClientCamDeter.publish(cam_topics[2],rows,options);
								semapore = true; 
							}
							catch(e){
								console.log('query error');
								connection.release();
								semapore = true; 
							}
						}
						catch(e){
							console.log('pool error');
							semapore = true; 
						}
					}
					//회원
					else{
						console.log('member : ',id);
						try{
							const connection = await pool.getConnection(async (conn)=>conn);
							try{
								
								let history_sql = `select json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.member join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and kiosk.member.id = kiosk.order.member_id and  json_extract(orderlist, '$[0]."menu"') = menu.name where member.id = '${id}'`;// menu count time
								let user_info_sql = `select * from member where id = '${id}'`;//age name id
								let [rows_history] = await connection.query(history_sql);
								let [rows_season] = await connection.query(season_sql);
								let [rows_hot_menu] = await connection.query(hot_menu_sql);
								console.log('history : ',rows_history);
								console.log('season : ',rows_season);
								console.log('hot_menu : ',rows_hot_menu);
								let SendObj = {};
								SendObj = basic(rows_history);
								SendObj = AddKey(SendObj,'history');
								let [rows_info] = await connection.query(user_info_sql);
								let user_name = rows_info[0]['name'];
								let user_age = rows_info[0]['age'];
								let user_id = rows_info[0]['id'];
								SendObj['id'] = user_id;
								SendObj['name'] = user_name;
								SendObj['age'] = user_age;
								SendObj['season'] = favorite(rows_season);
								SendObj['hot'] = favorite(rows_hot_menu);
								SendObj = JSON.stringify(SendObj);
								console.log('stringify',SendObj);
								connection.release();
								ClientCamDeter.publish(cam_topics[2],SendObj,options);
								semapore = true; 
							}
							catch(e){
								console.log('query error');
								connection.release();
								semapore = true; 
							}
						}
						catch(e){
							console.log('pool error');
							semapore = true; 
						}
					}
					
				})
			}
			catch(e){
				console.log('python error : ',e);
				semapore = true; 
			}       
		  }
		  else if(message==='2'){
			console.log('at the toTx2... ',message);
			semapore = false;
			ClientStatus.publish(topics[3],message,options);
			semapore = true;
			}
		  }
      else{console.log('now process is running');}
    });
  });
});


// complete를 구독
//insert into detail (order_number,orderlist) values (4,'[{"id":1,"test":2}]')
ClientJson.on('connect',function(){
	ClientJson.subscribe(topics[2],()=>{
		console.log('subscribe on ',topics[2]);
	ClientJson.on('message',async (topic,message,packet)=>{
      // message는 json형식일 것임
		if(semapore===true){
			console.log('in complete');
			semapore = false;
			message = toStr(message);
			try{
				message = toJson(message);
			}
			catch (e){
				console.log('json error',message);
			}
			console.log('msg : ',message);
			let id = message['id'];
			let age = message['age'];
			let get_auto_increment_sql = "select count(number) from kiosk.order;"
			let auto_num = 0;
			let orderlist = '';
			try{
				UnsortedOrderList = message['orderlist'];
				const ordered = {};
				Object.keys(UnsortedOrderList).sort().forEach(function(key) {
					ordered[key] = UnsortedOrderList[key];
				});
				orderlist = makeOrderList(ordered);
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
			try{
				const connection = await pool.getConnection(async (conn)=>conn);
				try{
					await connection.beginTransaction();
					let [rows_null] = await connection.query(insert_order_sql);
					console.log('done insert order');
					let [rows_auto_num] =await connection.query(get_auto_increment_sql);
					console.log('done get auto');
					let auto_num = rows_auto_num[0]['count(number)'];
					insert_detail_sql = `insert into detail(order_number, orderlist) values (${auto_num}, ${orderlist})`;
					[rows_null] = await connection.query(insert_detail_sql);
					connection.commit();
					connection.release();
					console.log('done insert detail');
					semapore = true;
				}
				catch(e){
					console.log('pool error');
					connection.rollback();
					connection.release();
					semapore = true;
				}
			}
			catch(e){
				console.log('pool error');
				semapore = true;
			}
		}
		else{
			console.log('now process is running');
		}
		
		});
	});
})

//----------------cam

//sighup은 단순히 uuid만 반납
function ChangeSemapore(){
	if(semapore===true){semapore=false}
	else{semapore=true}
	return 0;
}
ClientCamSignUp.on('connect',()=>{
    ClientCamSignUp.subscribe(cam_topics[1],()=>{
        console.log('subscribe on ',cam_topics[1]);
        //message는 app에서 받아와야함
        ClientCamSignUp.on('message',(topic,message,packet)=>{
			if(semapore===true){
				console.log('into signup');
				semapore = false;
				PythonShell.run('./signUp_tx2.py', option, async (err, result) => {
					if(err){
						throw err;
					}
					result = result[2].split(" ")
					let id = result[0];
					let info = `{'uuid':'${id}'}`;
					ClientCamSignUp.publish(cam_topics[3],info,options);
					let semapore_temp = await ChangeSemapore();
				})
			}
			else{
				console.log('now process is running');
			}
			
        })
    })
})
ClientCamSignUpComplete.on('connect',()=>{
	ClientCamSignUpComplete.subscribe(cam_topics[4],()=>{
		console.log('subscribe on ',cam_topics[4]);
		ClientCamSignUpComplete.on('message',async (topic,message,packet)=>{
			if(semapore===true){
				console.log('into signup complete');
				semapore = false;
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
				try{
					const connection = await pool.getConnection(async (conn)=>conn);
					try{
						await connection.beginTransaction();
						const [rows] = await connection.query(insert_sql);
						connection.commit();
						connection.release();
						console.log('sinup complete', rows);
						semapore = true;
					}
					catch(e){
						console.log('pool error');
						connection.release();
						semapore = true;
					}
				}
				catch(e){
					console.log('db error');
					semapore = true;
				}
			}
			else{
				console.log('now process is running');
			}
			
		})
	})
})
