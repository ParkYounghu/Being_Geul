// --- Global State ---
window.allPolicies = window.allPolicies || [];
let currentCardStack = [];
let lastSwiped = [];

// [변경] 기존 30장 -> 20장으로 변경
const TARGET_LIKES = 20; 
let likeCount = 0;
let likedDataForAI = { titles: [], genres: [] };
let deletedHistory = [];
let availablePolicies = [];

const folderMapping = {
    '금융/자산': '금융', '취업/창업': '취업', '주거/생활': '주거',
    '교육/역량': '교육', '복지/건강': '복지', '참여/권리': '참여', '기타': '복지'
};

const genreColors = { 
    '금융/자산': '#2E7D32', '취업/창업': '#F9A825', '주거/생활': '#1565C0',
    '교육/역량': '#009688', '복지/건강': '#EC407A', '참여/권리': '#AB47BC'
};

// [이미지 에러 방어]
window.handleImgError = function(img) {
    const src = img.src;
    if (src.includes('banner.png')) { img.style.display = 'none'; return; }
    if (src.endsWith('.png')) { img.src = src.replace('.png', '.jpeg'); } 
    else if (src.endsWith('.jpeg')) { img.src = src.replace('.jpeg', '.jpg'); }
    else { img.src = '/images/banner.png'; img.style.objectFit = 'contain'; }
};

document.addEventListener('DOMContentLoaded', () => {
    reconstructLikedData();

    // 데이터가 있으면 바로 화면 갱신
    if (likeCount > 0 && document.getElementById('card-container')) {
        updateRealTimeAnalysis(true); 
    }

    if (document.getElementById('card-container')) {
        initMainPage();
        updateLandingUI(); // [복구] 랜딩 페이지 버튼 UI 초기화
    }
    else if (document.getElementById('mypage-container')) initMyPage();
});

function reconstructLikedData() {
    const likedIds = getLikedItems();
    likeCount = likedIds.length;
    likedDataForAI = { titles: [], genres: [] };
    likedIds.forEach(id => {
        const p = window.allPolicies.find(x => String(x.id) === String(id));
        if (p) { likedDataForAI.titles.push(p.title); likedDataForAI.genres.push(p.genre); }
    });
}

