// 전역 변수 설정
let currentCards = [];   
let swipeStack = [];     
let currentSectionId = 'home'; 

// [NEW] 테마 설정 (기본값: random)
let themeMode = 'random'; // 'random', 'spring', 'summer', 'autumn', 'winter'
const themeConfig = {
    random: { label: "🎨 테마: 랜덤", class: "" },
    spring: { label: "🌸 테마: 봄", class: "spring" },
    summer: { label: "🌿 테마: 여름", class: "summer" },
    autumn: { label: "🍁 테마: 가을", class: "autumn" },
    winter: { label: "❄️ 테마: 겨울", class: "winter" }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 데이터 로드 
    if (typeof allPolicies !== 'undefined') {
        currentCards = [...allPolicies];
    } else {
        currentCards = [];
        console.error("데이터를 불러오지 못했습니다.");
    }
    
    // 2. 테마 변경 버튼 생성 및 주입
    createThemeButton();

    // 3. 초기 카드 스택 렌더링
    renderStack();
    
    // 4. 홈 화면 검색창 이벤트 리스너
    const searchInput = document.getElementById('home-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            currentCards = allPolicies.filter(p => 
                p.title.toLowerCase().includes(keyword) || 
                p.summary.toLowerCase().includes(keyword)
            );
            renderStack(); 
        });
    }

    // 5. GSAP 초기화
    if (typeof gsap !== 'undefined') {
        gsap.set(".page-section", { autoAlpha: 0, display: "none" });
        gsap.set("#section-home", { autoAlpha: 1, display: "block" });
    }
});

/* --- [NEW] 테마 버튼 생성 함수 --- */
function createThemeButton() {
    const searchWrapper = document.querySelector('.search-wrapper');
    if (!searchWrapper) return;

    const btn = document.createElement('button');
    btn.id = 'theme-toggle-btn';
    btn.innerText = themeConfig[themeMode].label;
    
    btn.onclick = toggleTheme;
    
    // 검색창 옆에 버튼 추가
    searchWrapper.appendChild(btn);
}

/* --- [NEW] 테마 변경 로직 --- */
function toggleTheme() {
    const modes = Object.keys(themeConfig);
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    themeMode = modes[nextIndex];
    
    // 버튼 텍스트 업데이트
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerText = themeConfig[themeMode].label;

    // 카드 다시 그리기 (새 테마 적용)
    renderStack();
}

/* --- 탭 전환 --- */
function switchTab(targetName) {
    if (currentSectionId === targetName) return;

    if (targetName === 'liked') renderLikedGrid();
    if (targetName === 'search') renderSearchGrid();
    if (targetName === 'analysis') initAnalysisPage();

    const outgoing = document.querySelector(`#section-${currentSectionId}`);
    const incoming = document.querySelector(`#section-${targetName}`);

    gsap.to(outgoing, { duration: 0.3, autoAlpha: 0, display: "none" });
    gsap.to(incoming, { duration: 0.3, autoAlpha: 1, display: "block" });

    currentSectionId = targetName;
}

/* --- [홈] 카드 스택 렌더링 (15장) --- */
function renderStack() {
    const container = document.getElementById('card-container');
    if (!container) return;
    
    container.innerHTML = ''; 

    // 15장 로드
    const visibleCount = 15;
    const stackData = currentCards.slice(0, visibleCount).reverse(); 

    // 사계절 배열 (랜덤 모드용)
    const seasons = ['spring', 'summer', 'autumn', 'winter'];

    stackData.forEach((policy) => {
        const el = document.createElement('div');
        
        // [핵심 로직] 테마 모드에 따라 클래스 부여
        let seasonClass = '';
        if (themeMode === 'random') {
            seasonClass = seasons[Math.floor(Math.random() * seasons.length)];
        } else {
            seasonClass = themeConfig[themeMode].class;
        }

        el.className = `card ${seasonClass}`;
        el.dataset.id = policy.id;
        
        el.innerHTML = `
            <div>
                <h2 class="card-title" 
                    onclick="event.stopPropagation(); openModal('${policy.id}')" 
                    style="cursor: pointer; text-decoration: underline; text-underline-offset: 4px; margin-bottom: 15px;">
                    ${policy.title}
                </h2>
                <p style="pointer-events: none;">${policy.summary}</p>
            </div>
            <span style="pointer-events: none;">기간: ${policy.period}</span>
        `;
        
        container.appendChild(el);
        initCardEvents(el); 
    });
    updateCardStyles();
}

