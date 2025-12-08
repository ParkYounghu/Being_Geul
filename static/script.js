// --- Global State ---
window.allPolicies = window.allPolicies || [];
let currentCardStack = [];
let lastSwiped = [];

const TARGET_LIKES = 30; 
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

// [이미지 에러 3단 방어] PNG -> JPEG -> 배너 -> 숨김
window.handleImgError = function(img) {
    const src = img.src;
    if (src.includes('banner.png')) {
        img.style.display = 'none'; // 배너도 없으면 숨김
        return;
    }
    if (src.includes('.png')) {
        img.src = src.replace('.png', '.jpeg');
    } else {
        img.src = '/images/banner.png'; // 둘 다 없으면 기본 배너
        img.style.objectFit = 'contain';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 데이터 및 상태 복구 (가장 중요)
    reconstructLikedData();

    // 2. 현재 상태 확인
    const analysisDone = localStorage.getItem('analysisDone') === 'true';

    // 3. 잠금 메시지 UI 업데이트
    const lockMsg = document.getElementById('lock-message');
    if(lockMsg) {
        if(analysisDone) {
            lockMsg.innerText = "분석이 완료되었습니다!";
        } else {
            const remaining = Math.max(0, TARGET_LIKES - likeCount);
            lockMsg.innerHTML = `아직 잠겨있습니다.<br>(카드 ${remaining}개를 더 LIKE 해주세요)`;
        }
    }

    if (document.getElementById('card-container')) initMainPage();
    else if (document.getElementById('mypage-container')) initMyPage();
});

// [핵심 수정] 데이터 복구 및 상태 동기화 함수
function reconstructLikedData() {
    const likedIds = getLikedItems();
    likeCount = likedIds.length;
    
    // 데이터 재구성
    likedDataForAI = { titles: [], genres: [] };
    likedIds.forEach(id => {
        const p = window.allPolicies.find(x => String(x.id) === String(id));
        if (p) { likedDataForAI.titles.push(p.title); likedDataForAI.genres.push(p.genre); }
    });

    // [중요] 갯수가 목표치 미만으로 떨어졌다면 '분석 완료' 상태를 강제 리셋
    // 이걸 해줘야 마이페이지에서 삭제하고 돌아왔을 때 다시 분석이 시작됨
    if (likeCount < TARGET_LIKES) {
        localStorage.setItem('analysisDone', 'false');
    }
}

// --- Main Page Logic ---
function initMainPage() {
    setupMainEventListeners();
    setupKeyboardNavigation();
    updateMainUI();
    
    const analysisDone = localStorage.getItem('analysisDone') === 'true';
    const savedImg = localStorage.getItem('myTypeImage');
    const savedNick = localStorage.getItem('myTypeNickname');

    // [이미지 표시 로직]
    if (analysisDone && savedImg) {
        // 1. 분석 완료된 상태면 저장된 결과 고정
        showResultImage(savedImg); 
        if (savedNick) showNickname(savedNick);
    } else if (likeCount > 0) {
        // 2. 분석 중이라도 데이터가 있으면 실시간 이미지 보여주기
        // (리셋 후 다시 카드를 넘길 때 여기가 작동함)
        const currentImg = getAnalysisImagePath();
        if(currentImg) showResultImage(currentImg);
    }

    // [수정] 카드 덱 구성: 6개 장르별로 최대 3장씩, 총 18장 구성
    if (window.allPolicies && window.allPolicies.length > 0) {
        const likedIds = getLikedItems();
        
        // 1. 아직 보지 않은 카드 필터링
        const candidates = window.allPolicies.filter(p => !likedIds.includes(String(p.id)));

        // 2. 장르별 그룹핑
        const genreGroups = {
            '금융/자산': [], '취업/창업': [], '주거/생활': [],
            '교육/역량': [], '복지/건강': [], '참여/권리': []
        };
        const targetGenres = Object.keys(genreGroups);

        candidates.forEach(p => {
            if (genreGroups[p.genre]) {
                genreGroups[p.genre].push(p);
            }
        });

        // 3. 각 장르별로 랜덤하게 3장씩 추출
        let selectedCards = [];
        targetGenres.forEach(genre => {
            const group = genreGroups[genre];
            if (group && group.length > 0) {
                // 해당 장르 내에서 섞기
                const shuffledGroup = group.sort(() => 0.5 - Math.random());
                // 최대 3장 추출
                selectedCards.push(...shuffledGroup.slice(0, 3));
            }
        });

        // 4. 최종 덱 섞기
        availablePolicies = selectedCards.sort(() => 0.5 - Math.random());
    }
    
    loadMoreCards();
    
    const canvas = document.getElementById('main-hexagon-chart');
    if (canvas) { canvas.width = 840; canvas.height = 840; renderHexagonChart('main-hexagon-chart'); }
}

