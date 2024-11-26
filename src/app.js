const express = require('express')
require('../src/db/mongoose')
const userRouter = require('../src/routers/user')
const categoryRouter = require('../src/routers/category')
const templateRouter = require('../src/routers/template')
const messageRouter = require('../src/routers/message')
const backgroundRouter = require('../src/routers/background');

const app = express()

app.use(express.json())
app.use(userRouter)
app.use(categoryRouter)
app.use(templateRouter)
app.use(messageRouter)
app.use(backgroundRouter);
app.set('trust proxy', 1);

module.exports = app