function updateCardStyles() {
    const cards = document.querySelectorAll('.card');
    const reversed = Array.from(cards).reverse(); 

    reversed.forEach((card, index) => {
        if (index < 15) {
            card.style.display = 'flex';
            card.style.zIndex = cards.length - index;
            
            // 상위 3장 시각 효과
            if (index < 3) {
                card.style.transform = `translateY(${index * -10}px) scale(${1 - index * 0.05})`;
                card.style.opacity = 1;
            } else {
                card.style.transform = `translateY(-30px) scale(0.9)`;
                card.style.opacity = 0; // 대기열
            }
        } else {
            card.style.display = 'none';
        }
    });
}

/* --- 스와이프 로직 --- */
function initCardEvents(card) {
    let startX = 0;
    let isDragging = false;
    
    const onStart = (e) => {
        isDragging = true;
        startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        card.style.transition = 'none'; 
    };

    const onMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault(); 
        
        const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const offsetX = currentX - startX;
        
        card.style.transform = `translateX(${offsetX}px) rotate(${offsetX / 20}deg)`;

        const likeInd = document.getElementById('like-indicator');
        const passInd = document.getElementById('pass-indicator');
        const opacity = Math.min(Math.abs(offsetX) / 100, 1);
        
        if (offsetX < 0) { 
            if(likeInd) { likeInd.style.opacity = opacity; }
            if(passInd) { passInd.style.opacity = 0; }
        } else { 
            if(passInd) { passInd.style.opacity = opacity; }
            if(likeInd) { likeInd.style.opacity = 0; }
        }
    };

    const onEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const style = window.getComputedStyle(card);
        const matrix = new WebKitCSSMatrix(style.transform);
        const offsetX = matrix.m41; 

        const threshold = window.innerWidth / 4; 

        if (Math.abs(offsetX) > threshold) {
            const isLike = offsetX < 0; 
            const direction = offsetX > 0 ? 1 : -1;
            
            card.style.transition = 'transform 0.5s ease';
            card.style.transform = `translateX(${direction * window.innerWidth}px) rotate(${direction * 30}deg)`;
            
            const policyId = card.dataset.id;
            const policyData = allPolicies.find(p => p.id == policyId);
            
            swipeStack.push({ cardData: policyData, action: isLike ? 'like' : 'pass' });

            if (isLike) saveLikedItem(policyId);

            setTimeout(() => {
                card.remove();
                currentCards.shift(); 
                updateCardStyles();
                resetIndicators();
            }, 300);

        } else {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translateY(0) scale(1)';
            resetIndicators();
        }
    };

    card.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    
    card.addEventListener('touchstart', onStart);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

function resetIndicators() {
    const likeInd = document.getElementById('like-indicator');
    const passInd = document.getElementById('pass-indicator');
    if(likeInd) likeInd.style.opacity = 0;
    if(passInd) passInd.style.opacity = 0;
}

function undoLastSwipe() {
    if (swipeStack.length === 0) {
        alert("되돌릴 카드가 없습니다.");
        return;
    }
    const lastAction = swipeStack.pop();
    const policy = lastAction.cardData;
    
    currentCards.unshift(policy); 
    renderStack();
}

