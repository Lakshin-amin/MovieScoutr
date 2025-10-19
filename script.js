const API_URL = 'https://www.omdbapi.com/';
let API_KEY = 'afb8a3b6'; 

const searchInput = document.getElementById('searchInput');
const searchBtn   = document.getElementById('searchBtn');
const typeFilter  = document.getElementById('typeFilter');
const yearFilter  = document.getElementById('yearFilter');
const resetFilters= document.getElementById('resetFilters');
const moviesGrid  = document.getElementById('moviesGrid');
const statusArea  = document.getElementById('statusArea');
const prevBtn     = document.getElementById('prevBtn');
const nextBtn     = document.getElementById('nextBtn');
const pageInfo    = document.getElementById('pageInfo');
const pagination  = document.getElementById('pagination');

const watchBadge  = document.getElementById('watchBadge');
const watchlistGrid = document.getElementById('watchlistGrid');
const watchlistSection = document.getElementById('watchlistSection');
const emptyWatchlist = document.getElementById('emptyWatchlist');
const clearWatchlist = document.getElementById('clearWatchlist');

const modal = document.getElementById('modal');
const modalBg = document.getElementById('modalBg');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');
const toast = document.getElementById('toast');

const openSearch = document.getElementById('openSearch');
const gotoWatchlist = document.getElementById('gotoWatchlist');

let currentPage = 1;
let totalResults = 0;
let currentQuery = '';
let watchlist = JSON.parse(localStorage.getItem('ms_watchlist') || '[]');


(function initYears(){
  const now = new Date().getFullYear();
  for(let y = now; y >= 1950; y--){
    const opt = document.createElement('option'); opt.value = y; opt.textContent = y;
    yearFilter.appendChild(opt);
  }
})();


openSearch.addEventListener('click', ()=> window.scrollTo({top:document.querySelector('.hero').offsetTop + 200, behavior:'smooth'}));
gotoWatchlist.addEventListener('click', ()=> showWatchlist());
searchBtn.addEventListener('click', ()=> handleSearch(1));
searchInput.addEventListener('keypress', e => { if(e.key === 'Enter') handleSearch(1); });
resetFilters.addEventListener('click', ()=> { typeFilter.value=''; yearFilter.value=''; handleSearch(1); });
prevBtn.addEventListener('click', ()=> changePage(-1));
nextBtn.addEventListener('click', ()=> changePage(1));
clearWatchlist.addEventListener('click', ()=> {
  if(!watchlist.length) return showToast('Watchlist already empty', true);
  if(confirm('Clear your watchlist?')){ watchlist=[]; persistWatchlist(); renderWatchlist(); showToast('Watchlist cleared'); }
});

modalBg.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);


updateWatchBadge();
renderWatchlist();
loadPopularMovies();



function showToast(msg, error=false){
  toast.textContent = msg;
  toast.classList.add('show');
  if(error) toast.style.border = '2px solid rgba(255,120,120,0.6)';
  setTimeout(()=>{ toast.classList.remove('show'); toast.style.border = ''; }, 2500);
}

function persistWatchlist(){ localStorage.setItem('ms_watchlist', JSON.stringify(watchlist)); updateWatchBadge(); }

function updateWatchBadge(){ watchBadge.textContent = watchlist.length; }

function changePage(dir){
  currentPage = Math.max(1, currentPage + dir);
  searchMovies(currentQuery, currentPage);
}

function handleSearch(page=1){
  const q = searchInput.value.trim();
  if(!q && !typeFilter.value && !yearFilter.value){ showToast('Type something to search', true); return; }
  currentQuery = q || 'movie';
  currentPage = page;
  searchMovies(currentQuery, currentPage);
}

async function searchMovies(q, page=1){
  statusArea.textContent = 'Searching movies...';
  moviesGrid.innerHTML = '';
  pagination.classList.add('hide');

  try {
    let url = `${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(q)}&page=${page}`;
    if(typeFilter.value) url += `&type=${typeFilter.value}`;
    if(yearFilter.value) url += `&y=${yearFilter.value}`;
    const res = await fetch(url);
    const data = await res.json();
    if(data.Response === 'True'){
      totalResults = parseInt(data.totalResults || 0);
      renderMovies(data.Search);
      updatePagination();
      statusArea.textContent = `Showing results for "${q}"`;
    } else {
      statusArea.textContent = 'No results found';
      showToast('No results', true);
    }
  } catch(e) {
    console.error(e);
    statusArea.textContent = 'Something went wrong';
    showToast('Network error', true);
  }
}

function updatePagination(){
  const totalPages = Math.ceil(totalResults / 10) || 1;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  pagination.classList.remove('hide');
}

