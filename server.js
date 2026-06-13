const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 🔥 CAMBIO AQUÍ: Aumentamos el límite de tamaño para que soporte subir imágenes
const io = new Server(server, { maxHttpBufferSize: 1e7 }); // 10 Megabytes

app.use(express.static('public'));

// Memoria temporal de stickers (empezará vacía para que suban los suyos)
let coleccionStickers = [];

io.on('connection', (socket) => {
    console.log('🟢 Un amigo se conectó');

    socket.emit('actualizar stickers', coleccionStickers);

    // Escuchar mensajes de texto
    socket.on('chat message', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textoLimpio = datos.texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        io.emit('chat message', { nombre: nombreLimpio, texto: textoLimpio });
    });

    // Escuchar cuando se envía un sticker al chat
    socket.on('chat sticker', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        io.emit('chat sticker', { nombre: nombreLimpio, url: datos.url });
    });

    // 🔥 NUEVO: Recibe la imagen convertida en código y la guarda
    socket.on('nuevo sticker', (imagenBase64) => {
        coleccionStickers.push({ url: imagenBase64 });
        io.emit('actualizar stickers', coleccionStickers);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Alguien se desconectó');
    });
});

const PUERTO = process.env.PORT || 3000;
server.listen(PUERTO, () => {
    console.log('🚀 Servidor de 2AHC corriendo en el puerto ' + PUERTO);
});
