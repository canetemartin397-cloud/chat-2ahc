const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Indicar que la carpeta 'public' contiene los archivos web
app.use(express.static('public'));

// Memoria temporal para la colección de stickers compartidos
let coleccionStickers = [
    { url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' }, // Carita feliz
    { url: 'https://cdn-icons-png.flaticon.com/512/426/426833.png' }  // Fueguito
];

io.on('connection', (socket) => {
    console.log('🟢 Un amigo se ha conectado al servidor');

    // Al conectarse, le enviamos los stickers actuales
    socket.emit('actualizar stickers', coleccionStickers);

    // Escuchar mensajes de texto normales
    socket.on('chat message', (msg) => {
        // Protección básica contra código malicioso (XSS)
        const mensajeLimpio = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        io.emit('chat message', mensajeLimpio);
    });

    // Escuchar cuando envían un sticker al chat
    socket.on('chat sticker', (urlSticker) => {
        io.emit('chat sticker', urlSticker);
    });

    // Escuchar cuando alguien crea un sticker nuevo
    socket.on('nuevo sticker', (urlNuevo) => {
        coleccionStickers.push({ url: urlNuevo });
        io.emit('actualizar stickers', coleccionStickers); // Sincroniza a TODOS a la vez
    });

    socket.on('disconnect', () => {
        console.log('🔴 Alguien se desconectó');
    });
});

// Encender el servidor en el puerto automático de la nube, o en el 3000 si estamos en la computadora
const PUERTO = process.env.PORT || 3000;

server.listen(PUERTO, () => {
    console.log('🚀 Servidor de 2AHC corriendo en el puerto ' + PUERTO);
});