function setupMainEventListeners() {
    const loginBtn = document.getElementById('login-btn-landing');
    if(loginBtn) loginBtn.addEventListener('click', () => openModal('login-modal'));
    
    const signupBtn = document.getElementById('signup-btn-landing');
    if(signupBtn) signupBtn.addEventListener('click', () => openModal('signup-modal'));

    const browseBtn = document.getElementById('browse-btn-landing');
    if(browseBtn) browseBtn.addEventListener('click', () => document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' }));
    
    document.getElementById('undo-btn')?.addEventListener('click', undoLastSwipe);
    document.getElementById('load-more-btn')?.addEventListener('click', loadMoreCards);
    document.getElementById('main-search-input')?.addEventListener('input', handleSearch);
    
    document.getElementById('login-submit-btn')?.addEventListener('click', handleLogin);
    document.getElementById('signup-submit-btn')?.addEventListener('click', handleSignup);
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (document.querySelector('.modal-overlay:not(.hidden)')) return;
        if (e.key === 'ArrowRight') swipeTopCard('right');
        else if (e.key === 'ArrowLeft') swipeTopCard('left');
    });
}

function updateMainUI() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const username = localStorage.getItem('username');

    const headerContainer = document.querySelector('.top-right-buttons');
    if (headerContainer) {
        headerContainer.innerHTML = '';
        if (isLoggedIn) {
            const myPageBtn = document.createElement('button');
            myPageBtn.innerText = "마이페이지";
            myPageBtn.onclick = () => location.href = 'mypage.html';
            const logoutBtn = document.createElement('button');
            logoutBtn.innerText = "로그아웃";
            logoutBtn.onclick = () => { localStorage.clear(); alert('로그아웃 되었습니다.'); location.reload(); };
            headerContainer.appendChild(myPageBtn); headerContainer.appendChild(logoutBtn);
        } else {
            const loginBtn = document.createElement('button');
            loginBtn.innerText = "로그인";
            loginBtn.onclick = () => openModal('login-modal');
            headerContainer.appendChild(loginBtn);
        }
    }

    const landingGroup = document.getElementById('landing-btn-group');
    const landingSlogan = document.getElementById('landing-slogan');
    if (landingGroup) {
        landingGroup.innerHTML = '';
        if (isLoggedIn) {
            const btn = document.createElement('button');
            btn.className = 'landing-btn primary';
            btn.innerText = `${username}님, 이어하기`;
            btn.style.width = '100%'; 
            btn.onclick = () => document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' });
            landingGroup.appendChild(btn);
            if(landingSlogan) landingSlogan.innerText = "환영합니다! 오늘의 정책을 확인해보세요.";
        } else {
            landingGroup.innerHTML = `<button class="landing-btn primary" onclick="openModal('login-modal')">로그인</button><button class="landing-btn secondary" onclick="openModal('signup-modal')">회원가입</button><button class="outline-btn" onclick="document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' })">둘러보기 ↓</button>`;
            if(landingSlogan) landingSlogan.innerText = "나에게 딱 맞는 정책을 찾아보세요";
        }
    }
}

