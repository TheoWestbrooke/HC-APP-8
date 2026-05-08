
const {createModel} = require('./model.js');
const model = createModel();
const keys = ['Output!G9','Output!I9','Output!G10','Output!I10','Output!G11','Output!I17','Output!E37'];
for (const k of keys) console.log(k, model.get(k));
