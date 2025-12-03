
// Minimal Express + Sharp server (placeholder)
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();
app.use(fileUpload());
app.post('/generate', (req,res)=>{ res.send('OK'); });
app.listen(3001, ()=>console.log('Server running'));