// [복구] 랜딩 페이지 버튼 로직 (로그인 여부에 따라 변경)
function updateLandingUI() {
    const container = document.getElementById('landing-btn-group');
    if (!container) return;
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    container.innerHTML = '';

    if (isLoggedIn) {
        // 로그인 상태: 바로 시작하기, 마이페이지 버튼
        container.innerHTML = `
            <button class="landing-btn primary" onclick="document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' })">매칭 시작하기</button>
            <button class="landing-btn secondary" onclick="location.href='mypage.html'">마이페이지</button>
        `;
    } else {
        // 비로그인 상태: 로그인, 회원가입, 둘러보기 버튼
        container.innerHTML = `
            <button class="landing-btn primary" id="login-btn-landing">로그인</button>
            <button class="landing-btn secondary" id="signup-btn-landing">회원가입</button>
            <button id="browse-btn-landing">둘러보기</button>
        `;
        // 이벤트 리스너 다시 연결
        document.getElementById('login-btn-landing').addEventListener('click', () => openModal('login-modal'));
        document.getElementById('signup-btn-landing').addEventListener('click', () => openModal('signup-modal'));
        document.getElementById('browse-btn-landing').addEventListener('click', () => document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' }));
    }
}

// --- Main Page Logic ---
function initMainPage() {
    setupMainEventListeners();
    setupKeyboardNavigation();
    updateMainUI();
    
    // [Round-Robin] 장르별 균형 배치
    if (window.allPolicies && window.allPolicies.length > 0) {
        const likedIds = getLikedItems();
        const candidates = window.allPolicies.filter(p => !likedIds.includes(String(p.id)));
        
        const genreGroups = { '금융/자산': [], '취업/창업': [], '주거/생활': [], '교육/역량': [], '복지/건강': [], '참여/권리': [] };
        const targetGenres = Object.keys(genreGroups);
        candidates.forEach(p => { if (genreGroups[p.genre]) genreGroups[p.genre].push(p); });
        targetGenres.forEach(g => genreGroups[g].sort(() => 0.5 - Math.random()));

        let finalDeck = [];
        let hasMoreCards = true;
        while (hasMoreCards) {
            let roundBatch = [];
            targetGenres.forEach(genre => {
                const group = genreGroups[genre];
                if (group.length > 0) roundBatch.push(...group.splice(0, 3));
            });
            if (roundBatch.length === 0) hasMoreCards = false;
            else { 
                roundBatch.sort(() => 0.5 - Math.random()); 
                finalDeck.push(...roundBatch); 
            }
        }
        availablePolicies = finalDeck;
    } else { availablePolicies = []; }
    
    loadMoreCards();
    const canvas = document.getElementById('main-hexagon-chart');
    if (canvas) { canvas.width = 840; canvas.height = 840; renderHexagonChart('main-hexagon-chart'); }
}

function setupMainEventListeners() {
    // 랜딩 버튼 이벤트는 updateLandingUI에서 처리
    document.getElementById('undo-btn')?.addEventListener('click', undoLastSwipe);
    document.getElementById('load-more-btn')?.addEventListener('click', loadMoreCards);
    document.getElementById('main-search-input')?.addEventListener('input', handleSearch);
    document.getElementById('login-submit-btn')?.addEventListener('click', handleLogin);
    document.getElementById('signup-submit-btn')?.addEventListener('click', handleSignup);
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (document.querySelector('.modal-overlay:not(.hidden)')) return;
        if (e.key === 'ArrowRight') swipeTopCard('right'); else if (e.key === 'ArrowLeft') swipeTopCard('left');
    });
}

function updateMainUI() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const headerContainer = document.querySelector('.top-right-buttons');
    if (headerContainer) {
        headerContainer.innerHTML = '';
        if (isLoggedIn) {
            const myPageBtn = document.createElement('button'); myPageBtn.innerText = "마이페이지"; myPageBtn.onclick = () => location.href = 'mypage.html';
            const logoutBtn = document.createElement('button'); logoutBtn.innerText = "로그아웃"; logoutBtn.onclick = () => { localStorage.clear(); alert('로그아웃 되었습니다.'); location.reload(); };
            headerContainer.appendChild(myPageBtn); headerContainer.appendChild(logoutBtn);
        } else {
            const loginBtn = document.createElement('button'); loginBtn.innerText = "로그인"; loginBtn.onclick = () => openModal('login-modal');
            headerContainer.appendChild(loginBtn);
        }
    }
}

async function handleSignup() { 
    const id = document.getElementById('signup-id').value;
    const pw = document.getElementById('signup-pw').value;
    if(!id || !pw) return alert("아이디와 비밀번호를 입력해주세요.");
    try {
        const res = await fetch('/api/signup', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: id, password: pw}) });
        if(res.ok) {
            const loginRes = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: id, password: pw}) });
            if (loginRes.ok) {
                const data = await loginRes.json(); localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('username', data.username);
                closeModal('signup-modal'); updateMainUI(); updateLandingUI(); alert(`가입 완료! ${data.username}님 환영합니다.`); document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' });
            } else { alert("가입되었습니다. 로그인해주세요."); closeModal('signup-modal'); openModal('login-modal'); }
        } else { const data = await res.json(); alert(data.detail || "가입 실패"); }
    } catch(e) { console.error(e); alert("서버 오류"); }
}

