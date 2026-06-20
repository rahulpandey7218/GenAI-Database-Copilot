const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello!'));

app.listen(5001, () => {
  console.log('Test server running on 5001');
  setInterval(() => console.log('Still alive'), 1000);
});
