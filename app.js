const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => console.log(`💬 server on port ${PORT}`))

const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, 'public')))

let socketsConected = new Set()
const publicKeys = new Map()

io.on('connection', onConnected)

app.get('/public-id/:id', (req, res) => {
    const userID = req.params.id;
    if (socketsConected.size == 2) {
        keyToSend = null
        publicKeys.forEach((val, key) => {
            if (key != userID) {
                keyToSend = val
            }
        })
        res.send(keyToSend)
    }
})

function onConnected(socket) {
    if (socketsConected.size >= 2) {
        console.log('Max clients reached. Rejecting connection from', socket.id);
        socket.disconnect(true); // Disconnect the socket immediately
        return;
    }
    console.log('Socket connected', socket.id)
    socketsConected.add(socket.id)

    io.emit('clients-total', socketsConected.size)

    socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id)
        socketsConected.delete(socket.id)
        publicKeys.delete(socket.id)
        io.emit('clients-total', socketsConected.size)
    })

    socket.on('message', (data) => {
        // console.log(data)
        socket.broadcast.emit('chat-message', data)
    })

    socket.on('publicKey', (publicKey) => {
        publicKeys.set(socket.id, publicKey)
    })

    socket.on('feedback', (data) => {
        socket.broadcast.emit('feedback', data)
    })
}
