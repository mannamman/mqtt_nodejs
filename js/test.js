
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
function start(){
	return new Promise((resolve,reject)=>{
		resolve('start ok');
	})
}
function and(){
	return new Promise((resolve,reject)=>{
		setTimeout(function(){
			resolve('and ok');
		}, 1000);
	})
}
function end(){
	return new Promise((resolve,reject)=>{
		resolve('end ok');
	})
}
start().then((data)=>{
	console.log(data);
		and().then((data)=>{
			console.log(data);
			end().then(data=>console.log(data))
		})
})
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
		json_object = json_object+i+', "count",';
		json_object = json_object+received[i]+")";
		basic = basic + json_object;
		cnt = cnt + 1;
	}
	basic = basic +")";
	return basic;
}
var abc ={
	"ice americano":1,
	"cake":2,
	"juice":3
}
console.log(makeOrderList(abc));
