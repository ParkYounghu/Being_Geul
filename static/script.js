// 전역 변수 설정
let currentCards = [];   // 현재 스와이프 대기 중인 카드들
let swipeStack = [];     // 되돌리기(Undo)를 위한 기록
let currentSectionId = 'home'; // 현재 보고 있는 탭

document.addEventListener('DOMContentLoaded', () => {
    // 1. 초기 데이터 로드 (HTML에서 넘어온 allPolicies 활용)
    // 데이터가 없는 경우를 대비해 빈 배열 처리
    if (typeof allPolicies !== 'undefined') {
        currentCards = [...allPolicies];
    } else {
        currentCards = [];
        console.error("데이터를 불러오지 못했습니다.");
    }
    
    // 2. 초기 카드 스택 렌더링
    renderStack();
    
    // 3. 홈 화면 검색창 이벤트 리스너 (실시간 필터링)
    const searchInput = document.getElementById('home-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            // 검색어에 맞는 정책만 필터링하여 스택 재구성
            currentCards = allPolicies.filter(p => 
                p.title.toLowerCase().includes(keyword) || 
                p.summary.toLowerCase().includes(keyword)
            );
            renderStack(); 
        });
    }

    // 4. GSAP 초기화 (홈 화면만 보이고 나머지는 숨김)
    if (typeof gsap !== 'undefined') {
        gsap.set(".page-section", { autoAlpha: 0, display: "none" });
        gsap.set("#section-home", { autoAlpha: 1, display: "block" });
    }
});

/* --- 탭 전환 (SPA Navigation) --- */
function switchTab(targetName) {
    if (currentSectionId === targetName) return;

    // 탭 이동 시 데이터 최신화
    if (targetName === 'liked') renderLikedGrid();
    if (targetName === 'search') renderSearchGrid();
    if (targetName === 'analysis') initAnalysisPage();

    const outgoing = document.querySelector(`#section-${currentSectionId}`);
    const incoming = document.querySelector(`#section-${targetName}`);

    // GSAP 애니메이션 (페이드 인/아웃)
    gsap.to(outgoing, { duration: 0.3, autoAlpha: 0, display: "none" });
    gsap.to(incoming, { duration: 0.3, autoAlpha: 1, display: "block" });

    currentSectionId = targetName;
}

/* --- [홈] 카드 스택 렌더링 --- */
function renderStack() {
    const container = document.getElementById('card-container');
    if (!container) return;
    
    container.innerHTML = ''; // 기존 카드 비우기

    // 성능을 위해 상위 5개만 렌더링
    const visibleCount = 5;
    // DOM 구조상 나중에 추가된 것이 위에 쌓이므로 역순으로 배치
    const stackData = currentCards.slice(0, visibleCount).reverse(); 

    stackData.forEach((policy) => {
        const el = document.createElement('div');
        el.className = 'card';
        el.dataset.id = policy.id;
        
        // [중요] 드래그 오작동 방지: 제목(h2)에만 클릭 이벤트(모달 열기) 추가
        // 본문이나 카드를 클릭하면 드래그만 됨
        el.innerHTML = `
            <h2 class="card-title" 
                onclick="event.stopPropagation(); openModal('${policy.id}')" 
                style="cursor: pointer; text-decoration: underline; text-underline-offset: 4px; margin-bottom: 15px;">
                ${policy.title}
            </h2>
            <p style="pointer-events: none;">${policy.summary}</p>
            <span style="pointer-events: none; color: #888; font-size: 0.9em;">기간: ${policy.period}</span>
        `;
        
        container.appendChild(el);
        initCardEvents(el); // 드래그 이벤트 연결
    });
    updateCardStyles();
}