function renderMovies(list){
  moviesGrid.innerHTML = '';
  list.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = m.Poster && m.Poster !== 'N/A' ? m.Poster : 'https://via.placeholder.com/400x600?text=No+Poster';
    card.innerHTML = `
      <button class="watchlist-btn ${isInWatchlist(m.imdbID)?'active':''}" data-id="${m.imdbID}" title="Add to watchlist">
        <i class="fas fa-heart"></i>
      </button>
      <img class="movie-poster" src="${poster}" alt="${escapeHtml(m.Title)}" />
      <div class="movie-info">
        <h3 class="movie-title">${escapeHtml(m.Title)}</h3>
        <div class="movie-meta"><span>${m.Year}</span><span>${m.Type}</span></div>
      </div>
    `;
    
    card.addEventListener('click', (e)=>{
      if(e.target.closest('.watchlist-btn')) return; //
      openDetails(m.imdbID);
    });
    
    card.querySelector('.watchlist-btn').addEventListener('click', (ev)=>{
      ev.stopPropagation();
      toggleWatchlist(m.imdbID);
      ev.currentTarget.classList.toggle('active');
    });
    moviesGrid.appendChild(card);
  });
}

function isInWatchlist(id){ return watchlist.some(w => w.imdbID === id); }

async function openDetails(imdbID){
  showModalLoading();
  try {
    const res = await fetch(`${API_URL}?apikey=${API_KEY}&i=${imdbID}&plot=full`);
    const m = await res.json();
    if(m.Response === 'True') displayDetails(m);
    else { modalBody.innerHTML = '<p>Details unavailable</p>'; }
  } catch(e) {
    modalBody.innerHTML = '<p>Failed to load details</p>';
    console.error(e);
  }
  showModal();
}

function showModal(){ modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow='auto'; }

function showModalLoading(){
  modalBody.innerHTML = `<div style="padding:30px;text-align:center;color:var(--muted)">Loading…</div>`;
  showModal();
}

function displayDetails(m){
  const poster = m.Poster && m.Poster !== 'N/A' ? m.Poster : 'https://via.placeholder.com/400x600?text=No+Poster';
  modalBody.innerHTML = `
    <div class="modal-body">
      <img class="modal-poster" src="${poster}" alt="${escapeHtml(m.Title)}" />
      <div class="modal-info">
        <h2>${escapeHtml(m.Title)}</h2>
        <div class="modal-meta">${m.Year} • ${m.Runtime || 'N/A'} • ${m.Genre || ''}</div>
        <div class="modal-plot">${escapeHtml(m.Plot || 'Synopsis not available')}</div>
        <div style="margin-top:12px">
          <button id="modalWatchBtn" class="circle">${isInWatchlist(m.imdbID)?'✓':'+'}</button>
          <a class="pill" href="${m.Website && m.Website!=='N/A' ? m.Website : '#'}" target="_blank" style="margin-left:12px">Official</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modalWatchBtn').addEventListener('click', ()=>{
    toggleWatchlist(m.imdbID);
    document.getElementById('modalWatchBtn').textContent = isInWatchlist(m.imdbID) ? '✓' : '+';
  });
}

function toggleWatchlist(imdbID){
  const idx = watchlist.findIndex(w=>w.imdbID===imdbID);
  if(idx > -1){
    watchlist.splice(idx,1);
    showToast('Removed from watchlist');
  } else {
    fetch(`${API_URL}?apikey=${API_KEY}&i=${imdbID}`)
      .then(r=>r.json())
      .then(m=>{
        if(m.Response==='True'){ 
          watchlist.push({
            imdbID:m.imdbID,
            Title:m.Title,
            Year:m.Year,
            Poster:m.Poster||''
          }); 
          persistWatchlist(); 
          renderWatchlist(); 
          showToast('Added to watchlist'); 
        }
      })
      .catch(()=>{ 
        showToast('Could not add', true); 
      });
  }
  persistWatchlist();
  renderWatchlist();
  updateWatchBadge();
}

// Replace loadDemoOrPopular with actual popular movies loader
async function loadPopularMovies(){
  const popularQueries = ['Avengers', 'Matrix', 'Batman'];
  const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
  currentQuery = randomQuery;
  currentPage = 1;
  await searchMovies(randomQuery, 1);
}

// Replace initial loader call
loadPopularMovies();

function renderWatchlist(){
  watchlistGrid.innerHTML = '';
  if(!watchlist.length){ emptyWatchlist.style.display='block'; return; }
  emptyWatchlist.style.display='none';
  watchlist.forEach(m=>{
    const card = document.createElement('div'); card.className='movie-card';
    const poster = m.Poster && m.Poster!=='N/A' ? m.Poster : 'https://via.placeholder.com/400x600?text=No+Poster';
    card.innerHTML = `
      <button class="watchlist-btn active" data-id="${m.imdbID}"><i class="fas fa-heart"></i></button>
      <img class="movie-poster" src="${poster}" alt="${escapeHtml(m.Title)}" />
      <div class="movie-info">
        <h3 class="movie-title">${escapeHtml(m.Title)}</h3>
        <div class="movie-meta"><span>${m.Year}</span><span>saved</span></div>
      </div>
    `;
    card.querySelector('.watchlist-btn').addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleWatchlist(m.imdbID);
    });
    card.addEventListener('click', ()=> openDetails(m.imdbID));
    watchlistGrid.appendChild(card);
  });
}


function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
