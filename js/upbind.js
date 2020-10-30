const mqtt = require('mqtt');
const pool = require('./db.js');
const { PythonShell } = require('python-shell');
const delay = require('delay');

// Parse
//const ip = '192.168.0.117';

const ip = '192.168.0.117';
const url = "mqtt://" + ip;

//
let semapore = true;
let season_term = [[3, 6], [6, 9], [9, 12], [12, 3]];
//

//---------------option
const options = {
	retain: false,
	qos: 2
};
const option = {
	mode: 'text',
	pythonPath: '',
	pythonOptions: ['-u'],
	scriptPath: '',
	args: ''
};

//-----------------clinet connect
const topics = ['/status/toTx2', '/status/wait', '/status/complete', '/motor', '/app/options', '/app/cancel'];
const cam_topics = ['/cam/tx2/deter', '/cam/tx2/signup', '/cam/app/deter', '/cam/app/signup', '/cam/tx2/signup/complete'];
const ClientStatus = mqtt.connect(url, options);
const ClientJson = mqtt.connect(url, options);
const ClientCamDeter = mqtt.connect(url, options);
const ClientCamSignUp = mqtt.connect(url, options);
const ClientCamSignUpComplete = mqtt.connect(url, options);
const ClientOptions = mqtt.connect(url, options);
const ClientCancel = mqtt.connect(url, option);
//-----------------clinet connect

const toggle_semapore = () => {
	return new Promise((resolve) => {
		resolve(!semapore);
	})
}

//-------------parse message
const toStr = (message) => {
	message = message.toString();
	return message;
}
const toJson = (message) => {
	message = JSON.parse(message);

	return message;
}
const makeDic = (order_list) => {
	{
		let tempdic = {};
		for (var i in order_list) {
			if (tempdic[order_list[i]] === undefined) {
				tempdic[order_list[i]] = 1;
			}
			else {
				tempdic[order_list[i]] = tempdic[order_list[i]] + 1;
			}
		}
		return tempdic;
	}
}

function objLength(obj) {
	var i = 0;
	for (var x in obj) {
		if (obj.hasOwnProperty(x)) {
			i++;
		}
	}
	return i;
}
//json_object("menu","ice americano", "count",1)
function makeOrderList(received) {
	let basic = 'json_array(';
	let json_object = '';
	let cnt = 0;
	for (var i in received) {
		if (cnt === 0) {
			json_object = 'json_object("menu",';
		}
		else {
			json_object = ', json_object("menu",';
		}
		json_object = json_object + '"' + i + '"' + ', "count",';
		json_object = json_object + received[i] + ")";
		basic = basic + json_object;
		cnt = cnt + 1;
	}
	basic = basic + ")";
	return basic;
}
//app에게 보낼때

function toarr(data) {
	console.log('to arr', data[2]['menu'][0]);
	for (var i = 0; i < data.length; i++) {
		data[i]['menu'] = JSON.parse(data[i]['menu'])
		data[i]['count'] = JSON.parse(data[i]['count'])
		//console.log('in to arr...menu',data[i]['menu']);
		//console.log('in to arr...count',data[i]['count']);
	}
}

function mymake(data) {
	pretty_yymmdd(data);
	toarr(data);
	let send_json = {
		"history": ''
	}

	let smallO = [];
	for (var i = 0; i < data.length; i++) {
		var temp = {};
		for (var j = 0; j < data[i]['menu'].length; j++) {
			temp[data[i]['menu'][j]] = data[i]['count'][j];
		}
		smallO.push(temp);
	}
	let bigO = [];
	for (var i = 0; i < data.length; i++) {
		var intemp = data[i]["time"];
		var temp = {};
		temp[intemp] = smallO[i];
		bigO.push(temp);
	}
	send_json["history"] = bigO;
	return send_json;
}


function pretty_yymmdd(data) {
	for (var i = 0; i < data.length; i++) {
		var temp = data[i]['time'];
		temp = temp.split(' ');
		temp = temp[0];
		let nonbar = '';
		for (var j = 0; j < temp.length; j++) {
			if (temp[j] !== '-') {
				nonbar = nonbar + temp[j];
			}
		}
		data[i]['time'] = nonbar;
	}
}
function basic(data) {
	//toarr(data);
	pretty_yymmdd(data);
	return data;
}
function AddKey(data, key) {
	let ObjData = {};
	ObjData[key] = data;
	return ObjData;
}

