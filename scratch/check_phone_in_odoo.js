const xmlrpc = require('xmlrpc');
const url = 'https://co.hakkal-est.com/xmlrpc/2/object';
const client = xmlrpc.createSecureClient(url);

const db = 'test';
const username = 'aburiyad';
const password = 'test';

const common_url = 'https://co.hakkal-est.com/xmlrpc/2/common';
const common_client = xmlrpc.createSecureClient(common_url);

common_client.methodCall('authenticate', [db, username, password, {}], (error, uid) => {
    if (error || !uid) {
        console.error('Authentication failed:', error || 'No UID');
        return;
    }
    
    console.log('Authenticated, UID:', uid);
    
    // Search for ANY partner with ANY phone containing digits
    client.methodCall('execute_kw', [db, uid, password, 'res.partner', 'search_read', [
        ['|', ['phone', '!=', false], ['mobile', '!=', false]]
    ], { fields: ['name', 'phone', 'mobile'] }], (err, partners) => {
        if (err) {
            console.error('Search error:', err);
        } else {
            console.log('Total partners with phone:', partners.length);
            const found = partners.filter(p => {
                const phoneStr = (p.phone || '') + (p.mobile || '');
                return phoneStr.includes('562850800');
            });
            console.log('Matches for 562850800:', found);
            if (found.length === 0) {
                console.log('Sample of existing partners:', partners.slice(0, 10));
            }
        }
    });
});