// 카드들의 깊이감(Z축) 스타일 업데이트
function updateCardStyles() {
    const cards = document.querySelectorAll('.card');
    const reversed = Array.from(cards).reverse(); // 화면 맨 앞이 index 0

    reversed.forEach((card, index) => {
        if (index < 3) {
            card.style.display = 'flex';
            // 뒤로 갈수록 작아지고 내려가는 효과
            card.style.transform = `translateY(${index * -10}px) scale(${1 - index * 0.05})`;
            card.style.zIndex = cards.length - index;
            card.style.opacity = 1;
        } else {
            card.style.display = 'none';
        }
    });
}

/* --- [홈] 스와이프 로직 (왼쪽=좋아요, 오른쪽=패스) --- */
function initCardEvents(card) {
    let startX = 0;
    let isDragging = false;
    
    const onStart = (e) => {
        isDragging = true;
        startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        card.style.transition = 'none'; // 드래그 중엔 애니메이션 끔
    };

    const onMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault(); // 스크롤 방지
        
        const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const offsetX = currentX - startX;
        
        // 카드 회전 및 이동
        card.style.transform = `translateX(${offsetX}px) rotate(${offsetX / 20}deg)`;

        // 인디케이터 표시
        const likeInd = document.getElementById('like-indicator');
        const passInd = document.getElementById('pass-indicator');
        const opacity = Math.min(Math.abs(offsetX) / 100, 1);
        
        // [방향 설정] 왼쪽(음수) -> LIKE / 오른쪽(양수) -> PASS
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
        
        // 현재 이동 거리 계산
        const style = window.getComputedStyle(card);
        const matrix = new WebKitCSSMatrix(style.transform);
        const offsetX = matrix.m41; // X축 이동값

        const threshold = window.innerWidth / 4; // 화면 1/4 이상 움직여야 실행

        if (Math.abs(offsetX) > threshold) {
            // 스와이프 확정
            const isLike = offsetX < 0; // 왼쪽이 좋아요
            const direction = offsetX > 0 ? 1 : -1;
            
            // 날아가는 애니메이션
            card.style.transition = 'transform 0.5s ease';
            card.style.transform = `translateX(${direction * window.innerWidth}px) rotate(${direction * 30}deg)`;
            
            // 데이터 처리
            const policyId = card.dataset.id;
            const policyData = allPolicies.find(p => p.id == policyId);
            
            // Undo를 위해 저장
            swipeStack.push({ cardData: policyData, action: isLike ? 'like' : 'pass' });

            if (isLike) saveLikedItem(policyId);

            // DOM 및 데이터 배열에서 제거
            setTimeout(() => {
                card.remove();
                currentCards.shift(); // 맨 앞 데이터 제거
                updateCardStyles();
                resetIndicators();
            }, 300);

        } else {
            // 제자리 복귀
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = 'translateY(0) scale(1)';
            resetIndicators();
        }
    };

    // 이벤트 리스너 등록
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

/* --- [홈] 되돌리기 (Undo) --- */
function undoLastSwipe() {
    if (swipeStack.length === 0) {
        alert("되돌릴 카드가 없습니다.");
        return;
    }
    const lastAction = swipeStack.pop();
    const policy = lastAction.cardData;
    
    // 다시 맨 앞에 추가
    currentCards.unshift(policy); 
    renderStack();
}

/* --- [모달] 상세 보기 및 공유 --- */
function openModal(idOrPolicy) {
    let policy = idOrPolicy;
    
    // 만약 ID(문자열/숫자)가 넘어왔다면 객체를 찾음
    if (typeof idOrPolicy !== 'object') {
        policy = allPolicies.find(p => p.id == idOrPolicy);
    }
    
    if (!policy) return;

    // 모달 내용 채우기
    document.getElementById('modal-title').innerText = policy.title;
    document.getElementById('modal-period').innerText = `기간: ${policy.period}`;
    document.getElementById('modal-summary').innerText = policy.summary;
    
    const linkBtn = document.getElementById('modal-link-btn');
    if(linkBtn) linkBtn.href = policy.link;
    
    // 공유 버튼 로직
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
                } catch (err) {
                    console.log('공유 취소됨');
                }
            } else {
                // PC 등 미지원 환경: 클립보드 복사
                try {
                    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                    alert("링크가 클립보드에 복사되었습니다!");
                } catch (err) {
                    alert("공유하기를 지원하지 않는 브라우저입니다.");
                }
            }
        };
    }

    // 모달 표시
    const modal = document.getElementById('detail-modal');
    if(modal) modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    if(modal) modal.classList.add('hidden');
}