async function handleLogin() { 
    const id = document.getElementById('login-id').value;
    const pw = document.getElementById('login-pw').value;
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: id, password: pw}) });
        if(res.ok) {
            const data = await res.json(); localStorage.setItem('isLoggedIn', 'true'); localStorage.setItem('username', data.username);
            closeModal('login-modal'); updateMainUI(); updateLandingUI(); alert(`환영합니다, ${data.username}님!`); document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' });
        } else { alert("아이디 또는 비밀번호를 확인해주세요."); }
    } catch(e) { console.error(e); alert("서버 오류"); }
}
function switchToSignup() { closeModal('login-modal'); openModal('signup-modal'); }

function loadMoreCards() {
    if (availablePolicies.length === 0) {
        if (window.allPolicies.length > 0 && currentCardStack.length === 0) alert("모든 정책 카드를 확인하셨습니다!");
        document.getElementById('load-more-btn').style.display = 'none'; return;
    }
    const newCards = availablePolicies.splice(0, 18);
    currentCardStack = [...currentCardStack, ...newCards];
    renderCardStack();
}

function renderCardStack() {
    const container = document.getElementById('card-container'); if(!container) return; container.innerHTML = '';
    [...currentCardStack].reverse().forEach(p => container.appendChild(createCardElement(p)));
    if (currentCardStack.length === 0 && availablePolicies.length > 0) document.getElementById('load-more-btn').style.display = 'block';
}

function createCardElement(policy) {
    const card = document.createElement('div'); card.className = 'card'; card.dataset.id = policy.id;
    const rawGenre = policy.genre || '금융/자산'; const fileName = rawGenre.replace('/', '_') + '.png'; const imgPath = `/images/${fileName}`;
    card.innerHTML = `<div class="card-period">${policy.period}</div><div class="card-content"><div class="card-summary">${policy.title || '내용 없음'}</div><div class="card-title">${policy.summary || policy.genre}</div><div class="card-illustration"><img src="${imgPath}" alt="${rawGenre}" onerror="handleImgError(this)"></div></div>`;
    initCardEvents(card); return card;
}

function completeSwipe(card, dir) {
    card.style.transition = '0.5s'; card.style.transform = `translateX(${dir*window.innerWidth}px) rotate(${dir*30}deg)`;
    const p = window.allPolicies.find(x => String(x.id) === card.dataset.id);
    lastSwiped.push(p);
    
    if(dir === -1) { // LIKE
        saveLikedItem(p.id); 
        likeCount++; 
        likedDataForAI.titles.push(p.title); 
        likedDataForAI.genres.push(p.genre);
        
        updateRealTimeAnalysis(true);
    }
    document.getElementById('undo-btn').style.display = 'flex';
    setTimeout(() => { 
        currentCardStack.shift(); renderCardStack(); 
        document.getElementById('like-indicator').style.opacity=0; document.getElementById('pass-indicator').style.opacity=0; 
    }, 300);
}

function getAnalysisImagePath() {
    if (likedDataForAI.genres.length === 0) return null;
    const genreCounts = {}; likedDataForAI.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    const sortedGenres = Object.keys(genreCounts).sort((a,b) => genreCounts[b] - genreCounts[a]);
    if (sortedGenres.length === 0) return null;
    const rawFirst = sortedGenres[0]; const firstKey = rawFirst.split('/')[0]; 
    const rawSecond = sortedGenres[1] || rawFirst; const secondKey = rawSecond.split('/')[0];
    return `/images/1${firstKey}/${firstKey}_${secondKey}.png`;
}

