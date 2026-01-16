/* --- STATE & SOUND ENGINE --- */
let habits = JSON.parse(localStorage.getItem('verdeHabits')) || [];
let habitData = JSON.parse(localStorage.getItem('verdeHabitData')) || {}; 
let protocolData = JSON.parse(localStorage.getItem('verdeProtocol')) || Array(100).fill(false);
let protocolRules = JSON.parse(localStorage.getItem('verdeProtocolRules')) || ["Rule 1", "Rule 2", "Rule 3", "Rule 4"];
let journalData = JSON.parse(localStorage.getItem('verdeJournalData')) || [];
let protocolStartDate = localStorage.getItem('verdeProtocolStart') || null;

// PREMIUM STATUS
let isPremium = localStorage.getItem('verdePremiumStatus') === 'true';
const SECRET_UNLOCK_CODE = "VERDE19"; 

// Tech Sound Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 440, type = 'sine', dur = 0.1) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
}
const sfx = {
    click: () => playBeep(800, 'triangle', 0.05),
    success: () => { playBeep(440, 'sine', 0.1); setTimeout(() => playBeep(880, 'sine', 0.3), 100); },
    error: () => playBeep(150, 'sawtooth', 0.2),
    timer: () => { playBeep(600, 'sine', 0.1); setTimeout(() => playBeep(600, 'sine', 0.1), 200); }
};

