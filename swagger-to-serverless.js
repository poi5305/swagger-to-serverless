#!/usr/bin/env node

yaml = require('js-yaml');
fs   = require('fs');
crypto = require('crypto');

// usage: ./swagger-to-serverless.js swagger.yml serverless.yml output

var swaggerYamlPath = process.argv[2];
var serverlessYamlPath = process.argv[3];
var outputPath = process.argv[4];

var swaggerObj = {};
var serverlessObj = {};
var outputObj = {};

try {
  swaggerObj = yaml.safeLoad(fs.readFileSync(swaggerYamlPath, 'utf8'));
  if (serverlessYamlPath) {
    serverlessObj = yaml.safeLoad(fs.readFileSync(serverlessYamlPath, 'utf8'));
  } else {
    serverlessObj = {functions: {}};
  }
  if (!outputPath) {
    outputPath = "output";
  }
} catch (e) {
  console.log(e);
}

if (serverlessObj.functions == undefined) {
  serverlessObj.functions = {};
}

makeServerlessFunctions();
var y = yaml.safeDump(serverlessObj);

if (!fs.existsSync(outputPath)) {
  fs.mkdirSync(outputPath);
}
fs.writeFileSync(outputPath + '/serverless.yml', y);

makeFiles();

// functions

function makeServerlessFunctions() {
  var serverlessFunctions = serverlessObj.functions;
  var pathObj = swaggerObj.paths;
  
  for(var path in pathObj) {
    for (var method in pathObj[path]) {
      // path: /trips/{tripId}/members, method: get => getTripsMembers
      var functionName = getFunctionNameFromPath(method, path);
      
      // output file struce
      var tag = "others";
      if (pathObj[path][method].hasOwnProperty('tags')) {
        tag = pathObj[path][method].tags[0].toLowerCase();
      }
      if (!outputObj.hasOwnProperty(tag)) {
        outputObj[tag] = [];
      }
      outputObj[tag].push(functionName);
      
      // make function content
      
      // deploy error
      //var serverlessFunctionName = functionName;
      // deploy success
      var md5 = crypto.createHash('md5');
      var serverlessFunctionName = md5.update(functionName).digest('hex').substr(0, 4)
        + '-' + capitalizeFirstLetter(functionName);
      
      if (!serverlessFunctions.hasOwnProperty(serverlessFunctionName)) {
        serverlessFunctions[serverlessFunctionName] = {};
      }
      var functionObj = serverlessFunctions[serverlessFunctionName];
      
      // handler
      functionObj.handler = "handler." + functionName;
      
      // events
      if (!functionObj.hasOwnProperty('events')) {
        functionObj.events = [];
      }
      
      // events.http
      var httpIndex = hasObjectKeyInArray(functionObj.events, 'http');
      if (httpIndex == -1) {
        functionObj.events.push({'http': {}});
        httpIndex = functionObj.events.length - 1;
      }
      var eventHttp = functionObj.events[httpIndex].http;
      
      // TODO cors with header
      eventHttp.cors = true;
      eventHttp.method = method;
      eventHttp.path = path;
      
      // event.http.request (parameters)
      if (pathObj[path][method].hasOwnProperty('parameters')) {
        eventHttp.integration = "lambda";
        if (!eventHttp.hasOwnProperty('request')) {
          eventHttp.request = {};
        }
        if (!eventHttp.request.hasOwnProperty('parameters')) {
          eventHttp.request.parameters = {};
        }
        var parameters = pathObj[path][method].parameters;
        for (var parameter of parameters) {
          makeServerlessRequest(parameter, eventHttp.request.parameters);
        }
      }
      // TODO event.http.request (template)
      // TODO event.http.response
    }  
  }
}

function makeServerlessRequest(swaggerParameter, serverlessParameters) {
  updateObjectFromSwaggerReference(swaggerParameter);
  var obj = {};
  if (swaggerParameter.in == 'header') {
    if (!serverlessParameters.hasOwnProperty('headers')) {
      serverlessParameters.headers = {};
    }
    serverlessParameters.headers[swaggerParameter.name] = true;
  } else if (swaggerParameter.in == 'path') {
    if (!serverlessParameters.hasOwnProperty('paths')) {
      serverlessParameters.paths = {};
    }
    serverlessParameters.paths[swaggerParameter.name] = true;
  } else if (swaggerParameter.in == 'query') {
    if (!serverlessParameters.hasOwnProperty('querystrings')) {
      serverlessParameters.querystrings = {};
    }
    if (swaggerParameter.required) {
      serverlessParameters.querystrings[swaggerParameter.name] = true;
    } else {
      serverlessParameters.querystrings[swaggerParameter.name] = false;
    }
  }
}

function makeFiles() {
  // handler text
  var requireText = "";
  var moduleText = "";
  for (var tag in outputObj) {
    var text = getIncludeJSText(tag, outputObj[tag]);
    fs.writeFileSync(outputPath + '/' + tag + '.js', text);
    
    requireText += "const " + tag + " = require('./" + tag + ".js');\n";
    
    for (var name of outputObj[tag]) {
      moduleText += "  " + name + ": " + tag + "." + name + ",\n";
    }
  }
  var text = "";
  text += requireText + "\n";
  text += "module.exports = {\n";
  text += moduleText;
  text += "};\n";
  fs.writeFileSync(outputPath + '/handler.js', text);
}

// utils

function getIncludeJSText(tag, names) {
  var objName = capitalizeFirstLetter(tag);
  var text = "";
  text += "var " + objName + " = {\n";
  for (var name of names) {
    text += "  " + name + ": (event, context, callback) => {\n";
    text += "    " + "const data = {};\n";
    text += "    " + "const response = {\n";
    text += "      " + "statusCode: 200,\n";
    text += "      " + "headers: {'Access-Control-Allow-Origin': '*'},\n";
    text += "      " + "body: JSON.stringify(data),\n";
    text += "    " + "};\n";
    text += "    " + "callback(null, response);\n";
    text += "  " + "},\n";
  }
  text += "};\n\n";
  text += "module.exports = " + objName + ";";
  return text;
}

function updateObjectFromSwaggerReference(parameter) {
  if (parameter.hasOwnProperty('$ref')) {
    var refParameters = swaggerObj.parameters;
    var refs = parameter['$ref'].split('/');
    var obj = swaggerObj[refs[1]][refs[2]];
    for (var k in obj) {
      parameter[k] = obj[k];
    }
    delete parameter['$ref'];
  }
}

function getFunctionNameFromPath(method, path) {
  var name = method;
  var paths = path.split('/');
  for (var v of paths) {
    if (v.indexOf('{') == -1) {
      name += capitalizeFirstLetter(v);
    }
  }
  return name;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function hasObjectKeyInArray(obj, key) {
  for(var k in obj) {
    if (obj[k].hasOwnProperty(key)) {
      return k;
    }
  }
  return -1;
}