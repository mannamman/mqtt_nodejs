var express = require('express');
var router = express.Router();
var req = require('request');
const { PythonShell } = require('python-shell');



router.get('/cam',function(request,response){
    var option = {
        mode: 'text',
        pythonPath: '',
        pythonOptions: ['-u'],
        scriptPath: '',
        args: ''
    };
    PythonShell.run('./routes/face.py', option, (err, result) => {
        if (err) {
            throw err;
        };
        result = result[0];
        result = result.split(" ");
        data = {
            "id" : result[0],
            "age" : result[1]
        };
        console.log(data);
        response.send(data);
        //socket.setTimeout(30 * 1);
    });
});
router.get('/cam/signup',function(request,response){
    var option = {
        mode: 'text',
        pythonPath: '',
        pythonOptions: ['-u'],
        scriptPath: '',
        args: ''
    };
    console.log('connected');
    
    PythonShell.run('./routes/signUp.py', option, (err, result) => {
        if (err) {
            throw err;
        };
        result = result[0];
        result = result.split(" ");
        data = {
            "id" : result[0],
            "age" : result[1]
        };
        console.log(data);
        response.send(data)
    });
});
router.get('/cam/deter',function(request,response){
    var option = {
        mode: 'text',
        pythonPath: '',
        pythonOptions: ['-u'],
        scriptPath: '',
        args: ''
    };
    console.log('connected');
    PythonShell.run('./routes/agePredict.py', option, (err, result) => {
        if (err) {
            throw err;
        };
        result = result[0];
        result = result.split(" ");
        data = {
            "id" : result[0],
            "age" : result[1]
        };
        console.log(data);
        response.send(data)
    });
});
router.get('/test',function(request,response){
    var option = {
        mode: 'text',
        pythonPath: '',
        pythonOptions: ['-u'],
        scriptPath: '',
        args: 'hi'
    };
    PythonShell.run('./routes/test.py', option, (err, result) => {
        if (err) {
            throw err;
        };
        console.log(result);
        
        data = {
            "id" : result[0]
        }
        data = JSON.stringify(data)
        console.log(data);
        console.log(typeof(data));
        
        response.send(data)
    });
});
//https://stackoverflow.com/questions/55606841/how-to-update-core-js-to-core-js3-dependency
module.exports = router;
