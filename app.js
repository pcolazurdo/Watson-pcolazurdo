/*jshint node:true*/

// app.js
// This file contains the server side JavaScript code for your application.
// This sample application uses express as web application framework (http://expressjs.com/),
// and jade as template engine (http://jade-lang.com/).

var express = require('express');
var https = require('https');
var url = require('url');
var querystring = require('querystring');
var log4js = require('log4js');
var xmlescape = require('xml-escape');

log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('output.log',null,10000000000));

// the important part ;)
log4js.replaceConsole()
//

var logger = log4js.getLogger();

//Capture all Unhandled Errors - seems not recommended in production but for time being it is useful
process.on('uncaughtException', function(err) {
      setTimeout(function() {
      console.log("Catched Fire on getting services")
      console.log(err);},3000);
      
  });



console.log("App Started: " + Date().toString());

// setup middleware
var app = express();
app.use(express.errorHandler());
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(app.router);

app.use(express.static(__dirname + '/public')); //setup static public directory
app.set('view engine', 'jade');
app.set('views', __dirname + '/views'); //optional since express defaults to CWD/views

// There are many useful environment variables available in process.env.
// VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
// TODO: Get application information and use it in your app.

// defaults for dev outside bluemix
var service_url = '<service_url>';
var service_username = '<service_username>';
var service_password = '<service_password>';
var re_service_url = '<service_url>';
var re_service_username = '<service_username>';
var re_service_password = '<service_password>';

// VCAP_SERVICES contains all the credentials of services bound to
// this application. For details of its content, please refer to
// the document or sample of each service.
if (process.env.VCAP_SERVICES) {
  console.log('Parsing VCAP_SERVICES');
  var services = JSON.parse(process.env.VCAP_SERVICES);
  //service name, check the VCAP_SERVICES in bluemix to get the name of the services you have

  try {
    var service_name = 'language_identification';
    if (services[service_name]) {
      var svc = services[service_name][0].credentials;
      service_url = svc.url;
      service_username = svc.username;
      service_password = svc.password;
    } else {
      console.log('The service '+service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
    }
  }
  catch (e){
    setTimeout(function() {
        console.log("Catched Fire on getting services")
        console.log(e);
    }, 3000);
  }

  try {
    var re_service_name = 'relationship_extraction';
    if (services[re_service_name]) {
      var re_svc = services[re_service_name][0].credentials;
      re_service_url = re_svc.url;
      re_service_username = re_svc.username;
      re_service_password = re_svc.password;
    } else {
      console.log('The service '+re_service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
    }
  }
  catch (e){
    setTimeout(function() {
        console.log("Catched Fire on getting services")
        console.log(e);
    }, 3000);
  }


} else {
  console.log('No VCAP_SERVICES found in ENV, using defaults for local development');
  service_url = "http://locahost:3000/api/log/"
}

console.log('service_url = ' + service_url);
console.log('service_username = ' + service_username);
console.log('service_password = ' + new Array(service_password.length).join("X"));
console.log('re_service_url = ' + re_service_url);
console.log('re_service_username = ' + re_service_username);
console.log('re_service_password = ' + new Array(re_service_password.length).join("X"));

var auth = 'Basic ' + new Buffer(service_username + ':' + service_password).toString('base64');
var re_auth = 'Basic ' + new Buffer(re_service_username + ':' + re_service_password).toString('base64');

//
// API REST
//
app.get( '/api', function( request, response ) {
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok"
            }
        ];
    console.log("GET /api");

    response.send(resp);
});

app.get( '/api/log/:text', function( request, response ) {
    console.log("GET /api/log/*");
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok",
                Log: request.params.text
            }
        ];

    response.send(resp);
});

app.post( '/api/log/:text', function( request, response ) {
    console.log("POST /api/log/*");
    var resp = [
            {
                Application: "watson-pcolazurdo",
                ServiceUrl: service_url,
                Status: "Ok",
                Log: request.params.text
            }
        ];

    response.send(resp);
});

