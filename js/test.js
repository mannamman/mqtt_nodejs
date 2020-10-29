const delay = require('delay');
let semapore = true;
const toggle_semapore =() => {
	return new Promise((resolve)=>{
		resolve(!semapore)
	})	
}

const done = async () => {
	console.log('insert done');
	await toggle_semapore();
	await delay(1000*4);
	console.log(semapore);
}

for(var i = 0; i<5;i++){
	done();
}