/* --- 모달 및 기타 기능 --- */
function openModal(idOrPolicy) {
    let policy = idOrPolicy;
    if (typeof idOrPolicy !== 'object') {
        policy = allPolicies.find(p => p.id == idOrPolicy);
    }
    
    if (!policy) return;

    document.getElementById('modal-title').innerText = policy.title;
    document.getElementById('modal-period').innerText = `기간: ${policy.period}`;
    document.getElementById('modal-summary').innerText = policy.summary;
    
    const linkBtn = document.getElementById('modal-link-btn');
    if(linkBtn) linkBtn.href = policy.link;
    
    const shareBtn = document.getElementById('modal-share-btn');
    if(shareBtn) {
        shareBtn.onclick = async () => {
            const shareData = {
                title: '빙글 정책 추천',
                text: `[빙글] 이 정책 어때요? "${policy.title}"`,
                url: policy.link
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) { console.log('공유 취소'); }
            } else {
                try {
                    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                    alert("클립보드에 복사되었습니다!");
                } catch (e) { alert("지원하지 않는 브라우저입니다."); }
            }
        };
    }

    const modal = document.getElementById('detail-modal');
    if(modal) modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    if(modal) modal.classList.add('hidden');
}

function getLikedItems() {
    return JSON.parse(localStorage.getItem('likedPolicies') || '[]');
}
function saveLikedItem(id) {
    const items = getLikedItems();
    if (!items.includes(String(id))) {
        items.push(String(id));
        localStorage.setItem('likedPolicies', JSON.stringify(items));
    }
}

function renderLikedGrid() {
    const container = document.getElementById('liked-grid');
    if (!container) return;
    
    const likedIds = getLikedItems();
    const likedPolicies = allPolicies.filter(p => likedIds.includes(String(p.id)));
    
    container.innerHTML = likedPolicies.map(p => `
        <div class="grid-item" onclick="openModal('${p.id}')">
            <h4>${p.title}</h4>
            <p>${p.summary.substring(0, 40)}...</p>
            <span style="font-size: 0.8em; color: #888;">${p.period}</span>
        </div>
    `).join('');
    
    if (likedPolicies.length === 0) {
        container.innerHTML = "<p style='color:#666; text-align:center;'>보관함이 비어있습니다.</p>";
    }
}

function renderSearchGrid() {
    const container = document.getElementById('search-grid');
    if (!container) return;
    
    container.innerHTML = allPolicies.map(p => `
        <div class="grid-item" onclick="openModal('${p.id}')">
            <h4>${p.title}</h4>
            <p>${p.summary.substring(0, 40)}...</p>
            <span style="font-size: 0.8em; color: #888;">${p.period}</span>
        </div>
    `).join('');
}

function initAnalysisPage() {
    const container = document.getElementById('analysis-results');
    if (!container) return;

    const likedIds = getLikedItems();
    const likedPolicies = allPolicies.filter(p => likedIds.includes(String(p.id)));
    
    if(likedPolicies.length === 0) {
        container.innerHTML = "<p style='color:#666;'>아직 '좋아요'한 정책이 없습니다.</p>";
        return;
    }
    
    const genres = {};
    likedPolicies.forEach(p => {
        const g = p.genre || '기타';
        genres[g] = (genres[g] || 0) + 1;
    });
    
    const sorted = Object.entries(genres).sort(([,a], [,b]) => b - a);
    const total = likedPolicies.length;

    container.innerHTML = '';
    sorted.forEach(([genre, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        
        const row = document.createElement('div');
        row.style.marginBottom = '20px';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:600; color:#fff;">${genre}</span>
                <span style="color:#4CAF50; font-weight:bold;">${percent}%</span>
            </div>
            <div style="width:100%; background:#444; height:12px; border-radius:6px; overflow:hidden;">
                <div class="bar" style="width:0%; height:100%; background:#4CAF50; transition: width 1s ease;"></div>
            </div>
        `;
        container.appendChild(row);
        
        setTimeout(() => {
            row.querySelector('.bar').style.width = `${percent}%`;
        }, 100);
    });
}