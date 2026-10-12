(function () {
  'use strict';

  const STORAGE_KEY = 'travel-planner:ishigaki';
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const $ = (id) => document.getElementById(id);

  let plan = load();
  let currentDay = 1;
  let selectedCategory = 'TOUR';

  // ---------- 상태 저장 ----------
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.schedules)) return saved;
    } catch (e) {
      /* 손상된 데이터는 샘플로 대체 */
    }
    return window.createDemoPlan();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
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
  resetForm();
  render();
  save();
})();
