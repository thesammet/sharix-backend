const express = require('express')
require('../src/db/mongoose')
const userRouter = require('../src/routers/user')
const songRouter = require('../src/routers/song')
const app = express()

app.use(express.json())
app.use(userRouter)
app.use(songRouter);
app.set('trust proxy', 1);

module.exports = app