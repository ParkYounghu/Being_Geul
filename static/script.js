
const Storage = {
    get: k => JSON.parse(localStorage.getItem(k) || '[]'),
    add: (k, v) => {
        let d = Storage.get(k);
        if(!d.includes(v)) { d.push(v); localStorage.setItem(k, JSON.stringify(d)); }
    }
};

let allPolicies = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. 데이터 로드
    document.querySelectorAll('.hidden-policy-data').forEach(el => {
        allPolicies.push({
            id: parseInt(el.dataset.id),
            title: el.dataset.title,
            genre: el.dataset.genre
        });
    });

    // 2. 스와이프 로직 (index_01)
    const cardStack = document.getElementById('cardStack');
    if(cardStack) {
        let cards = Array.from(cardStack.querySelectorAll('.swipe-card'));
        let current = cards[cards.length - 1];
        let isDragging = false, startX = 0;

        function endDrag(e) {
            if(!current || !isDragging) return;
            isDragging = false;
            let deltaX = (e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX) - startX;
            
            if(deltaX > 100) { // LIKE (오른쪽)
                current.style.transform = `translate(100vw, 0) rotate(30deg)`;
                Storage.add('liked', parseInt(current.dataset.id));
                setTimeout(() => current.remove(), 300);
            } else if(deltaX < -100) { // NOPE (왼쪽)
                current.style.transform = `translate(-100vw, 0) rotate(-30deg)`;
                setTimeout(() => current.remove(), 300);
            } else {
                current.style.transform = '';
                current.querySelector('.like-text').style.opacity = 0;
                current.querySelector('.nope-text').style.opacity = 0;
            }
            // 다음 카드 준비
            cards.pop();
            current = cards[cards.length - 1];
        }

        const start = e => { 
            if(e.target.closest('.swipe-card') !== current) return;
            isDragging = true; 
            startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX; 
        };
        const move = e => {
            if(!isDragging || !current) return;
            let x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - startX;
            current.style.transform = `translate(${x}px, 0) rotate(${x/20}deg)`;
            current.querySelector('.like-text').style.opacity = x > 50 ? 1 : 0;
            current.querySelector('.nope-text').style.opacity = x < -50 ? 1 : 0;
        };

        cardStack.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', endDrag);
        cardStack.addEventListener('touchstart', start);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', endDrag);
    }

    // 3. 찜한 목록 (index_02)
    const likedGrid = document.getElementById('likedPoliciesGrid');
    if(likedGrid) {
        const liked = Storage.get('liked');
        let count = 0;
        likedGrid.querySelectorAll('.policy-grid-item').forEach(item => {
            if(liked.includes(parseInt(item.dataset.id))) {
                item.style.display = 'flex';
                count++;
            } else {
                item.style.display = 'none';
            }
        });
        document.getElementById('noLikedItemsMessage').style.display = count === 0 ? 'block' : 'none';
    }

    // 4. 취향 분석 (index_03)
    const analysisChart = document.getElementById('genreAnalysisChart');
    if(analysisChart) {
        const liked = Storage.get('liked');
        if(liked.length === 0) {
            document.getElementById('noAnalysisDataMessage').style.display = 'block';
        } else {
            const counts = {};
            let total = 0;
            allPolicies.filter(p => liked.includes(p.id)).forEach(p => {
                counts[p.genre] = (counts[p.genre] || 0) + 1;
                total++;
            });
            
            // 가장 많이 본 장르 찾기
            let topGenre = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            analysisChart.innerHTML = `가장 선호하는 정책: <span style="color:#4facfe">${topGenre}</span>`;
            
            const list = document.getElementById('genreAnalysisList');
            for(let [genre, cnt] of Object.entries(counts)) {
                list.innerHTML += `<div><span>${genre}</span><span>${Math.round(cnt/total*100)}%</span></div>`;
            }
        }
    }
});
