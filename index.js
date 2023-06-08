const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

require('dotenv').config()
app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
    res.send('jingle is OK now')
})

app.listen(port, () => {
    console.log(`JINGLE is sitting on port ${port}`);
})