// --- Auth (자동 로그인 포함) ---
async function handleSignup() {
    const id = document.getElementById('signup-id').value;
    const pw = document.getElementById('signup-pw').value;
    if(!id || !pw) return alert("아이디와 비밀번호를 입력해주세요.");

    try {
        const res = await fetch('/api/signup', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: id, password: pw})
        });
        
        if(res.ok) {
            // [수정] 가입 성공 시 바로 로그인 처리
            const loginRes = await fetch('/api/login', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: id, password: pw})
            });
            if (loginRes.ok) {
                const data = await loginRes.json();
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', data.username);
                closeModal('signup-modal');
                updateMainUI();
                alert(`가입 완료! ${data.username}님 환영합니다.`);
                document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert("가입되었습니다. 로그인해주세요.");
                closeModal('signup-modal');
                openModal('login-modal');
            }
        } else {
            const data = await res.json();
            alert(data.detail || "가입 실패");
        }
    } catch(e) { console.error(e); alert("서버 오류"); }
}

async function handleLogin() {
    const id = document.getElementById('login-id').value;
    const pw = document.getElementById('login-pw').value;
    try {
        const res = await fetch('/api/login', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: id, password: pw})
        });
        if(res.ok) {
            const data = await res.json();
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', data.username);
            closeModal('login-modal');
            updateMainUI();
            alert(`환영합니다, ${data.username}님!`);
            document.getElementById('main-section').scrollIntoView({ behavior: 'smooth' });
        } else { alert("아이디 또는 비밀번호를 확인해주세요."); }
    } catch(e) { console.error(e); alert("서버 오류"); }
}

function switchToSignup() { closeModal('login-modal'); openModal('signup-modal'); }

// --- Card Swipe Logic ---
function loadMoreCards() {
    if (availablePolicies.length === 0) {
        if (window.allPolicies.length > 0 && currentCardStack.length === 0) alert("모든 정책 카드를 확인하셨습니다!");
        document.getElementById('load-more-btn').style.display = 'none';
        return;
    }
    const newCards = availablePolicies.splice(0, 30);
    currentCardStack = [...currentCardStack, ...newCards];
    renderCardStack();
}

function renderCardStack() {
    const container = document.getElementById('card-container');
    if(!container) return;
    container.innerHTML = '';
    [...currentCardStack].reverse().forEach(p => container.appendChild(createCardElement(p)));
    if (currentCardStack.length === 0 && availablePolicies.length > 0) document.getElementById('load-more-btn').style.display = 'block';
}

function createCardElement(policy) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = policy.id;
    const rawGenre = policy.genre || '금융/자산'; 
    const fileName = rawGenre.replace('/', '_') + '.png';
    const imgPath = `/images/${fileName}`;

    card.innerHTML = `
        <div class="card-period">${policy.period}</div>
        <div class="card-content">
            <div class="card-summary">${policy.title || '내용 없음'}</div>
            <div class="card-title">${policy.summary || policy.genre}</div>
            <div class="card-illustration">
                <img src="${imgPath}" alt="${rawGenre}" onerror="handleImgError(this)">
            </div>
        </div>
    `;
    initCardEvents(card);
    return card;
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
        
        // 1. 실시간 이미지 업데이트 (분석 완료 전이어야 작동)
        updateRealTimeAnalysis();
        
        const isDone = localStorage.getItem('analysisDone') === 'true';
        const lockMsg = document.getElementById('lock-message');
        
        // 2. 텍스트 업데이트
        if(lockMsg && !isDone) {
            const remaining = Math.max(0, TARGET_LIKES - likeCount);
            lockMsg.innerHTML = `아직 잠겨있습니다.<br>(카드 ${remaining}개를 더 LIKE 해주세요)`;
        }

        // 3. 30개 달성 체크 (분석 전인 경우에만)
        if(!isDone && likeCount >= TARGET_LIKES) {
            triggerFinalAnalysis();
        }
    }
    document.getElementById('undo-btn').style.display = 'flex';
    setTimeout(() => { 
        currentCardStack.shift(); 
        renderCardStack(); 
        document.getElementById('like-indicator').style.opacity=0; 
        document.getElementById('pass-indicator').style.opacity=0; 
    }, 300);
}