// [수정] 닉네임 표시 및 팝업 복구
async function updateRealTimeAnalysis(fetchNickname = false) {
    renderHexagonChart('main-hexagon-chart');
    
    const imagePath = getAnalysisImagePath();
    const display = document.getElementById('ai-nickname-display');

    if (imagePath && display) {
        let nickHTML = '<div id="nickname-placeholder"><div class="loading-nick" style="font-size:0.8rem; color:#888;">...</div></div>';
        const existingNick = document.getElementById('nickname-placeholder');
        if(existingNick && existingNick.innerText.trim() !== "...") nickHTML = existingNick.outerHTML;

        display.innerHTML = `
            <img src="${imagePath}" style="width: 100%; max-width: 300px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" onerror="handleImgError(this)">
            ${nickHTML}
        `;
    }

    if (fetchNickname && likedDataForAI.genres.length > 0) {
        try {
            const res = await fetch('/api/generate-nickname', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ liked_titles: likedDataForAI.titles, liked_genres: likedDataForAI.genres })
            });
            const data = await res.json();
            if (data.nickname) {
                showNickname(data.nickname); 
                
                localStorage.setItem('myTypeNickname', data.nickname);
                if(imagePath) localStorage.setItem('myTypeImage', imagePath);

                // [복구] 목표치 달성 시 분석 완료 팝업 띄우기
                if(likeCount === TARGET_LIKES) {
                    localStorage.setItem('analysisDone', 'true');
                    openModal('analysis-complete-modal');
                }
            }
        } catch(e) { console.error(e); }
    }
}

function showResultImage(src) {
    // updateRealTimeAnalysis에서 처리됨
}

function showNickname(nick) { 
    const el = document.getElementById('nickname-placeholder'); 
    if(el) el.innerHTML = `<div style="margin-top:20px; font-weight:bold; font-size:1.5rem;">"${nick}"</div>`; 
}