/* --- [좋아요 & 검색] 그리드 뷰 렌더링 --- */

// LocalStorage 헬퍼 함수
function getLikedItems() {
    return JSON.parse(localStorage.getItem('likedPolicies') || '[]');
}
function saveLikedItem(id) {
    const items = getLikedItems();
    if (!items.includes(String(id))) { // ID를 문자열로 통일하여 저장
        items.push(String(id));
        localStorage.setItem('likedPolicies', JSON.stringify(items));
    }
}

// 1. 좋아요 목록 (보관함)
function renderLikedGrid() {
    const container = document.getElementById('liked-grid');
    if (!container) return;
    
    const likedIds = getLikedItems();
    // ID 비교 시 문자열 변환하여 비교 (안전성 확보)
    const likedPolicies = allPolicies.filter(p => likedIds.includes(String(p.id)));
    
    container.innerHTML = likedPolicies.map(p => `
        <div class="grid-item" onclick="openModal('${p.id}')" style="cursor: pointer;">
            <h4>${p.title}</h4>
            <p>${p.summary.substring(0, 40)}...</p>
            <span style="font-size: 0.8em; color: #888;">${p.period}</span>
        </div>
    `).join('');
    
    if (likedPolicies.length === 0) {
        container.innerHTML = "<p style='color:#666; text-align:center; width:100%;'>보관함이 비어있습니다.</p>";
    }
}

// 2. 전체 검색 목록
function renderSearchGrid() {
    const container = document.getElementById('search-grid');
    if (!container) return;
    
    container.innerHTML = allPolicies.map(p => `
        <div class="grid-item" onclick="openModal('${p.id}')" style="cursor: pointer;">
            <h4>${p.title}</h4>
            <p>${p.summary.substring(0, 40)}...</p>
            <span style="font-size: 0.8em; color: #888;">${p.period}</span>
        </div>
    `).join('');
}

/* --- [분석] 차트 렌더링 (기존 로직 유지) --- */
function initAnalysisPage() {
    const container = document.getElementById('analysis-results');
    if (!container) return;

    const likedIds = getLikedItems();
    const likedPolicies = allPolicies.filter(p => likedIds.includes(String(p.id)));
    
    if(likedPolicies.length === 0) {
        container.innerHTML = "<p style='color:#666;'>아직 '좋아요'한 정책이 없습니다.</p>";
        return;
    }
    
    // 장르별 카운트
    const genres = {};
    likedPolicies.forEach(p => {
        const g = p.genre || '기타';
        genres[g] = (genres[g] || 0) + 1;
    });
    
    // 정렬
    const sorted = Object.entries(genres).sort(([,a], [,b]) => b - a);
    const total = likedPolicies.length;

    container.innerHTML = '';
    sorted.forEach(([genre, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        
        const row = document.createElement('div');
        row.style.marginBottom = '15px';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span style="font-weight:bold;">${genre}</span>
                <span>${percent}%</span>
            </div>
            <div style="width:100%; background:#333; height:10px; border-radius:5px; overflow:hidden;">
                <div class="bar" style="width:0%; height:100%; background:#4CAF50; transition: width 1s ease;"></div>
            </div>
        `;
        container.appendChild(row);
        
        // 애니메이션 효과
        setTimeout(() => {
            row.querySelector('.bar').style.width = `${percent}%`;
        }, 100);
    });
}