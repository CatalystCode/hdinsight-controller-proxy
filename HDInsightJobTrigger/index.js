var request = require('request');

module.exports = function (context, myQueueItem) {
    context.log('Sending', myQueueItem, 'to livy...');
    
    // Outputting to output queue to keep history
    context.bindings.outputQueueItem = myQueueItem;
    
    var config = null;
    try {
      config = require('../../../../lib/config');
    } catch (e) {
      console.error(e);
    }

    return postToLivy(context.done);

    function postToLivy(callback) {
      var authenticationHeader = 'Basic ' + new Buffer(config.clusterLoginUserName + ':' + config.clusterLoginPassword).toString('base64');
      var options = {
        uri: 'https://' + config.clusterName + '.azurehdinsight.net/livy/batches',
        method: 'POST',
        headers: { "Authorization": authenticationHeader },
        json: { }
      };

      var options = {
        url: constants.LIVY_URL,
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

      context.log('Checking livy state');
      request(options, function (err, response, body) {

        if (err || !response || response.statusCode != 200) {
          var error = err ? err : !response ? 
            new Error ('No response received') :
            new Error ('Status code is not 200');
          return callback(error);
        }

        if (!body || body.state !== 'running') {
          return callback(new Error('new job state is not running: ' + JSON.stringify(body)));          
        }

        return callback();
      });
    }
};