document.addEventListener('DOMContentLoaded', () => {
    // Launch Animation Cleanup
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500); 
    }, 3000); 

    updateDateDisplay();
    renderGrid();
    updateUIForPremium();

    // Mouse Spotlight
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.spotlight-card').forEach(c => {
            const r = c.getBoundingClientRect();
            c.style.setProperty('--x', `${e.clientX - r.left}px`);
            c.style.setProperty('--y', `${e.clientY - r.top}px`);
        });
    });

    const name = localStorage.getItem('verdeUserName') || 'User';
    document.getElementById('nav-username').innerText = name;
    document.getElementById('profile-img').src = `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
    document.getElementById('settings-name').value = name;
    
    const tips = ["Insight: You perform 15% better on Tuesdays.", "Tip: Consistency beats intensity.", "Warning: Don't break the streak!"];
    const ai = document.getElementById('ai-insight');
    if(ai) ai.innerText = "Verde AI: " + tips[Math.floor(Math.random()*tips.length)];
});

/* --- FREEMIUM LOGIC --- */
function checkFeatureAccess(tabId) {
    sfx.click();
    if (isPremium) { switchTab(tabId); } 
    else { document.getElementById('premium-modal').classList.remove('hidden'); document.getElementById('premium-modal').classList.add('flex'); }
}
function verifyLicense() {
    const input = document.getElementById('license-key');
    if (input.value.trim().toUpperCase() === SECRET_UNLOCK_CODE) {
        sfx.success();
        isPremium = true; localStorage.setItem('verdePremiumStatus', 'true');
        alert("ACCESS GRANTED.\nWelcome to Sovereign Status.");
        closeModal('premium-modal'); updateUIForPremium(); location.reload();
    } else { sfx.error(); alert("ACCESS DENIED."); input.value = ""; }
}
function updateUIForPremium() {
    if (isPremium) {
        document.querySelectorAll('[id^="lock-"]').forEach(el => el.classList.add('hidden'));
        const tag = document.querySelector('#nav-username + p');
        if(tag) { tag.innerText = "SOVEREIGN"; tag.className = "text-[10px] text-amber-400 font-bold tracking-widest uppercase"; }
    }
}

/* --- NAV --- */
function switchTab(id) {
    sfx.click();
    document.querySelectorAll('.tab-content').forEach(e => e.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    if(id === 'analytics') renderAnalytics();
    if(id === 'protocol') renderProtocol();
    if(id === 'journal') renderJournal();
}
function updateDateDisplay() {
    const d = new Date();
    document.getElementById('current-date-display').innerText = d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
    if(document.getElementById('journal-date')) document.getElementById('journal-date').innerText = d.toLocaleDateString('en-US', {month:'short', day:'numeric'}).toUpperCase();
}

/* --- HABITS --- */
function renderGrid() {
    const table = document.getElementById('habit-list-body');
    const header = document.querySelector('#habit-table thead tr');
    const emptyState = document.getElementById('empty-state');
    const dashContent = document.getElementById('dashboard-content');

    if(habits.length === 0) { emptyState.classList.replace('hidden', 'flex'); dashContent.classList.add('hidden'); return; } 
    else { emptyState.classList.replace('flex', 'hidden'); dashContent.classList.remove('hidden'); }

    while(header.children.length > 1) header.removeChild(header.lastChild);
    const today = new Date().getDate();
    for(let i=1; i<=31; i++) {
        const th = document.createElement('th');
        th.className = `p-2 text-center font-normal w-8 text-[10px] ${i===today ? 'text-emerald-400 font-bold border-b-2 border-emerald-400' : 'text-gray-600'}`;
        th.innerText = i; header.appendChild(th);
    }
    table.innerHTML = '';
    habits.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-white/5 hover:bg-white/5 transition group";
        tr.innerHTML = `<td class="py-3 pl-4 font-medium text-gray-300 group-hover:text-white transition text-xs">${h}</td>`;
        for(let i=1; i<=31; i++) {
            const td = document.createElement('td'); td.className = "p-1 text-center";
            const chk = document.createElement('input'); chk.type = "checkbox"; chk.className = "custom-checkbox";
            if(habitData[h]?.[i]) chk.checked = true;
            if(i !== today) { chk.disabled = true; chk.title = "Locked"; }
            chk.onclick = () => { if(!chk.disabled) { sfx.click(); if(!habitData[h]) habitData[h] = {}; chk.checked ? habitData[h][i] = true : delete habitData[h][i]; localStorage.setItem('verdeHabitData', JSON.stringify(habitData)); updateStats(); } };
            td.appendChild(chk); tr.appendChild(td);
        }
        table.appendChild(tr);
    });
    updateStats();
}
function addNewHabit() { const val = document.getElementById('new-habit-name').value.trim(); if(val) { habits.push(val); localStorage.setItem('verdeHabits', JSON.stringify(habits)); renderGrid(); closeModal('add-habit-modal'); sfx.success(); } }
function updateStats() { const today = new Date().getDate(); let done = 0; habits.forEach(h => { if(habitData[h]?.[today]) done++; }); const pct = habits.length ? Math.round((done/habits.length)*100) : 0; document.getElementById('completion-rate').innerText = `${pct}%`; document.getElementById('completion-bar').style.width = `${pct}%`; document.getElementById('streak-display').innerText = pct > 0 ? "1" : "0"; }

/* --- ANALYTICS --- */
let mChart, yChart, tChart;
function renderAnalytics() {
    const monthPct = 68; const yearPct = 42; 
    document.getElementById('month-percent-text').innerText = monthPct + "%"; document.getElementById('year-percent-text').innerText = yearPct + "%";
    if(mChart) mChart.destroy(); if(yChart) yChart.destroy(); if(tChart) tChart.destroy();
    
    const config = (pct, color) => ({ type: 'doughnut', data: { datasets: [{ data: [pct, 100-pct], backgroundColor: [color, 'rgba(255,255,255,0.05)'], borderWidth:0 }] }, options: { cutout: '85%', events: [], responsive: true, maintainAspectRatio: false } });
    const ctxM = document.getElementById('monthCircle'); if(ctxM) mChart = new Chart(ctxM, config(monthPct, '#34d399'));
    const ctxY = document.getElementById('yearCircle'); if(ctxY) yChart = new Chart(ctxY, config(yearPct, '#7c3aed'));

    const ctxT = document.getElementById('trendChartCanvas');
    if(ctxT) tChart = new Chart(ctxT, { type: 'line', data: { labels: ['M','T','W','T','F','S','S'], datasets: [{ label: 'Score', data: [60, 75, 80, 50, 90, 85, 95], borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', fill: true, tension: 0.4 }] }, options: { plugins:{legend:false}, scales:{x:{display:false}, y:{grid:{color:'rgba(255,255,255,0.05)'}}}, responsive: true, maintainAspectRatio: false } });

    const hm = document.getElementById('heatmap-grid');
    if(hm) { hm.innerHTML = ''; for(let i=0; i<84; i++) { const d = document.createElement('div'); d.className = "heatmap-box"; const int = Math.random(); if(int > 0.7) d.style.background = "#34d399"; else if(int > 0.4) d.style.background = "rgba(52, 211, 153, 0.3)"; hm.appendChild(d); } }
}

/* --- PROTOCOL 100 --- */
function renderProtocol() {
    const grid = document.getElementById('protocol-grid'); grid.innerHTML = '';
    let streak = 0; const start = protocolStartDate ? new Date(protocolStartDate) : null;
    const todayIndex = start ? Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)) : -1;
    protocolData.forEach((done, idx) => {
        const div = document.createElement('div'); div.innerText = idx + 1;
        if(done) { div.className = "protocol-box done"; streak++; }
        else {
            if(start && idx < todayIndex) div.className = "protocol-box missed";
            else if(start && idx > todayIndex) div.className = "protocol-box locked";
            else { div.className = "protocol-box"; if(start && idx===todayIndex) div.style.borderColor = "#34d399"; }
        }
        div.onclick = () => {
            if(!protocolStartDate && idx === 0 && confirm("Start Protocol 100? Strictly?")) { localStorage.setItem('verdeProtocolStart', new Date().toISOString()); location.reload(); }
            else if(idx === todayIndex) { sfx.success(); protocolData[idx] = !protocolData[idx]; localStorage.setItem('verdeProtocol', JSON.stringify(protocolData)); renderProtocol(); }
            else { sfx.error(); alert("LOCKED: Strict Protocol Active."); }
        };
        grid.appendChild(div);
    });
    document.getElementById('protocol-count').innerText = streak;
}
function renderProtocolRules() { const list = document.getElementById('protocol-rules-list'); list.innerHTML = ''; protocolRules.forEach(r => list.innerHTML += `<li class="flex items-center gap-3"><div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span>${r}</span></li>`); }
function saveProtocolRules() { const r = [1,2,3,4].map(i => document.getElementById(`rule-${i}`).value).filter(Boolean); if(r.length) { protocolRules = r; localStorage.setItem('verdeProtocolRules', JSON.stringify(protocolRules)); renderProtocolRules(); closeModal('protocol-modal'); sfx.success(); } }

/* --- UTILS --- */
function saveJournalEntry() { const txt = document.getElementById('journal-input').value; if(txt) { journalData.unshift({date: new Date().toLocaleDateString(), text: txt}); localStorage.setItem('verdeJournalData', JSON.stringify(journalData)); document.getElementById('journal-input').value = ''; renderJournal(); sfx.success(); } }
function renderJournal() { const list = document.getElementById('journal-list'); list.innerHTML = journalData.length ? '' : '<div class="text-[10px] text-gray-500 italic text-center p-4">Empty</div>'; journalData.forEach(e => list.innerHTML += `<div class="p-3 bg-white/5 rounded-lg border border-white/5 mb-2"><div class="text-[10px] text-emerald-400 font-bold mb-1">${e.date}</div><div class="text-xs text-gray-300">${e.text}</div></div>`); }
function exportData() { const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({habits, habitData, journalData, protocolData})); const n = document.createElement('a'); n.href = str; n.download = "verde_backup.json"; document.body.appendChild(n); n.click(); n.remove(); }
function openAddHabitModal() { sfx.click(); document.getElementById('add-habit-modal').classList.replace('hidden', 'flex'); }
function openProtocolModal() { sfx.click(); document.getElementById('protocol-modal').classList.replace('hidden', 'flex'); }
function closeModal(id) { document.getElementById(id).classList.replace('flex', 'hidden'); }
function saveSettings() { const n = document.getElementById('settings-name').value; if(n) localStorage.setItem('verdeUserName', n); location.reload(); }
function resetAllData() { if(confirm("Reset everything?")) { localStorage.clear(); location.reload(); } }
function setTimer(m) { sfx.click(); document.getElementById('timer-display').innerText = m + ":00"; }
function toggleTimer() { sfx.timer(); alert("Timer logic active"); }
function updateSleep(v) { /* save */ }