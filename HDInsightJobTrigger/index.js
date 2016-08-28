module.exports = function (context, myQueueItem) {
    context.log('Node.js queue trigger function processed work item', myQueueItem);
    
    context.bindings.outputQueueItem = { 
        some_text: 'hello world', 
        data: myQueueItem };
    
    context.done();
};x