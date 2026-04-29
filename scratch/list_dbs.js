const xmlrpc = require('xmlrpc');
const url = 'https://co.hakkal-est.com/xmlrpc/2/db';
const client = xmlrpc.createSecureClient(url);

client.methodCall('list', [], (error, value) => {
    if (error) {
        console.error('Error fetching DB list:', error);
    } else {
        console.log('Available Databases:', value);
    }
});
