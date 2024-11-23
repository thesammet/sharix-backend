const app = require('./app')
const port = process.env.PORT

app.listen(port, async () => {
    console.log('Server is up on port ' + port)
})