function getAnalysisImagePath() {
    if (likedDataForAI.genres.length === 0) return null;
    const genreCounts = {};
    likedDataForAI.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
    const sortedGenres = Object.keys(genreCounts).sort((a,b) => genreCounts[b] - genreCounts[a]);
    if (sortedGenres.length === 0) return null;
    
    const rawFirst = sortedGenres[0];
    const firstKey = rawFirst.split('/')[0]; 
    const rawSecond = sortedGenres[1] || rawFirst;
    const secondKey = rawSecond.split('/')[0];

    return `/images/1${firstKey}/${firstKey}_${secondKey}.png`;
}

function updateRealTimeAnalysis() {
    renderHexagonChart('main-hexagon-chart');
    // 이미 완료된 상태면 건드리지 않음
    if (localStorage.getItem('analysisDone') === 'true') return;
    
    const imagePath = getAnalysisImagePath();
    if (imagePath) showResultImage(imagePath);
}

async function triggerFinalAnalysis() {
    localStorage.setItem('analysisDone', 'true');
    const imgEl = document.querySelector('#ai-nickname-display img');
    if(imgEl) localStorage.setItem('myTypeImage', imgEl.src);

    alert(`🎉 좋아요 ${TARGET_LIKES}개 달성! 최종 취향 분석 완료.`);
    document.getElementById('lock-message').innerText = "분석이 완료되었습니다!";

    try {
        const res = await fetch('/api/generate-nickname', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ liked_titles: likedDataForAI.titles, liked_genres: likedDataForAI.genres })
        });
        const data = await res.json();
        if (data.nickname) {
            localStorage.setItem('myTypeNickname', data.nickname);
            showNickname(data.nickname);
        }
    } catch(e) { console.error(e); }
}

function showResultImage(src) {
    const display = document.getElementById('ai-nickname-display');
    if (display) {
        display.innerHTML = `
            <img src="${src}" style="width: 100%; max-width: 300px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" onerror="handleImgError(this)">
            <div id="nickname-placeholder"></div>`;
        const savedNick = localStorage.getItem('myTypeNickname');
        if(savedNick) showNickname(savedNick);
    }
}

// Helpers & MyPage Logic
function undoLastSwipe(){ if(lastSwiped.length){ const p = lastSwiped.pop(); currentCardStack.unshift(p); renderCardStack(); let liked = getLikedItems(); if(liked.includes(String(p.id))) { liked = liked.filter(id => id !== String(p.id)); localStorage.setItem('likedPolicies', JSON.stringify(liked)); likeCount--; const idx = likedDataForAI.titles.indexOf(p.title); if(idx > -1) { likedDataForAI.titles.splice(idx, 1); likedDataForAI.genres.splice(idx, 1); } renderHexagonChart('main-hexagon-chart'); if (localStorage.getItem('analysisDone') !== 'true') { const currentImg = getAnalysisImagePath(); if(currentImg) showResultImage(currentImg); } } } if(lastSwiped.length === 0) document.getElementById('undo-btn').style.display = 'none'; }
function openDetailModal(id){ const p = window.allPolicies.find(x => String(x.id) === String(id)); if (!p) return; document.getElementById('modal-title').innerText = p.title; document.getElementById('modal-period').innerText = p.period; document.getElementById('modal-summary').innerText = p.summary; const linkBtn = document.getElementById('modal-link-btn'); if (linkBtn) linkBtn.href = p.link; openModal('detail-modal'); }
function showNickname(nick) { const el = document.getElementById('nickname-placeholder'); if(el) el.innerHTML = `<div style="margin-top:20px; font-weight:bold; font-size:1.5rem;">"${nick}"</div>`; }
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

