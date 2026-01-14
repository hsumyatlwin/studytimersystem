// timer stuff - keeps track of everything
const TimerApp = {
    time: 0,
    interval: null,
    paused: false,
    sessionStartTime: null,
    totalSessionTime: 0,
    sessionName: '',
    pendingSession: null
};

// grabbing all the timer stuff from the page
const timerDisplay = document.getElementById("timer");
const hoursInput = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");
const secondsInput = document.getElementById("secondsInput");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const recordsBtn = document.getElementById("recordsBtn");
const sessionNameInput = document.getElementById("sessionName");
const darkModeToggle = document.getElementById("darkModeToggle");

// music player stuff
const musicBtn = document.getElementById("musicBtn");
const musicPlayer = document.getElementById("musicPlayer");
const audioPlayer = document.getElementById("audioPlayer");
const nowPlaying = document.getElementById("nowPlaying");
const musicItems = document.querySelectorAll(".music-item");

// records and stats stuff
const recordsPanel = document.getElementById("recordsPanel");
const recordsList = document.getElementById("recordsList");
const statToday = document.getElementById("statToday");
const statWeek = document.getElementById("statWeek");
const statMonth = document.getElementById("statMonth");

// notes popup stuff
const notesModal = document.getElementById("notesModal");
const sessionNotes = document.getElementById("sessionNotes");
const modalSessionInfo = document.getElementById("modalSessionInfo");
const saveNotesBtn = document.getElementById("saveNotesBtn");
const skipNotesBtn = document.getElementById("skipNotesBtn");

// alarm that plays when timer is done
const alarmAudio = new Audio("audio/alarm.mp3");

// dark mode stuff - load saved preference
function loadDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
        updateThemeColor(true);
    } else {
        updateThemeColor(false);
    }
}

// change browser bar color based on theme
function updateThemeColor(isDark) {
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
        themeColor.setAttribute('content', isDark ? '#1a1a2e' : '#ffffff');
    }
}

// when you click the moon/sun button
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
    updateThemeColor(isDark);
});

// saving a study session to browser storage
function saveRecord(duration, startTime, endTime, sessionName, notes = '') {
    let records = JSON.parse(localStorage.getItem('studyRecords')) || [];
    
    records.push({
        duration: duration,
        startTime: startTime,
        endTime: endTime,
        date: new Date().toISOString(),
        name: sessionName || 'Unnamed Session',
        notes: notes
    });
    
    localStorage.setItem('studyRecords', JSON.stringify(records));
    updateStatistics();
    displayRecords();
}

// show the notes popup after session ends
function showNotesModal(duration, startTime, endTime, sessionName) {
    TimerApp.pendingSession = { duration, startTime, endTime, sessionName };
    
    const sessionInfo = `${sessionName || 'Unnamed Session'} - ${formatDuration(duration)}`;
    modalSessionInfo.textContent = sessionInfo;
    sessionNotes.value = '';
    
    notesModal.classList.remove('hidden');
    sessionNotes.focus();
}

// close the notes popup
function hideNotesModal() {
    notesModal.classList.add('hidden');
    TimerApp.pendingSession = null;
}

// when you click save on the notes popup
saveNotesBtn.addEventListener('click', () => {
    if (TimerApp.pendingSession) {
        const { duration, startTime, endTime, sessionName } = TimerApp.pendingSession;
        const notes = sessionNotes.value.trim();
        saveRecord(duration, startTime, endTime, sessionName, notes);
        hideNotesModal();
    }
});

// when you skip adding notes
skipNotesBtn.addEventListener('click', () => {
    if (TimerApp.pendingSession) {
        const { duration, startTime, endTime, sessionName } = TimerApp.pendingSession;
        saveRecord(duration, startTime, endTime, sessionName, '');
        hideNotesModal();
    }
});

// get all saved records from storage
function loadRecords() {
    return JSON.parse(localStorage.getItem('studyRecords')) || [];
}

// delete a record when you click trash icon
function deleteRecord(index) {
    let records = loadRecords();
    records.splice(index, 1);
    localStorage.setItem('studyRecords', JSON.stringify(records));
    updateStatistics();
    displayRecords();
}

// convert seconds into readable format like "2h 30m 15s"
function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
        return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
        return `${m}m ${s}s`;
    } else {
        return `${s}s`;
    }
}

// show all your study records on the page
function displayRecords() {
    const records = loadRecords();
    
    if (records.length === 0) {
        recordsList.innerHTML = '<p class="no-records">No study sessions recorded yet.</p>';
        return;
    }
    
    recordsList.innerHTML = '';
    
    // show newest records first
    records.slice().reverse().forEach((record, reverseIndex) => {
        const actualIndex = records.length - 1 - reverseIndex;
        const recordDiv = document.createElement('div');
        recordDiv.className = 'record-item';
        
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        const notesHtml = record.notes ? `<div class="record-notes">📝 ${record.notes}</div>` : '';
        
        recordDiv.innerHTML = `
            <div class="record-info">
                <div class="record-name">${record.name || 'Unnamed Session'}</div>
                <div class="record-duration">${formatDuration(record.duration)}</div>
                <div class="record-date">${dateStr} at ${timeStr}</div>
                ${notesHtml}
            </div>
            <button class="delete-btn" onclick="deleteRecord(${actualIndex})">🗑️</button>
        `;
        
        recordsList.appendChild(recordDiv);
    });
}

