// firebaseConfig.js
const admin = require('firebase-admin');
const serviceAccount =  require('./fivlia-market.json');


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
