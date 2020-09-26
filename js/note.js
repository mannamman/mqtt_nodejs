var t = '';
var temp = ["a","b","c","d"]
var length = temp.length - 1
for(var i =0;i<length;i++){
	t = t+`"${temp[i]}",`
}
t = t + `"${temp[length]}"`;
console.log(t);
