const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e7 });

app.use(express.static('public'));

let coleccionStickers = [];
let historialMensajes = [];
let usuariosConectados = {}; 
let antiSpam = {}; 

io.on('connection', (socket) => {
    socket.emit('actualizar stickers', coleccionStickers);
    socket.emit('historial', historialMensajes);

    socket.on('entrar al lobby', (perfil) => {
        usuariosConectados[socket.id] = perfil;
        io.emit('actualizar usuarios', Object.values(usuariosConectados));
    });

    socket.on('actualizar perfil', (perfilActualizado) => {
        usuariosConectados[socket.id] = perfilActualizado;
        historialMensajes.forEach(msg => {
            if (msg.idUsuario === perfilActualizado.id) {
                msg.nombre = perfilActualizado.nombre;
                msg.foto = perfilActualizado.foto;
            }
        });
        io.emit('historial', historialMensajes);
        io.emit('actualizar usuarios', Object.values(usuariosConectados));
    });

    socket.on('chat message', (datos) => {
        const ahora = Date.now();
        if (antiSpam[datos.id] && ahora - antiSpam[datos.id] < 5000) return; 
        antiSpam[datos.id] = ahora;

        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textoLimpio = datos.texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const mensajeFinal = { idUsuario: datos.id, tipo: 'texto', nombre: nombreLimpio, foto: datos.foto, texto: textoLimpio, replyTo: datos.replyTo };
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift();
        io.emit('chat message', mensajeFinal);
    });

    socket.on('chat sticker', (datos) => {
        const ahora = Date.now();
        if (antiSpam[datos.id] && ahora - antiSpam[datos.id] < 5000) return;
        antiSpam[datos.id] = ahora;

        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const mensajeFinal = { idUsuario: datos.id, tipo: 'sticker', nombre: nombreLimpio, foto: datos.foto, url: datos.url, replyTo: datos.replyTo };
        
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift();
        io.emit('chat sticker', mensajeFinal);
    });

    socket.on('nuevo sticker', (imagenBase64) => {
        coleccionStickers.push({ url: imagenBase64 });
        io.emit('actualizar stickers', coleccionStickers);
    });

    // 🔥 NUEVA ANTENA: FLAPPY BIRD MULTIJUGADOR
    socket.on('flappy pos', (datosFlappy) => {
        // datosFlappy trae = { id, nombre, foto, y, score, muerto }
        // Se lo enviamos a todos los demás para que dibujen al "fantasma"
        socket.broadcast.emit('flappy pos', datosFlappy);
    });

    socket.on('disconnect', () => {
        if (usuariosConectados[socket.id]) {
            delete usuariosConectados[socket.id];
            io.emit('actualizar usuarios', Object.values(usuariosConectados));
        }
    });
});

const PUERTO = process.env.PORT || 3000;
server.listen(PUERTO, () => {
    console.log('🚀 Servidor 2AHC activo en puerto ' + PUERTO);
});
