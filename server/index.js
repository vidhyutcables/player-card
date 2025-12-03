// Production-ready server skeleton
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();
app.use(fileUpload());
app.use(express.json());

app.post('/generate', async (req,res)=>{
  return res.json({status:'ready'});
});

app.listen(8080, ()=>console.log('Server running on 8080'));
