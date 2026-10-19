(function () {
  'use strict';

  const STORAGE_KEY = 'travel-planner:ishigaki';
  const DAY_KEY = 'travel-planner:ishigaki:day'; // 마지막으로 보던 Day (새로고침 시 복원)
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const $ = (id) => document.getElementById(id);

  // 이전 샘플의 제목·메모 중 정보가 바뀐 것 (사용자가 고치지 않았다면 새 샘플 값으로 교체)
  const OUTDATED_DEMO_TEXT = {
    title: ['숙소 체크인 (4박 5일)', '숙소 체크아웃'],
    memo: [
      '야키니쿠 킨조 등 이시가키규 전문점. 주말이라 사전 예약 권장',
      '북부 드라이브 길목의 소바 맛집. 대기 있을 수 있음',
      '조식 옵션 없음 → 아침거리 별도 준비',
    ],
  };

  // 샘플 일정 구성 변경 이력 (data.js 의 DEMO_PLAN_REV). 저장 데이터에 순서대로 적용
  // remove: 삭제할 샘플 일정 / reschedule: 날짜·시간·메모를 새 샘플 값으로 옮김 / add: 새 샘플 일정 추가
  const DEMO_PLAN_MIGRATIONS = {
    // 2026-10-19 이리오모테 투어 전면 취소 → 3일차 해변 스노클·관광, 4일차 동선 재조정
    2: {
      remove: ['demo-14', 'demo-15', 'demo-16', 'demo-17', 'demo-18'],
      reschedule: ['demo-19', 'demo-20', 'demo-21', 'demo-22', 'demo-23', 'demo-24', 'demo-25'],
      add: ['demo-38', 'demo-39', 'demo-40', 'demo-41', 'demo-42', 'demo-43', 'demo-44', 'demo-45'],
    },
  };

  let plan = load();
  let currentDay = loadDay();
  let selectedCategory = 'TOUR';

  // ---------- 상태 저장 ----------
  function load() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      /* 손상된 데이터는 샘플로 대체 */
    }
    // 동기화 오류가 저장 데이터를 샘플로 덮어쓰지 않도록 try 밖에서 처리
    return saved && Array.isArray(saved.schedules) ? syncDemoTips(migrateDemoPlan(saved)) : window.createDemoPlan();
  }

  // 샘플 일정 구성 변경 반영: 완료 체크·직접 수정한 TIP·사용자 추가 일정은 보존
  function migrateDemoPlan(saved) {
    if (saved.id !== 'ishigaki-2026') return saved;
    const demo = new Map(window.createDemoPlan().schedules.map((s) => [s.id, s]));
    for (let rev = (saved.demoRev || 1) + 1; rev <= window.DEMO_PLAN_REV; rev++) {
      const m = DEMO_PLAN_MIGRATIONS[rev];
      if (!m) continue;
      saved.schedules = saved.schedules.filter((s) => !m.remove.includes(s.id));
      saved.schedules.forEach((s) => {
        const d = demo.get(s.id);
        if (d && m.reschedule.includes(s.id)) Object.assign(s, { day: d.day, time: d.time, memo: d.memo });
      });
      const ids = new Set(saved.schedules.map((s) => s.id));
      m.add.forEach((id) => !ids.has(id) && demo.has(id) && saved.schedules.push(demo.get(id)));
    }
    saved.demoRev = window.DEMO_PLAN_REV;
    return saved;
  }

  // 샘플 TIP 최신화: 사용자가 직접 수정·삭제하지 않은 샘플 TIP 은 data.js 의 최신 내용으로 교체
  function syncDemoTips(saved) {
    const demo = new Map(window.createDemoPlan().schedules.map((s) => [s.id, s]));
    saved.schedules.forEach((s) => {
      const d = demo.get(s.id);
      if (!d) return;
      Object.entries(OUTDATED_DEMO_TEXT).forEach(([field, olds]) => {
        if (olds.includes(s[field])) s[field] = d[field];
      });
      if (s.id === 'demo-31' && s.memo === '') s.memo = d.memo; // 체크아웃 메모는 원래 비어 있었음
      if (!d.tip || s.tipDeleted) return;
      if (!s.tip || (s.tip.source === 'demo' && (s.tip.rev || 1) < d.tip.rev)) s.tip = d.tip;
    });
    return saved;
  }

  function loadDay() {
    const day = Number(localStorage.getItem(DAY_KEY));
    return day >= 1 && day <= plan.totalDays ? day : 1;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      localStorage.setItem(DAY_KEY, String(currentDay));
    } catch (e) {
      toast('저장에 실패했습니다. 브라우저 저장소 설정을 확인해주세요.');
    }
  }

  // ---------- 날짜/포맷 유틸 ----------
  function parseDate(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function toYmd(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  function dateOfDay(day) {
    const d = parseDate(plan.startDate);
    d.setDate(d.getDate() + day - 1);
    return d;
  }

  function shortDate(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  function formatCost(n) {
    return `¥${Number(n).toLocaleString('ko-KR')}`;
  }

  function itemsOfDay(day) {
    return plan.schedules
      .filter((s) => s.day === day)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('is-show'), 2000);
  }

  // ---------- 렌더링 ----------
  function renderHeader() {
    const s = parseDate(plan.startDate);
    const e = parseDate(plan.endDate);
    const fmt = (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    $('tripTitle').textContent = plan.title;
    $('tripPeriod').textContent = `${fmt(s)} ~ ${fmt(e)} · ${plan.totalDays - 1}박 ${plan.totalDays}일`;
    document.title = `${plan.title} | 여행 플래너`;
  }

  function renderTabs() {
    const list = $('dayTabs');
    list.innerHTML = '';
    for (let day = 1; day <= plan.totalDays; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (day === currentDay ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(day === currentDay));
      btn.innerHTML = `Day ${day} <small>(${shortDate(dateOfDay(day))})</small>`;
      btn.addEventListener('click', () => {
        currentDay = day;
        save();
        resetForm();
        render();
      });
      list.appendChild(btn);
    }
    list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderTimeline() {
    const date = dateOfDay(currentDay);
    const items = itemsOfDay(currentDay);
    const done = items.filter((s) => s.isCompleted).length;
    const cost = items.reduce((sum, s) => sum + (s.cost || 0), 0);

    $('dayHeading').textContent = `Day ${currentDay} · ${shortDate(date)} (${WEEKDAYS[date.getDay()]})`;
    $('dayStats').textContent = items.length
      ? `일정 ${items.length}개 · 완료 ${done}개${cost ? ` · 예상 비용 ${formatCost(cost)}` : ''}`
      : '';

    const list = $('timelineList');
    list.innerHTML = items
      .map((s) => {
        const cat = window.CATEGORIES[s.category] || window.CATEGORIES.ETC;
        return `
        <li class="card cat-${s.category}${s.isCompleted ? ' is-done' : ''}" data-id="${s.id}">
          <label class="card__check">
            <input type="checkbox" data-action="toggle" ${s.isCompleted ? 'checked' : ''} aria-label="완료 여부" />
          </label>
          <div class="card__body">
            <div class="card__meta">
              <time class="card__time">${formatTime(s.time)}</time>
              <span class="tag tag--${s.category}">${cat.icon} ${cat.label}</span>
              ${tipChip(s)}
              ${s.recommended ? '<span class="tag tag--rec">추천</span>' : ''}
            </div>
            <h3 class="card__title">${escapeHtml(s.title)}</h3>
            ${s.memo ? `<p class="card__memo">${escapeHtml(s.memo)}</p>` : ''}
            ${s.cost ? `<p class="card__cost">${formatCost(s.cost)}</p>` : ''}
          </div>
          <div class="card__actions">
            <button type="button" class="btn-sm" data-action="edit">수정</button>
            <button type="button" class="btn-sm btn-sm--danger" data-action="delete">삭제</button>
          </div>
        </li>`;
      })
      .join('');
    $('emptyState').hidden = items.length > 0;
  }

  function renderCategoryBadges() {
    $('fCategory').innerHTML = Object.entries(window.CATEGORIES)
      .map(
        ([key, c]) => `
        <button type="button" role="radio" class="badge tag--${key}${key === selectedCategory ? ' is-selected' : ''}"
          aria-checked="${key === selectedCategory}" data-cat="${key}">${c.icon} ${c.label}</button>`
      )
      .join('');
  }

  function render() {
    renderHeader();
    renderTabs();
    renderTimeline();
  }

  // ---------- 폼 ----------
  function resetForm() {
    $('scheduleForm').reset();
    $('fId').value = '';
    $('fTime').value = '09:00';
    selectedCategory = 'TOUR';
    renderCategoryBadges();
    $('titleError').hidden = true;
    $('fTitle').classList.remove('is-invalid');
    $('memoCount').textContent = '0/100';
    $('formTitle').textContent = `신규 일정 등록 · Day ${currentDay}`;
    $('btnSubmit').textContent = '일정 등록';
    $('btnCancelEdit').hidden = true;
  }

  function fillForm(item) {
    $('fId').value = item.id;
    $('fTime').value = item.time;
    $('fTitle').value = item.title;
    $('fCost').value = item.cost ?? '';
    $('fMemo').value = item.memo ?? '';
    $('memoCount').textContent = `${(item.memo ?? '').length}/100`;
    selectedCategory = item.category;
    renderCategoryBadges();
    $('formTitle').textContent = `일정 수정 · Day ${item.day}`;
    $('btnSubmit').textContent = '수정 완료';
    $('btnCancelEdit').hidden = false;
    openSheet();
    $('fTitle').focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    const title = $('fTitle').value.trim();
    if (!title) {
      $('titleError').hidden = false;
      $('fTitle').classList.add('is-invalid');
      $('fTitle').focus();
      return;
    }
    const costRaw = $('fCost').value;
    const data = {
      time: $('fTime').value || '00:00',
      title,
      category: selectedCategory,
      cost: costRaw === '' ? undefined : Math.max(0, Number(costRaw)),
      memo: $('fMemo').value.trim().slice(0, 100) || undefined,
    };

    const id = $('fId').value;
    if (id) {
      const item = plan.schedules.find((s) => s.id === id);
      Object.assign(item, data);
      toast('일정을 수정했습니다.');
    } else {
      plan.schedules.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        day: currentDay,
        isCompleted: false,
        ...data,
      });
      toast('일정을 등록했습니다.');
    }
    save();
    resetForm();
    closeSheet();
    renderTimeline();
  }

  // ---------- 모바일 바텀 시트 ----------
  const mobileQuery = window.matchMedia('(max-width: 899px)');

  function openSheet() {
    if (!mobileQuery.matches) return;
    $('formPanel').classList.add('is-open');
    $('sheetBackdrop').hidden = false;
  }

  function closeSheet() {
    $('formPanel').classList.remove('is-open');
    $('sheetBackdrop').hidden = true;
  }

  // ---------- 전체 요약 ----------
  function renderSummary() {
    let total = 0;
    let html = '';
    for (let day = 1; day <= plan.totalDays; day++) {
      const date = dateOfDay(day);
      const items = itemsOfDay(day);
      const cost = items.reduce((sum, s) => sum + (s.cost || 0), 0);
      total += cost;
      html += `
        <section class="summary-day">
          <h3><button type="button" class="link" data-goto="${day}">Day ${day} · ${shortDate(date)} (${WEEKDAYS[date.getDay()]})</button>
            <small>${items.length}개${cost ? ` · ${formatCost(cost)}` : ''}</small></h3>
          ${
            items.length
              ? `<ul>${items
                  .map(
                    (s) =>
                      `<li class="${s.isCompleted ? 'is-done' : ''}"><span class="summary-time">${s.time}</span>${
                        s.tip?.warning ? '<span title="TIP 주의사항 있음">⚠️</span> ' : ''
                      }${
                        window.CATEGORIES[s.category]?.icon ?? ''
                      } ${escapeHtml(s.title)}</li>`
                  )
                  .join('')}</ul>`
              : '<p class="muted">등록된 일정 없음</p>'
          }
        </section>`;
    }
    const all = plan.schedules.length;
    const done = plan.schedules.filter((s) => s.isCompleted).length;
    html =
      `<p class="summary-total">총 ${all}개 일정 · 완료 ${done}개${total ? ` · 예상 비용 합계 ${formatCost(total)}` : ''}</p>` + html;
    $('summaryBody').innerHTML = html;
  }

  // ---------- TIP 레이어 팝업 ----------
  const TIP_PLACEHOLDERS = {
    warning: '예: 화요일 휴무 가능성 — 전화로 확인',
    hours: '예: 11:00~15:00 / 17:30~21:00 (LO 20:30)',
    closed: '예: 수요일, 부정기 휴무',
    price: '예: 어른 1,200엔 / 어린이 600엔',
    reserve: '예: 전화 예약 필수, 1개월 전부터 접수',
    parking: '예: 무료 주차장 20대',
    payment: '예: 현금만 가능 / 카드·PayPay 가능',
    prepare: '예: 수영복, 수건, 멀미약',
    tips: '자유롭게 메모 (줄바꿈 가능)',
    address: '예: 沖縄県石垣市… (지도 링크 자동 생성)',
    mapcode: '예: 366 123 456*78 (렌터카 내비 입력용)',
    phone: '예: 0980-00-0000 (내비 전화번호 검색에도 사용)',
    url: '공식 사이트·예약 링크 (여러 개면 줄바꿈)',
  };
  const TIP_SINGLE_LINE = ['address', 'mapcode', 'phone'];
  const STALE_DAYS = 30;
  let tipItemId = null;

  const PLACE_CATEGORIES = ['FOOD', 'TOUR', 'HOTEL']; // 맵코드 입력을 권하는 일정
  const isHttp = (u) => /^https?:\/\//.test(u || '');
  const gmapSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  const hasTip = (tip) => !!tip && (window.TIP_FIELDS.some((f) => tip[f.key]) || tip.parkingSpots?.length > 0);
  const tipItem = () => plan.schedules.find((s) => s.id === tipItemId);
  const today = () => toYmd(new Date());
  const daysSince = (ymd) => Math.round((parseDate(today()) - parseDate(ymd)) / 86400000);

  function tipChip(s) {
    if (!hasTip(s.tip)) return '<button type="button" class="tip-chip tip-chip--empty" data-action="tip">+ TIP</button>';
    const warn = !!s.tip.warning;
    return `<button type="button" class="tip-chip${warn ? ' tip-chip--warn' : ''}" data-action="tip"
      aria-label="TIP 보기${warn ? ' (주의사항 있음)' : ''}">${warn ? '⚠️' : '💡'} TIP</button>`;
  }

  function titleKeyword(item) {
    return item.title.replace(/^(아침|점심|저녁)\s*:\s*/, '').replace(/[^\p{L}\p{N}\s·&()]/gu, '').trim();
  }

  function searchUrl(item) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${titleKeyword(item)} 이시가키`)}`;
  }

  // 맵코드 검색: 일본어 주소가 있으면 주소로, 없으면 일정 제목으로
  function mapcodeSearchUrl(item) {
    const base = item.tip?.address?.replace(/\s*\(.*\)\s*$/, '') || `${titleKeyword(item)} 石垣島`;
    return `https://www.google.com/search?q=${encodeURIComponent(`${base} マップコード`)}`;
  }

  function needsMapcode(item) {
    return !item.tip?.mapcode && (PLACE_CATEGORIES.includes(item.category) || !!item.tip?.address);
  }

  function tipValueHtml(key, value) {
    const text = escapeHtml(value);
    if (key === 'phone') return `<a href="tel:${value.replace(/[^\d+]/g, '')}">${text}</a>`;
    if (key === 'mapcode') {
      // 문장 속 맵코드(예: 366 558 349*76)마다 눌러서 복사하는 칩으로 표시
      return text.replace(
        /\d{3,4}\s?\d{3}\s?\d{3}(?:\*\d{1,2})?/g,
        (code) => `<button type="button" class="mapcode" data-tip="copy" data-value="${code}" title="눌러서 복사">${code} ⧉</button>`
      );
    }
    if (key === 'address') {
      const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
      return `${text} <a class="tip-link" href="${map}" target="_blank" rel="noopener">지도 열기 ↗</a>`;
    }
    if (key === 'url') {
      return value
        .split(/\s+/)
        .filter(Boolean)
        .map((u) =>
          /^https?:\/\//.test(u)
            ? `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u.replace(/^https?:\/\//, ''))} ↗</a>`
            : escapeHtml(u)
        )
        .join('<br>');
    }
    return text;
  }

  function renderTipView() {
    const item = tipItem();
    const tip = item.tip;
    $('tipTitle').textContent = item.title;
    $('btnTipEdit').textContent = hasTip(tip) ? '수정' : '작성';
    $('btnTipDelete').hidden = !hasTip(tip);

    if (!hasTip(tip)) {
      $('tipView').innerHTML = `
        <div class="tip-empty">
          <p>아직 등록된 TIP이 없습니다.</p>
          <p class="muted">휴무일·영업시간·주차·준비물 등을 적어두면 여행 중에 바로 꺼내볼 수 있어요.</p>
          <div class="tip-empty__actions">
            <button type="button" class="btn btn--primary" data-tip="edit">TIP 작성하기</button>
            <a class="btn btn--ghost" href="${searchUrl(item)}" target="_blank" rel="noopener">🔎 정보 검색</a>
          </div>
        </div>`;
      return;
    }

    const rows = window.TIP_FIELDS.filter((f) => tip[f.key])
      .map(
        (f) => `
        <div class="tip-row${f.key === 'warning' ? ' tip-row--warn' : ''}">
          <dt><span aria-hidden="true">${f.icon}</span> ${f.label}</dt>
          <dd>${tipValueHtml(f.key, tip[f.key])}</dd>
        </div>`
      )
      .join('');
    const mapcodeHint = needsMapcode(item)
      ? `<div class="tip-row tip-row--hint">
          <dt><span aria-hidden="true">🧭</span> 맵코드</dt>
          <dd>아직 없음 — 렌터카 내비에 입력하면 정확해요.
            <a class="tip-link" href="${mapcodeSearchUrl(item)}" target="_blank" rel="noopener">🔎 맵코드 검색</a>
            <button type="button" class="tip-link tip-copy" data-tip="edit">입력하기</button></dd>
        </div>`
      : '';
    const age = daysSince(tip.updatedAt);
    const stale = age > STALE_DAYS;
    $('tipView').innerHTML = `
      <dl class="tip-list">${rows}${mapcodeHint}</dl>
      ${parkingSpotsHtml(tip.parkingSpots)}
      <div class="tip-foot${stale ? ' is-stale' : ''}">
        <p>정보 확인일 <strong>${tip.updatedAt}</strong> (${age <= 0 ? '오늘' : `${age}일 전`})${
          tip.source === 'demo' ? ' · 샘플 정보' : ''
        }${stale ? ' · 출발 전 다시 확인하세요' : ''}</p>
        <div class="tip-foot__actions">
          <a class="btn-sm" href="${searchUrl(item)}" target="_blank" rel="noopener">🔎 최신 정보 검색</a>
          <button type="button" class="btn-sm" data-tip="verify">✓ 오늘 확인함</button>
        </div>
      </div>`;
  }

  function parkingSpotsHtml(spots) {
    if (!spots?.length) return '';
    return `
      <section class="spots" aria-label="대체 주차장">
        <h3 class="spots__title">🅿️ 대체 주차장 <small>만차일 때 · ${spots.length}곳</small></h3>
        <ol class="spots__list">
          ${spots
            .map(
              (p) => `
            <li class="spot">
              <div class="spot__head">
                <strong class="spot__name">${escapeHtml(p.name)}</strong>
                <span class="spot__badge${p.is24h ? '' : ' is-off'}">${p.is24h ? '24시간' : '24시간 아님'}</span>
              </div>
              ${p.maxFee ? `<p class="spot__line"><b>최대요금</b> ${escapeHtml(p.maxFee)}</p>` : ''}
              ${p.fee ? `<p class="spot__line"><b>요금</b> ${escapeHtml(p.fee)}</p>` : ''}
              <a class="btn-sm spot__map" href="${escapeHtml(isHttp(p.mapUrl) ? p.mapUrl : gmapSearch(p.name))}"
                target="_blank" rel="noopener">구글 지도 ↗</a>
            </li>`
            )
            .join('')}
        </ol>
      </section>`;
  }

  function spotRowHtml(p = {}, i) {
    return `
      <div class="spot-edit" data-spot>
        <div class="spot-edit__top">
          <span class="spot-edit__no">${i + 1}</span>
          <input type="text" data-k="name" value="${escapeHtml(p.name ?? '')}" placeholder="주차장 이름" aria-label="주차장 이름" />
          <label class="spot-edit__24"><input type="checkbox" data-k="is24h" ${p.is24h ? 'checked' : ''} /> 24시간</label>
          <button type="button" class="icon-btn" data-spot-remove aria-label="주차장 삭제">✕</button>
        </div>
        <label class="spot-edit__f"><span>최대요금</span><input type="text" data-k="maxFee" value="${escapeHtml(p.maxFee ?? '')}" placeholder="예: 24시간 최대 ¥800" /></label>
        <label class="spot-edit__f"><span>요금</span><input type="text" data-k="fee" value="${escapeHtml(p.fee ?? '')}" placeholder="예: 30분 ¥100" /></label>
        <label class="spot-edit__f"><span>지도</span><input type="url" data-k="mapUrl" value="${escapeHtml(p.mapUrl ?? '')}" placeholder="구글 지도 링크 (비우면 이름으로 검색)" /></label>
      </div>`;
  }

  function readSpots() {
    return [...$('tipFields').querySelectorAll('[data-spot]')].map((row) => {
      const v = (k) => row.querySelector(`[data-k="${k}"]`);
      return {
        name: v('name').value.trim(),
        is24h: v('is24h').checked,
        maxFee: v('maxFee').value.trim(),
        fee: v('fee').value.trim(),
        mapUrl: v('mapUrl').value.trim(),
      };
    });
  }

  function renderSpotEditor(spots) {
    const max = window.MAX_PARKING_SPOTS;
    $('spotEditor').innerHTML =
      spots.map(spotRowHtml).join('') +
      (spots.length < max
        ? `<button type="button" class="btn btn--ghost spot-add" data-spot-add>+ 주차장 추가 (${spots.length}/${max})</button>`
        : `<p class="muted">최대 ${max}곳까지 등록할 수 있습니다.</p>`);
  }

  function renderTipForm() {
    const tip = tipItem().tip || {};
    $('tipFields').innerHTML = window.TIP_FIELDS.map((f) => {
      const id = `tip-${f.key}`;
      const value = escapeHtml(tip[f.key] ?? '');
      const input = TIP_SINGLE_LINE.includes(f.key)
        ? `<input type="text" id="${id}" name="${f.key}" value="${value}" placeholder="${TIP_PLACEHOLDERS[f.key]}" />`
        : `<textarea id="${id}" name="${f.key}" rows="${f.key === 'tips' ? 3 : 1}" placeholder="${TIP_PLACEHOLDERS[f.key]}">${value}</textarea>`;
      const extra =
        f.key === 'mapcode'
          ? `<a class="tip-link" href="${mapcodeSearchUrl(tipItem())}" target="_blank" rel="noopener">🔎 맵코드 검색</a>`
          : '';
      return `<label class="field"><span class="field__label">${f.icon} ${f.label} ${extra}</span>${input}</label>`;
    }).join('') +
      `<fieldset class="field spot-fieldset">
        <legend class="field__label">🅿️ 대체 주차장 (최대 ${window.MAX_PARKING_SPOTS}곳 · 구글 지도 링크)</legend>
        <div id="spotEditor"></div>
      </fieldset>`;
    renderSpotEditor(tip.parkingSpots ? tip.parkingSpots.map((p) => ({ ...p })) : []);
    $('tipFields').querySelectorAll('textarea').forEach(autosize);
  }

  // 내용 길이에 맞춰 textarea 높이 조절 (긴 기존 TIP 이 잘리지 않도록)
  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  function setTipMode(mode) {
    const editing = mode === 'edit';
    $('tipView').hidden = editing;
    $('tipForm').hidden = !editing;
    $('btnTipEdit').hidden = editing;
    if (editing) {
      $('btnTipDelete').hidden = true;
      renderTipForm(); // 폼이 보이는 상태에서 렌더해야 autosize 높이 계산이 맞음
      $('tipFields').querySelector('textarea, input')?.focus();
    } else {
      renderTipView();
    }
  }

  function openTip(item) {
    tipItemId = item.id;
    setTipMode('view');
    $('tipDialog').showModal();
    $('tipDialog').querySelector('.dialog__body').scrollTop = 0;
  }

  function onTipSubmit(e) {
    e.preventDefault();
    const item = tipItem();
    const tip = {};
    window.TIP_FIELDS.forEach((f) => {
      const v = $(`tip-${f.key}`).value.trim();
      if (v) tip[f.key] = v;
    });
    const spots = readSpots()
      .filter((p) => p.name || p.mapUrl)
      .slice(0, window.MAX_PARKING_SPOTS)
      .map((p) => ({ ...p, name: p.name || '주차장', mapUrl: isHttp(p.mapUrl) ? p.mapUrl : '' }));
    if (spots.length) tip.parkingSpots = spots;
    if (!hasTip(tip)) {
      // 모든 칸을 비우고 저장하면 삭제로 처리
      if (hasTip(item.tip)) deleteTip(false);
      setTipMode('view');
      return;
    }
    item.tip = { ...tip, updatedAt: today(), source: 'user' };
    delete item.tipDeleted;
    save();
    setTipMode('view');
    renderTimeline();
    toast('TIP을 저장했습니다.');
  }

  function deleteTip(ask = true) {
    const item = tipItem();
    if (ask && !confirm(`'${item.title}' 의 TIP을 삭제할까요?`)) return;
    delete item.tip;
    item.tipDeleted = true; // 샘플 TIP 자동 복원 방지
    save();
    renderTipView();
    renderTimeline();
    toast('TIP을 삭제했습니다.');
  }

  function bindTipEvents() {
    const dialog = $('tipDialog');
    $('btnTipEdit').addEventListener('click', () => setTipMode('edit'));
    $('btnTipDelete').addEventListener('click', () => deleteTip());
    $('btnTipCancel').addEventListener('click', () => setTipMode('view'));
    $('tipForm').addEventListener('submit', onTipSubmit);
    $('tipFields').addEventListener('input', (e) => e.target.matches('textarea') && autosize(e.target));
    $('tipFields').addEventListener('click', (e) => {
      if (e.target.closest('[data-spot-add]')) {
        renderSpotEditor([...readSpots(), { is24h: true }]);
        $('spotEditor').querySelector('[data-spot]:last-of-type [data-k="name"]')?.focus();
      }
      const remove = e.target.closest('[data-spot-remove]');
      if (remove) {
        const rows = [...$('spotEditor').querySelectorAll('[data-spot]')];
        renderSpotEditor(readSpots().filter((_, i) => i !== rows.indexOf(remove.closest('[data-spot]'))));
      }
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) return dialog.close();
      const action = e.target.closest('[data-tip]')?.dataset.tip;
      if (action === 'edit') setTipMode('edit');
      if (action === 'copy') {
        const value = e.target.closest('[data-value]').dataset.value;
        navigator.clipboard?.writeText(value).then(
          () => toast(`맵코드 ${value} 를 복사했습니다.`),
          () => toast('복사하지 못했습니다. 길게 눌러 직접 복사해주세요.')
        );
      }
      if (action === 'verify') {
        tipItem().tip.updatedAt = today();
        save();
        renderTipView();
        toast('정보 확인일을 오늘로 갱신했습니다.');
      }
    });
  }

  // ---------- 이벤트 ----------
  function bindEvents() {
    $('scheduleForm').addEventListener('submit', onSubmit);

    $('fTitle').addEventListener('input', () => {
      if ($('fTitle').value.trim()) {
        $('titleError').hidden = true;
        $('fTitle').classList.remove('is-invalid');
      }
    });

    $('fMemo').addEventListener('input', () => {
      $('memoCount').textContent = `${$('fMemo').value.length}/100`;
    });

    $('fCategory').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      selectedCategory = btn.dataset.cat;
      renderCategoryBadges();
    });

    $('btnCancelEdit').addEventListener('click', () => {
      resetForm();
      closeSheet();
    });

    $('timelineList').addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action || action === 'toggle') return;
      const id = e.target.closest('.card').dataset.id;
      const item = plan.schedules.find((s) => s.id === id);
      if (action === 'delete') {
        if (!confirm(`'${item.title}' 일정을 삭제할까요?`)) return;
        plan.schedules = plan.schedules.filter((s) => s.id !== id);
        if ($('fId').value === id) resetForm();
        save();
        renderTimeline();
        toast('일정을 삭제했습니다.');
      } else if (action === 'tip') {
        openTip(item);
      } else if (action === 'edit') {
        fillForm(item);
      }
    });

    $('timelineList').addEventListener('change', (e) => {
      if (e.target.dataset.action !== 'toggle') return;
      const item = plan.schedules.find((s) => s.id === e.target.closest('.card').dataset.id);
      item.isCompleted = e.target.checked;
      save();
      renderTimeline();
    });

    $('btnAddDay').addEventListener('click', () => {
      plan.totalDays += 1;
      plan.endDate = toYmd(dateOfDay(plan.totalDays));
      currentDay = plan.totalDays;
      save();
      resetForm();
      render();
      toast(`Day ${currentDay} 를 추가했습니다.`);
    });

    $('btnReset').addEventListener('click', () => {
      if (!confirm('현재 일정을 모두 지우고 샘플 데이터(이시가키 일정)로 초기화할까요?')) return;
      plan = window.createDemoPlan();
      currentDay = 1;
      save();
      resetForm();
      render();
      toast('샘플 데이터를 불러왔습니다.');
    });

    const dialog = $('summaryDialog');
    $('btnSummary').addEventListener('click', () => {
      renderSummary();
      dialog.showModal();
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
      const go = e.target.closest('[data-goto]');
      if (go) {
        currentDay = Number(go.dataset.goto);
        save();
        dialog.close();
        resetForm();
        render();
      }
    });

    $('btnFab').addEventListener('click', () => {
      resetForm();
      openSheet();
      $('fTitle').focus();
    });
    $('btnCloseSheet').addEventListener('click', closeSheet);
    $('sheetBackdrop').addEventListener('click', closeSheet);
    mobileQuery.addEventListener('change', closeSheet);
  }

  // ---------- 초기화 ----------
  bindEvents();
  bindTipEvents();
  resetForm();
  render();
  save();
})();
