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

io.on('connection', (socket) => {
    socket.emit('actualizar stickers', coleccionStickers);
    socket.emit('historial', historialMensajes);

    // Cuando alguien entra por primera vez o recarga
    socket.on('entrar al lobby', (perfil) => {
        usuariosConectados[socket.id] = perfil;
        io.emit('actualizar usuarios', Object.values(usuariosConectados));
    });

    // 🔥 NUEVO: Cuando alguien se cambia el nombre o la foto estando adentro
    socket.on('actualizar perfil', (perfilActualizado) => {
        usuariosConectados[socket.id] = perfilActualizado;
        
        // Actualizamos TODOS sus mensajes antiguos con su nueva cara/nombre
        historialMensajes.forEach(msg => {
            if (msg.idUsuario === perfilActualizado.id) {
                msg.nombre = perfilActualizado.nombre;
                msg.foto = perfilActualizado.foto;
            }
        });
        
        // Disparamos la actualización a las pantallas de todos
        io.emit('historial', historialMensajes);
        io.emit('actualizar usuarios', Object.values(usuariosConectados));
    });

    socket.on('chat message', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textoLimpio = datos.texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Guardamos el ID del usuario que lo envió
        const mensajeFinal = { 
            idUsuario: datos.id, 
            tipo: 'texto', 
            nombre: nombreLimpio, 
            foto: datos.foto, 
            texto: textoLimpio 
        };
        
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift();
        
        io.emit('chat message', mensajeFinal);
    });

    socket.on('chat sticker', (datos) => {
        const nombreLimpio = datos.nombre.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const mensajeFinal = { 
            idUsuario: datos.id, 
            tipo: 'sticker', 
            nombre: nombreLimpio, 
            foto: datos.foto, 
            url: datos.url 
        };
        
        historialMensajes.push(mensajeFinal);
        if (historialMensajes.length > 100) historialMensajes.shift();

        io.emit('chat sticker', mensajeFinal);
    });

    socket.on('nuevo sticker', (imagenBase64) => {
        coleccionStickers.push({ url: imagenBase64 });
        io.emit('actualizar stickers', coleccionStickers);
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