function favorite(data) {
	let Obj = {};
	let result = [];
	data.forEach((element) => {
		element['menu'].forEach((inelement) => {
			if (Obj[inelement] === undefined) {
				Obj[inelement] = 1;
			}
			else {
				Obj[inelement] = Obj[inelement] + 1;
			}
		});
	});
	let sortable = [];
	for (var i in Obj) {
		sortable.push([i, Obj[i]]);
	}
	let sorted = sortable.sort(function (a, b) {
		return a[1] - b[1];
	});
	sorted = sorted.reverse();
	for (var i = 0; i < sorted.length; i++) {
		if (i > 5) { break; }
		result.push(sorted[i][0]);
	}
	return result;
}

function get_season() {
	let date = new Date();
	let month = date.getMonth();
	if (month >= 3 && month <= 5) {
		return season_term[0];
	}
	else if (month >= 6 && month <= 8) {
		return season_term[1];
	}
	else if (month >= 9 && month <= 11) {
		return season_term[2];
	}
	else {
		return season_term[3];
	}
}
//-------------parse message

ClientStatus.on('connect', function () { // When connected
	//toTx2에서 메세지가 올때 즉 모니터의 상태변화가 필요할때, toTx2구독
	ClientStatus.subscribe(topics[0], function () {
		console.log('subscribe on ', topics[0]);

		// 가정 1하강, 0정지, 2 상승
		ClientStatus.on('message', async function (topic, message, packet) {
			message = toStr(message);
			// title -> wait, wait -> face
			if (semapore === true) {
				if (message === '1') {
					console.log('at the toTx2... ', message);

					ClientStatus.publish(topics[1], message, options);
					ClientStatus.publish(topics[3], message, options);

				}

				//멈추었을시 정지했다고 알린후 얼굴판별후 DB접근
				else if (message === '0') {
					console.log('at the toTx2... ', message);
					semapore = await toggle_semapore();
					//topics[1]은 app에게 3은 motor
					ClientStatus.publish(topics[1], message, options);
					ClientStatus.publish(topics[3], message, options);
					try {
						PythonShell.run('./agePredict_tx2.py', option, async (err, result) => {
							if (err) {
								throw err;
							}
							console.log('into deter...');
							result = result[2].split(" ");
							let age = result[1];
							let id = result[0];
							let cur_range = get_season();
							let orand = 'and';
							if (cur_range[0] === 12) {
								orand = 'or';
							}
							let season_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and  json_extract(orderlist, '$[0]."menu"') = menu.name where month(kiosk.order.time) between ${cur_range[0]} and ${cur_range[1]}`;
							let hot_menu_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and json_extract(orderlist, '$[0]."menu"') = menu.name order by kiosk.order.time desc limit 100`;
							//temp
							//id = 'Unknown';
							//age = 25;
							//temp
							//let data = "id : "+result[0]+", "+"age : "+result[1];
							//비회원
							if (id === 'Unknown') {
								console.log('Unknown');
								try {
									const connection = await pool.getConnection(async (conn) => conn);
									try {
										let select_sql = `select json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and  json_extract(orderlist, '$[0]."menu"') = menu.name where kiosk.order.member_id is null`;
										let ages_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and json_extract(orderlist, '$[0]."menu"') = menu.name where kiosk.order.age = '${age}' order by time desc limit 50`;
										let [rows_season] = await connection.query(season_sql);
										let [rows_hot_menu] = await connection.query(hot_menu_sql);
										let [rows_ages] = await connection.query(ages_sql);
										let SendObj = {};
										SendObj['id'] = id;
										SendObj['name'] = id;
										SendObj['age'] = age;
										//SendObj['season'] = favorite(rows_season);
										//SendObj['favorite'] = favorite(rows_hot_menu);
										//SendObj['ages'] = favorite(rows_ages);
										SendObj['season'] = favorite(rows_season);
										SendObj['favorite'] = favorite(rows_hot_menu)
										SendObj['ages'] = favorite(rows_ages);
										SendObj['history'] = [{}];
										SendObj = JSON.stringify(SendObj);
										console.log('stringify', SendObj);
										connection.release();
										ClientCamDeter.publish(cam_topics[2], SendObj, options);

									}
									catch (e) {
										console.log('query error');
										connection.release();

									}
								}
								catch (e) {
									console.log('pool error');

								}
							}
							//회원
							else {
								console.log('member : ', id);
								try {
									const connection = await pool.getConnection(async (conn) => conn);
									try {
										let history_sql = `select json_extract(orderlist, '$[*]."menu"')as menu, json_extract(orderlist, '$[*]."count"') as count, kiosk.order.time from kiosk.detail join kiosk.member join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and kiosk.member.id = kiosk.order.member_id and  json_extract(orderlist, '$[0]."menu"') = menu.name where member.id = '${id}'`;// menu count time
										let user_info_sql = `select * from member where id = '${id}'`;//age name id
										let options_sql = `SELECT menu, cupSize, shot, syrup, base, whipping, drizzle, ice, price, member_id FROM kiosk.options where member_id ="${id}"`;
										let ages_sql = `select json_extract(orderlist, '$[*]."menu"')as menu from kiosk.detail join kiosk.member join kiosk.order join kiosk.menu on kiosk.order.number = kiosk.detail.order_number and kiosk.member.id = kiosk.order.member_id and json_extract(orderlist, '$[0]."menu"') = menu.name where kiosk.member.age = '${age}' order by time desc limit 50`;
										let [rows_history] = await connection.query(history_sql);
										let [rows_season] = await connection.query(season_sql);
										let [rows_hot_menu] = await connection.query(hot_menu_sql);
										let [rows_options] = await connection.query(options_sql);
										let [rows_ages] = await connection.query(ages_sql);
										console.log('history : ', rows_history);
										console.log('season : ', rows_season);
										console.log('hot_menu : ', rows_hot_menu);
										let SendObj = {};
										SendObj = basic(rows_history);
										SendObj = AddKey(SendObj, 'history');
										let [rows_info] = await connection.query(user_info_sql);
										let user_name = rows_info[0]['name'];
										let user_age = rows_info[0]['age'];
										let user_id = rows_info[0]['id'];
										SendObj['id'] = user_id;
										SendObj['name'] = user_name;
										SendObj['age'] = user_age;
										SendObj['season'] = favorite(rows_season);
										SendObj['favorite'] = favorite(rows_hot_menu);
										SendObj['ages'] = favorite(rows_ages);
										SendObj['ages'] = ["쿨 라임 피지오", "자몽 셔벗 블렌디드", "카페 아메리카노", "콜드 브루", "화이트 초콜릿 모카", "블루베리 베이글", "럼 샷 코르타도"];
										//SendObj['season'] = ["카페 아메리카노", "카푸치노", "카페 모카"];
										//SendObj['favorite'] = ["카푸치노", "카페 아메리카노", "카페 모카"];
										//SendObj['ages'] = ["카페 모카", "카푸치노", "카페 아메리카노"];
										//SendObj['history'] = [{}];
										SendObj['options'] = rows_options;
										SendObj = JSON.stringify(SendObj);
										console.log('stringify', SendObj);
										connection.release();
										ClientCamDeter.publish(cam_topics[2], SendObj, options);

									}
									catch (e) {
										console.log('query error');
										connection.release();

									}
								}
								catch (e) {
									console.log('pool error');

								}
							}

						})
					}
					catch (e) {
						console.log('python error : ', e);

					}
				}
			}
			else { console.log('now process is running'); }
		});
	});
});


// complete를 구독
ClientJson.on('connect', function () {
	ClientJson.subscribe(topics[2], () => {
		console.log('subscribe on ', topics[2]);
		ClientJson.on('message', async (topic, message, packet) => {
			// message는 json형식일 것임
			semapore = await toggle_semapore();
			if (semapore === true) {
				console.log('in complete');
				semapore = await toggle_semapore();
				message = toStr(message);
				console.log('original message : ', message);
				try {
					message = toJson(message);
				}
				catch (e) {
					console.log('json error', message);
				}
				console.log('parsed msg : ', message);
				let id = message['id'];
				let age = message['age'];
				let get_auto_increment_sql = "select count(number) from kiosk.order;"
				let auto_num = 0;
				let orderlist = '';
				try {
					UnsortedOrderList = message['orderlist'];
					const ordered = {};
					Object.keys(UnsortedOrderList).sort().forEach(function (key) {
						ordered[key] = UnsortedOrderList[key];
					});
					orderlist = makeOrderList(ordered);
				}
				catch (e) {
					console.log('order_list err');
				}
				let insert_order_sql = ``;
				let insert_detail_sql = '';

				if (id === 'Unknown') {
					insert_order_sql = `insert into kiosk.order (age) values ('${age}')`;
				}
				else {
					insert_order_sql = `insert into kiosk.order (member_id) values ('${id}')`;
				}
				try {
					let auto_num = 0;
					const connection = await pool.getConnection(async (conn) => conn);
					try {

						await connection.beginTransaction();
						let [rows_null] = await connection.query(insert_order_sql);
						console.log('done insert order');
						let [rows_auto_num] = await connection.query(get_auto_increment_sql);
						console.log('done get auto');
						auto_num = rows_auto_num[0]['count(number)'];
						insert_detail_sql = `insert into detail(order_number, orderlist) values (${auto_num}, ${orderlist})`;
						[rows_null] = await connection.query(insert_detail_sql);
						connection.commit();
						connection.release();
						console.log('done insert detail');
					}
					catch (e) {
						console.log('pool error', e);
						connection.rollback();
						try {
							const init_auto_increment = `alter table kiosk.order auto_increment=${auto_num};`;
							let [rows_auto_increment] = await connection.query(init_auto_increment);
							console.log('done init auto_increment');
						}
						catch (init_e) {
							console.log('auto_increment init error', init_e);
						}
						connection.release();
					}
				}
				catch (e) {
					console.log('pool error');
				}
				// up up up up up
				// 만약 딜레이를 꽤나 오래준다면 프레임을 최상단 상태로 복구가능 할듯
				// 모터에게 직접 주는거라서 세마포어 풀필요 없이 직접 건내주고
				// 몇초동안 쉬고 세마포어 열어주면 다시 입력 받음
				ClientStatus.publish(topics[3], "2", options);
				await delay(1000 * 4);
				semapore = await toggle_semapore();
			}
			else {
				console.log('now process is running');
			}

		});
	});
});
function make_option(data) {
	let result = '';
	data = Object.values(data);
	console.log('in make option', data);
	const length = data.length - 1;
	for (var i = 0; i < length; i++) {
		result = result + `"${data[i]}",`
	}
	result = result + `"${data[length]}"`;
	console.log('result', result);
	return result;
}
// subs options
ClientOptions.on('connect', () => {
	ClientOptions.subscribe(topics[4], () => {
		console.log('subscribe on ', topics[4]);
		ClientOptions.on('message', async (topic, message, packet) => {
			message = message.toString();
			console.log('original message : ', message);
			message = message.slice(1, message.length - 1);
			console.log('into options');

			console.log('after slice ', message);
			try {
				message = toJson(message);
			}
			catch (e) {
				console.log('json error', message);
			}

			try {
				const connection = await pool.getConnection(async (conn) => conn);
				console.log('before make options', message);
				const insert_value = make_option(message);
				console.log(insert_value);
				try {
					let insert_options_sql = `insert into options (menu, cupSize, shot, syrup, base, whipping, drizzle, ice, price, member_id) values (${insert_value})`
					let [rows_null] = await connection.query(insert_options_sql);
					console.log('done insert option');
					connection.release();

				}
				catch (e) {
					console.log('query error', e);
					connection.release();

				}
			}
			catch (e) {
				console.log('pool error');

			}


		})
	})
})

//----------------cam

//sighup은 단순히 uuid만 반납

ClientCamSignUp.on('connect', () => {
	ClientCamSignUp.subscribe(cam_topics[1], () => {
		console.log('subscribe on ', cam_topics[1]);
		ClientCamSignUp.on('message', (topic, message, packet) => {
			console.log('into signup');
			PythonShell.run('./signUp_tx2.py', option, async (err, result) => {
				if (err) {
					throw err;
				}
				console.log(result);
				result = result[2].split(" ")
				let id = result[0];
				console.log('sign up id ', id);
				ClientCamSignUp.publish(cam_topics[3], id, options);
			})

		})
	})
})
ClientCamSignUpComplete.on('connect', () => {
	ClientCamSignUpComplete.subscribe(cam_topics[4], () => {
		console.log('subscribe on ', cam_topics[4]);
		ClientCamSignUpComplete.on('message', async (topic, message, packet) => {
			console.log('into signup complete');
			console.log('origin message : ', message);
			message = message.toString();
			console.log('toString', message);
			message = message.slice(1, message.length - 1);
			console.log("slicing", message);
			try {
				message = toJson(message);
			}
			catch (e) {
				console.log('json error', message);
			}
			try {
				console.log(message);
				const id = message['uuid'];
				const name = message['name'];
				const age = message['age'];
				let insert_sql = `insert into member (id,name,age) values ('${id}','${name}','${age}')`;
				console.log(insert_sql);
				const connection = await pool.getConnection(async (conn) => conn);
				try {
					const [rows] = await connection.query(insert_sql);
					connection.release();
					console.log('sinup complete', rows);

				}
				catch (error) {
					console.log('pool error', error);
					connection.release();

				}
			}
			catch (e) {
				console.log('db error', e);

			}

		})
	})
})

// 취소 토픽만 정하면 됨
ClientCancel.on('connect', () => {
	ClientCancel.subscribe(topics[5], () => {
		console.log('subscribe on ', topics[1]);
		ClientCancel.on('message', (topic, message, packet) => {
			console.log('into cancel');
			// 취소시 일단 올리고 -> delay -> semapore
			ClientCancel.publish(topics[3], "2", options);
			console.log('now up!');
			await delay(1000 * 4);
			console.log('delay done!');
			semapore = await toggle_semapore();
		})
	})
})


