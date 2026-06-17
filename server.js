import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = {
    "новости": [
        "https://jsonplaceholder.typicode.com/posts/1",
        "https://jsonplaceholder.typicode.com/posts/2"
    ],
    "js": [
        "https://jsonplaceholder.typicode.com/todos/1",
        "https://jsonplaceholder.typicode.com/comments"
    ],
    "текст": [
        "https://v2.jokeapi.dev/joke/Any?format=txt"
    ]
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/search', (req, res) => {
    const keyword = req.query.keyword?.toLowerCase().trim();
    if (!keyword) return res.status(400).json({ error: 'Введите ключевое слово' });

    const urls = db[keyword];
    if (urls) {
        res.json({ urls });
    } else {
        res.status(404).json({ error: 'Ничего не найдено по этому слову. Попробуйте "новости" или "js".' });
    }
});

io.on('connection', (socket) => {
    socket.on('download', async (url) => {
        try {
            const response = await axios({ method: 'GET', url, responseType: 'stream' });
            const totalLength = parseInt(response.headers['content-length'], 10) || 0;
            
            let downloadedLength = 0;
            let content = '';

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                content += chunk.toString();
                
                const percent = totalLength ? Math.round((downloadedLength / totalLength) * 100) : '...';
                socket.emit('progress', { downloaded: downloadedLength, size: totalLength, percent });
            });

            response.data.on('end', () => {
                socket.emit('complete', { url, content });
            });

        } catch (error) {
            socket.emit('download_error', { message: `Ошибка скачивания: ${error.message}` });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));