app.get( '/api/lid/:text', function( request, response) {
  var request_data = {
    'txt': request.params.text,
    'sid': 'lid-generic',  // service type : language identification (lid)
    'rt':'json' // return type e.g. json, text or xml
  };

  var parts = url.parse(service_url); //service address

  // create the request options to POST our question to Watson
  var options = { host: parts.hostname,
    port: parts.port,
    path: parts.pathname,
    method: 'POST',
    headers: {
      'Content-Type'  :'application/x-www-form-urlencoded', // only content type supported
      'X-synctimeout' : '30',
      'Authorization' :  auth }
  };

  // Create a request to POST to the Watson service
  var watson_req = https.request(options, function(result) {
    result.setEncoding('utf-8');
    var responseString = '';

    result.on("data", function(chunk) {
      responseString += chunk;
    });

    result.on('end', function() {
      try {
        var lang = JSON.parse(responseString).lang;
        return response.send({ 'txt': request.params.text, 'lang': lang });
      }
      catch (e) {
        console.log("Catched Fire on result.on (end)")
        console.log(e);
      }

    })

  });

  // create the request to Watson
  try {
    watson_req.write(querystring.stringify(request_data));
    watson_req.end();
  }
  catch (e) {
    console.log("Catched Fire on watson_req.write")
    console.log(e);
  }
});


app.get( '/api/re/:text', function( request, response) {

});



//
// PAGES
//


// render index page
app.get('/', function(req, res){
    console.log("GET /");
    res.render('index');
});


// Handle the form POST containing the text to identify with Watson and reply with the language
app.post('/', function(req, res){
  console.log("POST /");
  var request_data = {
    'txt': req.body.txt,
    'sid': 'lid-generic',  // service type : language identification (lid)
    'rt':'json' // return type e.g. json, text or xml
  };

  var parts = url.parse(service_url); //service address

  // create the request options to POST our question to Watson
  var options = { host: parts.hostname,
    port: parts.port,
    path: parts.pathname,
    method: 'POST',
    headers: {
      'Content-Type'  :'application/x-www-form-urlencoded', // only content type supported
      'X-synctimeout' : '30',
      'Authorization' :  auth }
  };

  // Create a request to POST to the Watson service
  var watson_req = https.request(options, function(result) {
    result.setEncoding('utf-8');
    var responseString = '';

    result.on("data", function(chunk) {
      responseString += chunk;
    });

    result.on('end', function() {
      var lang = JSON.parse(responseString).lang;
      return res.render('index',{ 'txt': req.body.txt, 'lang': lang });
    })

  });

  watson_req.on('error', function(e) {
    return res.render('index', {'error':e.message})
  });

  // create the request to Watson
  watson_req.write(querystring.stringify(request_data));
  watson_req.end();

});


app.get('/re', function(req, res){
    res.render('re_index');
});

// Handle the form POST containing the text to identify with Watson and reply with the language
app.post('/re', function(req, res){
  try {
    var parts = url.parse(re_service_url);

    // create the request options from our form to POST to Watson
    var options = {
      host: parts.hostname,
      port: parts.port,
      path: parts.pathname,
      method: 'POST',
      headers: {
        'Content-Type'  :'application/x-www-form-urlencoded',
        'X-synctimeout' : '30',
        'Authorization' :  auth }
    };
  }
  catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }

  // Create a request to POST to Watson
  try{
    var watson_req = https.request(options, function(result) {
      result.setEncoding('utf-8');
      var resp_string = '';

      result.on("data", function(chunk) {
        resp_string += chunk;
      });

      result.on('end', function() {
        try{
          return res.render('re_index',{'xml':xmlescape(resp_string), 'text':req.body.txt})
        }
        catch (e){
          console.log("Error: " + e);
          //res.render('error', {'error': e.message});
        }
      })
    });
  }
  catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }

  watson_req.on('error', function(e) {
    return res.render('re_index', {'error':e.message})
  });

  // Wire the form data to the service
  console.log("Query String on RE:" + querystring.stringify(req.body));
  try{
    watson_req.write(querystring.stringify(req.body));
    watson_req.end();
  }
  catch (e){
    console.log("Error: " + e);
    //res.render('error', {'error': e.message});
  }
});

// The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');
// The port on the DEA for communication with the application:
var port = (process.env.VCAP_APP_PORT || 3000);
// Start server
app.listen(port, host);