// --- Helpers ---
function undoLastSwipe(){ if(lastSwiped.length){ const p = lastSwiped.pop(); currentCardStack.unshift(p); renderCardStack(); let liked = getLikedItems(); if(liked.includes(String(p.id))) { liked = liked.filter(id => id !== String(p.id)); localStorage.setItem('likedPolicies', JSON.stringify(liked)); likeCount--; const idx = likedDataForAI.titles.indexOf(p.title); if(idx > -1) { likedDataForAI.titles.splice(idx, 1); likedDataForAI.genres.splice(idx, 1); } updateRealTimeAnalysis(true); } } if(lastSwiped.length === 0) document.getElementById('undo-btn').style.display = 'none'; }
function openDetailModal(id){ const p = window.allPolicies.find(x => String(x.id) === String(id)); if (!p) return; document.getElementById('modal-title').innerText = p.title; document.getElementById('modal-period').innerText = p.period; document.getElementById('modal-summary').innerText = p.summary; const linkBtn = document.getElementById('modal-link-btn'); if (linkBtn) linkBtn.href = p.link; openModal('detail-modal'); }
function renderHexagonChart(canvasId) { const canvas = document.getElementById(canvasId); if (!canvas) return; const ctx = canvas.getContext('2d'); const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h); const scale = w / 300; const genres = ["금융/자산", "주거/생활", "취업/창업", "교육/역량", "복지/건강", "참여/권리"]; const likedIds = getLikedItems(); const counts = {}; genres.forEach(g=>counts[g]=0); likedIds.forEach(id=>{ const p=window.allPolicies.find(x=>String(x.id)===String(id)); if(p) counts[p.genre||'기타']=(counts[p.genre||'기타']||0)+1; }); const maxVal = Math.max(...Object.values(counts), 1); const padding = 60 * scale; const size = Math.min(w, h)/2 - padding; const cx = w/2, cy = h/2; const step = (Math.PI*2)/genres.length; ctx.strokeStyle = '#555'; ctx.lineWidth = 1 * scale; for(let r=1; r<=3; r++) { ctx.beginPath(); for(let i=0; i<genres.length; i++) { const rad = step*i - Math.PI/2; const x=cx+Math.cos(rad)*(size/3)*r, y=cy+Math.sin(rad)*(size/3)*r; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.closePath(); ctx.stroke(); } ctx.beginPath(); genres.forEach((g,i)=>{ const rad = step*i - Math.PI/2; const val = (counts[g]/maxVal)*size; const x=cx+Math.cos(rad)*val, y=cy+Math.sin(rad)*val; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.closePath(); ctx.fillStyle='rgba(76,175,80,0.6)'; ctx.fill(); ctx.strokeStyle='#4CAF50'; ctx.lineWidth = 3 * scale; ctx.stroke(); ctx.fillStyle='#333'; ctx.font = `bold ${14 * scale}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; genres.forEach((g,i)=>{ const rad = step*i - Math.PI/2; const textOffset = 35 * scale; const x=cx+Math.cos(rad)*(size + textOffset), y=cy+Math.sin(rad)*(size + textOffset); ctx.fillText(g, x, y); }); }
function handleSearch(e){ const t=e.target.value.toLowerCase(); currentCardStack=window.allPolicies.filter(p=>p.title.toLowerCase().includes(t)).slice(0,10); renderCardStack(); }
function openModal(id){ document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id){ document.getElementById(id)?.classList.add('hidden'); }
function getLikedItems(){ return JSON.parse(localStorage.getItem('likedPolicies')||'[]'); }
function saveLikedItem(id){ const l=getLikedItems(); if(!l.includes(String(id))){ l.push(String(id)); localStorage.setItem('likedPolicies',JSON.stringify(l)); } }
function getUniqueGenres() { if (!window.allPolicies || window.allPolicies.length === 0) return ['금융/자산', '주거/생활', '취업/창업', '교육/역량', '복지/건강', '참여/권리']; return [...new Set(window.allPolicies.map(p => p.genre || '기타'))].sort(); }
function getGenreColor(genre) { if (genreColors[genre]) return genreColors[genre]; const shortName = folderMapping[genre]; return genreColors[shortName] || '#555'; }
function initCardEvents(card) { let startX = 0, startY = 0, isDragging = false; const onStart = (e) => { isDragging = true; startX = e.clientX||e.touches[0].clientX; startY = e.clientY||e.touches[0].clientY; card.style.transition = 'none'; }; const onMove = (e) => { if (!isDragging) return; const x = (e.clientX||e.touches[0].clientX) - startX; card.style.transform = `translateX(${x}px) rotate(${x/20}deg)`; const op = Math.min(Math.abs(x)/100, 1); if(x<0) { if(document.getElementById('like-indicator')) document.getElementById('like-indicator').style.opacity=op; if(document.getElementById('pass-indicator')) document.getElementById('pass-indicator').style.opacity=0; } else { if(document.getElementById('pass-indicator')) document.getElementById('pass-indicator').style.opacity=op; if(document.getElementById('like-indicator')) document.getElementById('like-indicator').style.opacity=0; } }; const onEnd = (e) => { if (!isDragging) return; isDragging = false; const x = (e.clientX||e.changedTouches[0].clientX) - startX; const y = (e.clientY||e.changedTouches[0].clientY) - startY; if(Math.sqrt(x*x+y*y)<10) { openDetailModal(card.dataset.id); card.style.transform=''; return; } if(Math.abs(x)>100) completeSwipe(card, x>0?1:-1); else { card.style.transition='0.3s'; card.style.transform=''; document.getElementById('like-indicator').style.opacity=0; document.getElementById('pass-indicator').style.opacity=0; } }; card.addEventListener('mousedown',onStart); document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onEnd); card.addEventListener('touchstart',onStart); document.addEventListener('touchmove',onMove); document.addEventListener('touchend',onEnd); }
function swipeTopCard(dir) { const c=document.querySelectorAll('.card'); if(c.length) completeSwipe(c[c.length-1], dir==='right'?1:-1); }
function initMyPage() { renderGenreFilters(); renderPlacardList(); const savedImg = localStorage.getItem('myTypeImage'); const imgContainer = document.getElementById('mypage-type-image-container'); if (savedImg && imgContainer) { imgContainer.innerHTML = `<img src="${savedImg}" style="max-width:300px; width:100%; border-radius:15px;" onerror="handleImgError(this)">`; } setTimeout(() => { const c = document.getElementById('hexagon-chart'); if (c) { c.width = 450; c.height = 450; renderHexagonChart('hexagon-chart'); }}, 300); }
function deleteLikedItem(id, el) { const card = el.closest('.placard-card'); card.style.opacity = '0'; setTimeout(() => card.remove(), 300); let list = getLikedItems(); if (list.includes(String(id))) deletedHistory.push(String(id)); list = list.filter(x => x !== String(id)); localStorage.setItem('likedPolicies', JSON.stringify(list)); likeCount = list.length; updateRealTimeAnalysis(true); renderHexagonChart('hexagon-chart'); updateRestoreButton(); }
function toggleAll(source) { const checkboxes = document.querySelectorAll('.card-checkbox:not(#select-all)'); checkboxes.forEach(cb => cb.checked = source.checked); }
function deleteSelectedItems() { const checkboxes = document.querySelectorAll('.card-checkbox:not(#select-all):checked'); if (!checkboxes.length) { alert("삭제할 항목을 선택해주세요."); return; } if (!confirm(`${checkboxes.length}개 항목을 삭제하시겠습니까?`)) return; let list = getLikedItems(); checkboxes.forEach(cb => { const id = cb.dataset.id; if (list.includes(String(id))) { deletedHistory.push(String(id)); } list = list.filter(x => x !== String(id)); const card = cb.closest('.placard-card'); if (card) card.remove(); }); localStorage.setItem('likedPolicies', JSON.stringify(list)); likeCount = list.length; updateRealTimeAnalysis(true); renderHexagonChart('hexagon-chart'); updateRestoreButton(); document.getElementById('select-all').checked = false; }
function restoreLastItem() { if (!deletedHistory.length) return; const lastId = deletedHistory.pop(); saveLikedItem(lastId); renderPlacardList(); renderHexagonChart('hexagon-chart'); updateRestoreButton(); }
function updateRestoreButton() { const btn = document.getElementById('restore-btn'); if (!btn) { const mainUndo = document.getElementById('undo-btn'); if(mainUndo) mainUndo.style.display = deletedHistory.length > 0 ? 'flex' : 'none'; return; } if (deletedHistory.length > 0) { btn.style.display = 'block'; btn.innerText = `↺ 삭제 취소 (${deletedHistory.length})`; } else { btn.style.display = 'none'; } }
function renderGenreFilters(){ const c=document.querySelector('.genre-filters'); if(!c)return; c.innerHTML=''; const b=document.createElement('button'); b.innerText="전체"; b.style.backgroundColor = "#555"; b.onclick=()=>renderPlacardList(null); c.appendChild(b); getUniqueGenres().forEach(g=>{ const btn=document.createElement('button'); btn.innerText=g; btn.style.backgroundColor = getGenreColor(g); btn.onclick=()=>renderPlacardList(g); c.appendChild(btn); }); }
function renderPlacardList(f){ const c=document.getElementById('mypage-results'); if(!c)return; c.innerHTML=''; const ids=getLikedItems(); let l=window.allPolicies.filter(p=>ids.includes(String(p.id))); if(f)l=l.filter(p=>p.genre===f); if(!l.length){c.innerHTML="<p style='text-align:center; color:#666;'>저장된 정책이 없습니다.</p>";return;} l.forEach(p=>{ const d=document.createElement('div'); d.className='placard-card'; d.innerHTML=`<input type="checkbox" class="card-checkbox" data-id="${p.id}" onclick="event.stopPropagation()"> <div class="info-area" onclick="openDetailModal('${p.id}')"> <h3 style="margin: 0 0 5px 0;">${p.title}</h3> <p style="margin: 0 0 5px 0; font-size: 0.9rem; color: #555;">${p.summary}</p> <p style="margin: 0; font-size:0.8rem; color:#888;">${p.genre}</p> </div> <button class="delete-btn" onclick="deleteLikedItem('${p.id}',this); event.stopPropagation();">삭제</button>`; c.appendChild(d); }); }