// [마이페이지 삭제 로직 수정] 여기서도 삭제 후 30개 미만이면 분석 리셋
function deleteLikedItem(id, el) { const card = el.closest('.placard-card'); card.style.opacity = '0'; setTimeout(() => card.remove(), 300); let list = getLikedItems(); if (list.includes(String(id))) deletedHistory.push(String(id)); list = list.filter(x => x !== String(id)); localStorage.setItem('likedPolicies', JSON.stringify(list)); if(list.length < TARGET_LIKES) { localStorage.setItem('analysisDone', 'false'); } renderHexagonChart('hexagon-chart'); updateRestoreButton(); }
function toggleAll(source) { const checkboxes = document.querySelectorAll('.card-checkbox:not(#select-all)'); checkboxes.forEach(cb => cb.checked = source.checked); }
function deleteSelectedItems() { const checkboxes = document.querySelectorAll('.card-checkbox:not(#select-all):checked'); if (!checkboxes.length) { alert("삭제할 항목을 선택해주세요."); return; } if (!confirm(`${checkboxes.length}개 항목을 삭제하시겠습니까?`)) return; let list = getLikedItems(); checkboxes.forEach(cb => { const id = cb.dataset.id; if (list.includes(String(id))) { deletedHistory.push(String(id)); } list = list.filter(x => x !== String(id)); const card = cb.closest('.placard-card'); if (card) card.remove(); }); localStorage.setItem('likedPolicies', JSON.stringify(list)); if(list.length < TARGET_LIKES) { localStorage.setItem('analysisDone', 'false'); } renderHexagonChart('hexagon-chart'); updateRestoreButton(); document.getElementById('select-all').checked = false; }
function restoreLastItem() { if (!deletedHistory.length) return; const lastId = deletedHistory.pop(); saveLikedItem(lastId); renderPlacardList(); renderHexagonChart('hexagon-chart'); updateRestoreButton(); }
function updateRestoreButton() { const btn = document.getElementById('restore-btn'); if (!btn) { const mainUndo = document.getElementById('undo-btn'); if(mainUndo) mainUndo.style.display = deletedHistory.length > 0 ? 'flex' : 'none'; return; } if (deletedHistory.length > 0) { btn.style.display = 'block'; btn.innerText = `↺ 삭제 취소 (${deletedHistory.length})`; } else { btn.style.display = 'none'; } }
function renderGenreFilters(){ const c=document.querySelector('.genre-filters'); if(!c)return; c.innerHTML=''; const b=document.createElement('button'); b.innerText="전체"; b.style.backgroundColor = "#555"; b.onclick=()=>renderPlacardList(null); c.appendChild(b); getUniqueGenres().forEach(g=>{ const btn=document.createElement('button'); btn.innerText=g; btn.style.backgroundColor = getGenreColor(g); btn.onclick=()=>renderPlacardList(g); c.appendChild(btn); }); }
function renderPlacardList(f){ const c=document.getElementById('mypage-results'); if(!c)return; c.innerHTML=''; const ids=getLikedItems(); let l=window.allPolicies.filter(p=>ids.includes(String(p.id))); if(f)l=l.filter(p=>p.genre===f); if(!l.length){c.innerHTML="<p style='text-align:center; color:#666;'>저장된 정책이 없습니다.</p>";return;} l.forEach(p=>{ const d=document.createElement('div'); d.className='placard-card'; d.innerHTML=`<input type="checkbox" class="card-checkbox" data-id="${p.id}" onclick="event.stopPropagation()"> <div class="info-area" onclick="openDetailModal('${p.id}')"> <h3 style="margin: 0 0 5px 0;">${p.title}</h3> <p style="margin: 0 0 5px 0; font-size: 0.9rem; color: #555;">${p.summary}</p> <p style="margin: 0; font-size:0.8rem; color:#888;">${p.genre}</p> </div> <button class="delete-btn" onclick="deleteLikedItem('${p.id}',this); event.stopPropagation();">삭제</button>`; c.appendChild(d); }); }