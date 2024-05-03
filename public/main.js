const socket = io()

const clientsTotal = document.getElementById('client-total')

const messageContainer = document.getElementById('message-container')
const nameInput = document.getElementById('name-input')
const messageForm = document.getElementById('message-form')
const messageInput = document.getElementById('message-input')
const GetOtherKeyButton = document.getElementById('get-other')

const messageTone = new Audio('/message-tone.mp3')
let OtherPublicKey = null
let userID = null

var rsa = forge.pki.rsa;
var keyPair = rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

var publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
var privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);

console.log('my public key that other person will have', publicKeyPem)
console.log('my private key that nobody has', privateKeyPem)

function encryptMessage(message, publicKey) {
    var publicKeyForge = forge.pki.publicKeyFromPem(publicKey);
    var encrypted = publicKeyForge.encrypt(message, 'RSA-OAEP', {
        md: forge.md.sha256.create()
    });
    return forge.util.encode64(encrypted);
}

function decryptMessage(encryptedMessage, privateKey) {
    var privateKeyForge = forge.pki.privateKeyFromPem(privateKey);
    var encrypted = forge.util.decode64(encryptedMessage);
    var decrypted = privateKeyForge.decrypt(encrypted, 'RSA-OAEP', {
        md: forge.md.sha256.create()
    });
    return decrypted;
}

socket.on('connect', () => {
    socket.emit('publicKey', publicKeyPem)
    userID = socket.connect().id
    console.log(userID)
})

socket.on('update-key', (publicKey) => {
    console.log('other key', publicKey)
    OtherPublicKey = publicKey
})


// var message = "Hello, world!";
// var encrypted = encryptMessage(message, publicKeyPem);
// console.log("Encrypted:", encrypted);
// var decrypted = decryptMessage(encrypted, privateKeyPem);
// console.log("Decrypted:", decrypted);

GetOtherKeyButton.addEventListener('click', (e) => {
    if (OtherPublicKey == null) {
        fetch(`/public-id/${userID}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                OtherPublicKey = data
                console.log('other-public-key', OtherPublicKey)
            })
            .catch(error => {
                console.error('There was a problem with your fetch operation:', error);
            });
    }
})

function UpdateOtherKeyContainer(key) {
    OtherKeyContainer.innerText = key
}

messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    sendMessage()
})

socket.on('clients-total', (data) => {
    clientsTotal.innerText = `Total Clients: ${data}`
})

function sendMessage() {
    if (messageInput.value === '') return
    // console.log(messageInput.value)

    const data = {
        name: nameInput.value,
        message: messageInput.value,
        dateTime: new Date(),
    }
    const encryptedData = encryptMessage(JSON.stringify(data), OtherPublicKey)
    console.log('sending encrypted data by other public key', encryptedData)
    socket.emit('message', encryptedData)
    addMessageToUI(true, data)
    messageInput.value = ''
}

socket.on('chat-message', (Edata) => {
    // console.log(data)
    messageTone.play()
    console.log('recieveing data encrypted by my public key', Edata)
    const dData = decryptMessage(Edata, privateKeyPem)
    const data = JSON.parse(dData)
    addMessageToUI(false, data)
})

function addMessageToUI(isOwnMessage, data) {
    clearFeedback()
    const element = `
      <li class="${isOwnMessage ? 'message-right' : 'message-left'}">
          <p class="message">
            ${data.message}
            <span>${data.name} ● ${moment(data.dateTime).fromNow()}</span>
          </p>
        </li>
        `

    messageContainer.innerHTML += element
    scrollToBottom()
}

function scrollToBottom() {
    messageContainer.scrollTo(0, messageContainer.scrollHeight)
}

messageInput.addEventListener('focus', (e) => {
    socket.emit('feedback', {
        feedback: `✍️ ${nameInput.value} is typing a message`,
    })
})

messageInput.addEventListener('keypress', (e) => {
    socket.emit('feedback', {
        feedback: `✍️ ${nameInput.value} is typing a message`,
    })
})
messageInput.addEventListener('blur', (e) => {
    socket.emit('feedback', {
        feedback: '',
    })
})

socket.on('feedback', (data) => {
    clearFeedback()
    const element = `
        <li class="message-feedback">
          <p class="feedback" id="feedback">${data.feedback}</p>
        </li>
  `
    messageContainer.innerHTML += element
})

function clearFeedback() {
    document.querySelectorAll('li.message-feedback').forEach((element) => {
        element.parentNode.removeChild(element)
    })
}