// calculate average study time for a time period
function calculateStats(records, daysBack) {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    const filteredRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= cutoffDate;
    });
    
    const totalSeconds = filteredRecords.reduce((sum, record) => sum + record.duration, 0);
    const avgSeconds = filteredRecords.length > 0 ? Math.floor(totalSeconds / filteredRecords.length) : 0;
    
    return { totalSeconds, avgSeconds };
}

// make time look nice for stats cards
function formatStatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    
    if (h > 0) {
        return `${h}h ${m}m`;
    } else {
        return `${m}m`;
    }
}

// update the stats cards with new data
function updateStatistics() {
    const records = loadRecords();
    
    const today = calculateStats(records, 1);
    statToday.textContent = formatStatTime(today.avgSeconds);
    
    const week = calculateStats(records, 7);
    statWeek.textContent = formatStatTime(week.avgSeconds);
    
    const month = calculateStats(records, 30);
    statMonth.textContent = formatStatTime(month.avgSeconds);
}

// show/hide records panel when button is clicked
recordsBtn.addEventListener("click", () => {
    recordsPanel.classList.toggle("hidden");
    
    if (recordsPanel.classList.contains("hidden")) {
        recordsBtn.textContent = "📊 Records";
    } else {
        recordsBtn.textContent = "📊 Hide Records";
        updateStatistics();
        displayRecords();
    }
});

// show/hide music player
musicBtn.addEventListener("click", () => {
    musicPlayer.classList.toggle("hidden");
    if (musicPlayer.classList.contains("hidden")) {
        musicBtn.textContent = "🎵 Music";
        audioPlayer.pause();
    } else {
        musicBtn.textContent = "🔇 Hide Music";
    }
});

// when you click a song, play it
musicItems.forEach(item => {
    item.addEventListener("click", () => {
        const src = item.getAttribute("data-src");
        const name = item.querySelector("span:last-child").textContent;
        audioPlayer.src = src;
        audioPlayer.play();
        musicItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        nowPlaying.textContent = "Now Playing: " + name;
    });
});

// format seconds into HH:MM:SS for display
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// update what shows on screen
function updateDisplay() {
    timerDisplay.textContent = formatTime(TimerApp.time);
}

// get time from input boxes and set it
function setTime() {
    const h = Math.min(parseInt(hoursInput.value) || 0, 23);
    const m = Math.min(parseInt(minutesInput.value) || 0, 59);
    const s = Math.min(parseInt(secondsInput.value) || 0, 59);
    TimerApp.time = h * 3600 + m * 60 + s;
    updateDisplay();
}

// this runs every second while timer is going
function countdown() {
    if (TimerApp.time > 0) {
        TimerApp.time--;
        TimerApp.totalSessionTime++;
        updateDisplay();
    } else {
        stopTimer();
        
        // when time is up, show notes popup
        if (TimerApp.totalSessionTime > 0) {
            const endTime = new Date();
            audioPlayer.pause();
            alarmAudio.play();
            
            showNotesModal(TimerApp.totalSessionTime, TimerApp.sessionStartTime, endTime, TimerApp.sessionName);
        }
        
        sessionNameInput.value = '';
        sessionNameInput.disabled = false;
    }
}

// start the timer
function startTimer() {
    if (TimerApp.time === 0) {
        setTime();
    }
    if (TimerApp.time > 0 && TimerApp.interval === null) {
        // save when session started
        if (TimerApp.totalSessionTime === 0) {
            TimerApp.sessionStartTime = new Date();
            TimerApp.sessionName = sessionNameInput.value.trim();
            sessionNameInput.disabled = true;
        }
        
        TimerApp.interval = setInterval(countdown, 1000);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        hoursInput.disabled = true;
        minutesInput.disabled = true;
        secondsInput.disabled = true;
        startBtn.textContent = "Running...";
        
        // play music if it's open
        if (!musicPlayer.classList.contains("hidden") && audioPlayer.src) {
            audioPlayer.play().catch(err => console.log("Audio play failed:", err));
        }
    }
}

// pause the timer
function pauseTimer() {
    if (TimerApp.interval !== null) {
        clearInterval(TimerApp.interval);
        TimerApp.interval = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        startBtn.textContent = "Resume";
        audioPlayer.pause();
    }
}

// stop the timer completely
function stopTimer() {
    if (TimerApp.interval !== null) {
        clearInterval(TimerApp.interval);
        TimerApp.interval = null;
    }
}

// reset everything
function resetTimer() {
    stopTimer();
    
    TimerApp.totalSessionTime = 0;
    TimerApp.sessionStartTime = null;
    TimerApp.sessionName = '';
    
    setTime();
    startBtn.textContent = "Start";
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    hoursInput.disabled = false;
    minutesInput.disabled = false;
    secondsInput.disabled = false;
    sessionNameInput.disabled = false;
    sessionNameInput.value = '';
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
}

// connect buttons to functions
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

// update display when you type in the inputs
[hoursInput, minutesInput, secondsInput].forEach(input => {
    input.addEventListener("input", setTime);
});

// initial setup when page loads
setTime();
pauseBtn.disabled = true;
loadDarkMode();
updateStatistics();
displayRecords();