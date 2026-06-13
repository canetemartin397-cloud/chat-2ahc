const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e7 }); // Soporte 10MB para fotos

app.use(express.static('public'));

let coleccionStickers = [];
// 🔥 NUEVO: La memoria a corto plazo del chat (últimos 100 mensajes)
let historialMensajes = []; 

io.on('connection', (socket) => {
    console.log('🟢 Un rey ha entrado al lobby');

    // Apenas entran, les mandamos los stickers y TODO el historial del chat
    socket.emit('actualizar stickers', coleccionStickers);
    socket.emit('historial', historialMensajes);

    // Escuchar mensajes de texto
    socket.on('chat message', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textoLimpio = datos.texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const mensajeFinal = { tipo: 'texto', nombre: nombreLimpio, foto: datos.foto, texto: textoLimpio };
        
        // Lo guardamos en la memoria del servidor
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift(); // Borra el más viejo si pasamos de 100
        
        io.emit('chat message', mensajeFinal);
    });

    // Escuchar stickers enviados al chat
    socket.on('chat sticker', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const mensajeFinal = { tipo: 'sticker', nombre: nombreLimpio, foto: datos.foto, url: datos.url };
        
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift();

        io.emit('chat sticker', mensajeFinal);
    });

    // Crear sticker para la colección
    socket.on('nuevo sticker', (imagenBase64) => {
        coleccionStickers.push({ url: imagenBase64 });
        io.emit('actualizar stickers', coleccionStickers);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Alguien se fue del lobby');
    });
});

const PUERTO = process.env.PORT || 3000;
server.listen(PUERTO, () => {
    console.log('🚀 Servidor 2AHC activo en puerto ' + PUERTO);
});
