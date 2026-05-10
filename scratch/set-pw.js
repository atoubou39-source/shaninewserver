const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../data/users.json');
const users = JSON.parse(fs.readFileSync(file));
users['966500000000'].passwordHash = bcrypt.hashSync('password123', 10);
fs.writeFileSync(file, JSON.stringify(users, null, 2));
console.log('Password updated');
