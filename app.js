const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 450
});

app.use(limiter);

app.get('/', async(req, res) => {
  return res.status(200).json({success: 'Success'});
});

app.listen(3000, () => console.log('Server running on port 3000'));