const socket = io();

const UI = {
    input: document.getElementById('keyword'),
    searchBtn: document.getElementById('searchBtn'),
    errorBox: document.getElementById('error'),
    urlList: document.getElementById('urlList'),
    savedList: document.getElementById('savedList'),
    progressBox: document.getElementById('progressBox'),
    progressBar: document.getElementById('progressBar'),
    percentText: document.getElementById('percentText'),
    sizeText: document.getElementById('sizeText'),
    viewer: document.getElementById('viewer')
};

function showError(message) {
    UI.errorBox.textContent = message;
    UI.errorBox.classList.remove('hidden');
    setTimeout(() => UI.errorBox.classList.add('hidden'), 4000);
}

UI.searchBtn.addEventListener('click', async () => {
    const keyword = UI.input.value;
    UI.urlList.innerHTML = '<p>Ищем...</p>';
    
    try {
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        UI.urlList.innerHTML = '';
        data.urls.forEach(url => {
            const li = document.createElement('li');
            li.textContent = url;
            li.onclick = () => startDownload(url);
            UI.urlList.appendChild(li);
        });
    } catch (err) {
        UI.urlList.innerHTML = '';
        showError(err.message);
    }
});

function startDownload(url) {
    UI.progressBox.classList.remove('hidden');
    UI.progressBar.value = 0;
    UI.percentText.textContent = '0%';
    UI.sizeText.textContent = '0 байт';
    
    socket.emit('download', url);
}

socket.on('progress', (data) => {
    UI.progressBar.value = data.percent === '...' ? 100 : data.percent;
    UI.percentText.textContent = `${data.percent}%`;
    UI.sizeText.textContent = `${data.downloaded} / ${data.size || '?'} байт`;
});

socket.on('complete', (data) => {
    UI.percentText.textContent = 'Готово!';
    UI.progressBar.value = 100;
    
    try {
        localStorage.setItem(`saved_${data.url}`, data.content);
        renderSavedData();
        viewContent(data.url, data.content);
    } catch (e) {
        showError('Ошибка: не хватает памяти в браузере (LocalStorage).');
    }
    
    setTimeout(() => UI.progressBox.classList.add('hidden'), 2000);
});

socket.on('download_error', (data) => {
    UI.progressBox.classList.add('hidden');
    showError(data.message);
});

function renderSavedData() {
    UI.savedList.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('saved_')) {
            const url = key.replace('saved_', '');
            
            const li = document.createElement('li');
            li.textContent = url;
            
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Удалить';
            delBtn.className = 'delete-btn';
            
            // Удаление
            delBtn.onclick = (e) => {
                e.stopPropagation(); // Чтобы клик не открывал файл
                localStorage.removeItem(key);
                renderSavedData();
                UI.viewer.value = '';
            };
            
            // Просмотр
            li.onclick = () => viewContent(url, localStorage.getItem(key));
            
            li.appendChild(delBtn);
            UI.savedList.appendChild(li);
        }
    }
}

function viewContent(url, content) {
    UI.viewer.value = `/* Источник: ${url} */\n\n${content}`;
}

document.addEventListener('DOMContentLoaded', renderSavedData);