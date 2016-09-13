var request = require('request');
var logModule = require('../lib/log');
var globalConfig = require('../config');
var config = globalConfig.svc;

module.exports = function (context, myQueueItem) {

  try {
    log('Sending', myQueueItem, 'to livy...');
    
    // Outputting to output queue to keep history
    context.bindings.outputQueueItem = myQueueItem;

    log('Initializing logging...')
    return init(function (err) {
      if (err) {
        error('Error initializing logging:', err);
        return context.done(err);
      }

      log('Initializing logging successfully');
      return postToLivy(context.done);
    });
  } catch (err) {
    error('There was an error running the proxy app', err);
    return context.done(err);
  }

  function init(callback) {
  
    logModule.init({
      domain: process.env.COMPUTERNAME || '',
      instanceId: logModule.getInstanceId(),
      app: globalConfig.apps.proxy.name,
      level: globalConfig.log.level,
      transporters: globalConfig.log.transporters
    },
      function(err) {
        if (err) {
          error(err);
          return callback(err);
        }
        return callback();
      });
  }

  function log() {
    context.log.apply(this, arguments);
    console.log.apply(this, arguments)      
  }

  function error() {
    context.error.apply(this, arguments)
    console.error.apply(this, arguments)      
  }

  function postToLivy(callback) {

    try {
      var authenticationHeader = 'Basic ' + new Buffer(config.clusterLoginUserName + ':' + config.clusterLoginPassword).toString('base64');

      var options = {
        uri: 'https://' + config.clusterName + '.azurehdinsight.net/livy/batches',
        method: 'POST',
        headers: {
          "Content-Type": 'application/json', 
          "Authorization": authenticationHeader 
        },
        json: {
            "file": "wasb://" + config.clusterName + "@" + config.clusterStorageAccountName + ".blob.core.windows.net/" + config.localFileToRun, // file to run
            "args": [], // args to give to the job file
            "name": "new-job-name" // job name
        }
      };

      log('Checking livy state');

      try {
        request(options, function (err, response, body) {

          if (err || !response || response.statusCode != 200) {
            var errMsg = err ? err : !response ? 
              new Error ('No response received') :
              new Error ('Status code is not 200');
            return callback(errMsg);
          }

          if (!body || body.state !== 'running') {
            return callback(new Error('new job state is not running: ' + JSON.stringify(body)));          
          }

          return callback();
        });
      } catch (err) {
        error('There was a problem posting to LIVY', err);
        callback(err);
      }
    } catch (err) {
      error('There was a problem pointing to LIVY', err);
      callback(err);
    }
  }
};