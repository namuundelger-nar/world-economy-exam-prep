/* Global Economy — reusable quiz engine. No dependencies.
   Usage:
     GE.mcQuiz('#id', 'Title', [ {q, opts:[...], a: <index>, why, img?} ], {shuffle:true, img?, caption?})
       - opts.img  : image shown once under the title (study the graph, then answer)
       - item.img  : image shown with a single question
     GE.flashcards('#id', [ {front, back} ])
     GE.grouping('#id', 'Title', ['CatA','CatB'], [ {item, cat} ])
     GE.imgReveal('#id', { src, title, prompt, typed?, spots:[ {x,y,w,h,label, accept?:[..]} ] })
       - occluder boxes (x/y/w/h in %) sit over a graph's labels.
       - typed (default true): an answer sheet under the figure lets you TYPE each
         hidden label (fuzzy-matched); "Show" gives up on one; toggle to click-reveal.
       - accept: extra strings counted as correct besides the label itself.
       Needs assets/imgquiz.css.
     GE.typeQuiz('#id', 'Title', [ {q, a, accept?:[..], opts?:[..], ai?, why?, img?} ], {img?, caption?})
       - write-the-answer quiz. "Choices" flips a question to multiple choice
         (ai = index of correct option, default 0). "Show answer" gives up.
     GE.tfQuiz('#id', 'Title', [ {s, t:true|false, why} ], {shuffle:true})
     GE.revealQ('#id', 'Title', [ {q, a} ])
       - surprise/essay style: show the model answer, then self-grade ✓/✗.
*/
window.GE = (function () {
  function shuffleArr(a){ for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; }

  /* ---------- fuzzy answer matching (typed answers) ---------- */
  const STOPRE = /\b(the|a|an|and|of|to|in|for|on|by|or)\b/g;
  function norm(s){
    return String(s)
      .replace(/<[^>]*>/g,' ')
      .replace(/&amp;/gi,' and ').replace(/&[a-z#0-9]+;/gi,' ')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[’']/g,'')
      .replace(/[^a-z0-9]+/g,' ')
      .replace(/\s+/g,' ').trim();
  }
  function answerMatch(input, answers){
    const I = norm(input); if(!I) return false;
    const Is = I.replace(STOPRE,' ').replace(/\s+/g,' ').trim();
    const Ic = Is.replace(/ /g,'');
    return answers.some(ans=>{
      const A = norm(ans); if(!A) return false;
      if(A===I) return true;
      const As = A.replace(STOPRE,' ').replace(/\s+/g,' ').trim();
      const Ac = As.replace(/ /g,'');
      if(Ac===Ic) return true;
      if(Ic.length>=4 && Ac.includes(Ic) && Ic.length >= Ac.length*0.45) return true; // typed enough of it
      if(Ac.length>=4 && Ic.includes(Ac)) return true;                                // typed more than needed
      return false;
    });
  }
  function acceptList(x){
    const out=[];
    const main = x.label!==undefined ? x.label : x.a;
    if(main){
      out.push(main);
      const noParen = String(main).replace(/\([^)]*\)/g,' ').trim();
      if(noParen && noParen!==main) out.push(noParen);
    }
    (x.accept||[]).forEach(a=>out.push(a));
    return out;
  }

  function mcQuiz(sel, title, questions, opts) {
    opts = opts || {};
    const root = document.querySelector(sel);
    if (!root) return;
    const qs = opts.shuffle ? shuffleArr(questions.slice()) : questions.slice();
    let answered = 0, correct = 0;
    root.className = 'quiz';
    const figHtml = opts.img
      ? `<figure class="quiz-fig"><img src="${opts.img}" alt="${title}">${
          opts.caption ? `<figcaption>${opts.caption}</figcaption>` : ''}</figure>`
      : '';
    root.innerHTML = `<div class="quiz-head"><span class="quiz-title">${title}</span>
      <span class="quiz-score">0 / ${qs.length}</span></div>${figHtml}<div class="qlist"></div>
      <div class="quiz-controls"><span class="quiz-result"></span></div>`;
    const list = root.querySelector('.qlist');
    const scoreEl = root.querySelector('.quiz-score');
    const resEl = root.querySelector('.quiz-result');

    qs.forEach((item, qi) => {
      const qEl = document.createElement('div');
      qEl.className = 'q';
      const stem = `<div class="q-stem"><span class="n">${qi+1}.</span>${item.q}</div>`;
      const imgHtml = item.img ? `<figure class="q-fig"><img src="${item.img}" alt=""></figure>` : '';
      const optWrap = document.createElement('div');
      optWrap.className = 'opts';
      qEl.innerHTML = stem + imgHtml;
      qEl.appendChild(optWrap);
      const why = document.createElement('div');
      why.className = 'why';
      why.innerHTML = item.why ? `<b>Why:</b> ${item.why}` : '';
      qEl.appendChild(why);
      list.appendChild(qEl);

      // preserve original answer while shuffling option order
      const order = item.opts.map((t,i)=>({t,i}));
      if (opts.shuffle) shuffleArr(order);
      order.forEach(o => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerHTML = `${o.t}<span class="tick"></span>`;
        b.onclick = () => {
          if (qEl.classList.contains('answered')) return;
          qEl.classList.add('answered');
          answered++;
          const isRight = o.i === item.a;
          if (isRight) { correct++; b.classList.add('correct'); b.querySelector('.tick').textContent='✓'; }
          else {
            b.classList.add('wrong'); b.querySelector('.tick').textContent='✗';
            // reveal correct
            [...optWrap.children].forEach((btn,idx)=>{
              if (order[idx].i === item.a){ btn.classList.add('correct'); btn.querySelector('.tick').textContent='✓'; }
            });
          }
          optWrap.querySelectorAll('.opt').forEach(x=>x.disabled=true);
          if (item.why) why.classList.add('show');
          scoreEl.textContent = `${correct} / ${qs.length}`;
          if (answered === qs.length) finish();
        };
        optWrap.appendChild(b);
      });
    });

    function finish(){
      const pct = Math.round(correct/qs.length*100);
      resEl.textContent = `${pct}% — ${pct>=80?'exam-ready':pct>=60?'almost there':'review this'}`;
      resEl.classList.add(pct>=80?'pass':pct>=60?'mid':'');
    }
  }

  function flashcards(sel, cards) {
    const root = document.querySelector(sel);
    if (!root) return;
    root.className = 'cards';
    cards.forEach(c => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<div class="card-in"><div class="card-f">${c.front}</div>
        <div class="card-b">${c.back}</div></div>`;
      el.onclick = () => el.classList.toggle('flip');
      root.appendChild(el);
    });
  }

  function grouping(sel, title, cats, items) {
    const root = document.querySelector(sel);
    if (!root) return;
    root.className = 'quiz';
    const shuffled = shuffleArr(items.slice());
    root.innerHTML = `<div class="quiz-head"><span class="quiz-title">${title}</span>
      <span class="quiz-score"></span></div><div class="glist"></div>
      <div class="quiz-controls"><button class="btn">Check answers</button>
      <span class="quiz-result"></span></div>`;
    const glist = root.querySelector('.glist');
    shuffled.forEach(it => {
      const row = document.createElement('div');
      row.className = 'group-item';
      const opts = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
      row.innerHTML = `<span>${it.item}</span><select><option value="">— choose —</option>${opts}</select>`;
      row.dataset.cat = it.cat;
      glist.appendChild(row);
    });
    root.querySelector('.btn').onclick = () => {
      let ok = 0;
      glist.querySelectorAll('.group-item').forEach(row => {
        const sel = row.querySelector('select');
        row.classList.remove('ok','no');
        if (sel.value === row.dataset.cat) { row.classList.add('ok'); ok++; }
        else row.classList.add('no');
      });
      const total = shuffled.length;
      const res = root.querySelector('.quiz-result');
      const pct = Math.round(ok/total*100);
      res.textContent = `${ok} / ${total} correct`;
      res.className = 'quiz-result ' + (pct>=80?'pass':pct>=60?'mid':'');
    };
  }

  function imgReveal(sel, cfg) {
    const root = document.querySelector(sel);
    if (!root) return;
    cfg = cfg || {};
    const spots = cfg.spots || [];
    const typed = cfg.typed !== false;
    root.className = 'imgq';
    root.innerHTML = `<div class="imgq-head">
        <span class="quiz-title">${cfg.title || 'Name the hidden parts'}</span>
        <span class="imgq-score"></span>
        <span class="imgq-btns">${typed ? '<button type="button" class="btn imgq-mode">Click-reveal mode</button>' : ''}
        <button type="button" class="btn imgq-toggle">Reveal all</button></span>
      </div>
      ${cfg.prompt ? `<p class="imgq-prompt">${cfg.prompt}</p>` : ''}
      <figure class="imgq-fig"><img src="${cfg.src}" alt="${cfg.title || ''}">
        <div class="imgq-layer"></div></figure>
      ${typed ? '<ol class="imgq-sheet"></ol>' : ''}`;
    const layer = root.querySelector('.imgq-layer');
    const sheet = root.querySelector('.imgq-sheet');
    const scoreEl = root.querySelector('.imgq-score');
    let mode = typed ? 'type' : 'click';
    const rows = [];

    function lockRow(li){ li.querySelectorAll('button.btn').forEach(x=>x.disabled=true); }
    function score(){
      if (!typed) return;
      const ok = rows.filter(r=>r.classList.contains('ok')).length;
      scoreEl.textContent = `${ok} / ${spots.length} typed`;
      if (rows.every(r=>r.classList.contains('ok')||r.classList.contains('shown'))){
        const pct = Math.round(ok/spots.length*100);
        scoreEl.textContent += pct>=80 ? ' — exam-ready' : pct>=60 ? ' — almost' : ' — review this';
      }
    }

    spots.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'spot';
      b.style.left = s.x + '%';
      b.style.top = s.y + '%';
      b.style.width = (s.w || 6) + '%';
      b.style.height = (s.h || 5) + '%';
      b.innerHTML = `<span class="spot-q">${i + 1}</span><span class="spot-a">${s.label}</span>`;
      b.onclick = () => {
        if (mode === 'type' && !b.classList.contains('revealed')) {
          const inp = rows[i] && rows[i].querySelector('input');
          if (inp && !inp.disabled) {
            inp.focus();
            rows[i].classList.add('hilite');
            setTimeout(()=>rows[i].classList.remove('hilite'), 800);
          }
          return;
        }
        b.classList.toggle('revealed');
      };
      layer.appendChild(b);

      if (typed) {
        const li = document.createElement('li');
        li.className = 'sheet-row';
        li.innerHTML = `<span class="sheet-n">${i+1}</span>
          <input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="label ${i+1}…">
          <button type="button" class="btn sheet-check">Check</button>
          <button type="button" class="btn sheet-give">Show</button>
          <span class="sheet-a">${s.label}</span>`;
        const inp = li.querySelector('input');
        const doCheck = () => {
          if (inp.disabled) return;
          if (answerMatch(inp.value, acceptList(s))) {
            li.classList.add('ok');
            inp.disabled = true;
            b.classList.add('revealed');
            lockRow(li); score();
          } else {
            li.classList.add('no');
            setTimeout(()=>li.classList.remove('no'), 600);
          }
        };
        li.querySelector('.sheet-check').onclick = doCheck;
        inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); doCheck(); } });
        li.querySelector('.sheet-give').onclick = () => {
          if (inp.disabled) return;
          li.classList.add('shown');
          inp.disabled = true;
          b.classList.add('revealed');
          lockRow(li); score();
        };
        sheet.appendChild(li);
        rows.push(li);
      }
    });
    score();

    const modeBtn = root.querySelector('.imgq-mode');
    if (modeBtn) modeBtn.onclick = () => {
      mode = (mode === 'type') ? 'click' : 'type';
      root.classList.toggle('imgq-clickmode', mode === 'click');
      modeBtn.textContent = mode === 'type' ? 'Click-reveal mode' : 'Typing mode';
    };

    const toggle = root.querySelector('.imgq-toggle');
    toggle.onclick = () => {
      const anyHidden = [...layer.children].some(c => !c.classList.contains('revealed'));
      layer.querySelectorAll('.spot').forEach(c => c.classList.toggle('revealed', anyHidden));
      if (typed && anyHidden) {
        rows.forEach(li => {
          if (!li.classList.contains('ok') && !li.classList.contains('shown')) {
            li.classList.add('shown');
            li.querySelector('input').disabled = true;
            lockRow(li);
          }
        });
        score();
      }
      toggle.textContent = anyHidden ? 'Hide all' : 'Reveal all';
    };
  }

  function typeQuiz(sel, title, items, opts) {
    opts = opts || {};
    const root = document.querySelector(sel);
    if (!root) return;
    root.className = 'quiz typeq';
    const figHtml = opts.img
      ? `<figure class="quiz-fig"><img src="${opts.img}" alt="${title}">${
          opts.caption ? `<figcaption>${opts.caption}</figcaption>` : ''}</figure>`
      : '';
    root.innerHTML = `<div class="quiz-head"><span class="quiz-title">${title}</span>
      <span class="quiz-score">0 / ${items.length}</span></div>${figHtml}<div class="qlist"></div>
      <div class="quiz-controls"><span class="quiz-result"></span></div>`;
    const list = root.querySelector('.qlist');
    const scoreEl = root.querySelector('.quiz-score');
    const resEl = root.querySelector('.quiz-result');
    let correct = 0, answered = 0;

    items.forEach((item, qi) => {
      const qEl = document.createElement('div');
      qEl.className = 'q';
      qEl.innerHTML = `<div class="q-stem"><span class="n">${qi+1}.</span>${item.q}</div>`
        + (item.img ? `<figure class="q-fig"><img src="${item.img}" alt=""></figure>` : '');
      const row = document.createElement('div');
      row.className = 'type-row';
      row.innerHTML = `<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type your answer…">
        <button type="button" class="btn t-check">Check</button>
        ${item.opts ? '<button type="button" class="btn t-mc">Choices</button>' : ''}
        <button type="button" class="btn t-show">Show answer</button>`;
      const ansEl = document.createElement('div');
      ansEl.className = 'type-ans';
      ansEl.innerHTML = `<b>Answer:</b> ${item.a}`;
      const why = document.createElement('div');
      why.className = 'why';
      if (item.why) why.innerHTML = `<b>Why:</b> ${item.why}`;
      qEl.appendChild(row); qEl.appendChild(ansEl); qEl.appendChild(why);
      list.appendChild(qEl);

      const inp = row.querySelector('input');
      function settle(ok, gaveUp){
        if (qEl.classList.contains('answered')) return;
        qEl.classList.add('answered', ok ? 'got' : (gaveUp ? 'gave' : 'missed'));
        answered++;
        if (ok) correct++;
        inp.disabled = true;
        row.querySelectorAll('.btn').forEach(x=>x.disabled=true);
        qEl.querySelectorAll('.opt').forEach(x=>x.disabled=true);
        ansEl.classList.add('show');
        if (item.why) why.classList.add('show');
        scoreEl.textContent = `${correct} / ${items.length}`;
        if (answered === items.length) {
          const pct = Math.round(correct/items.length*100);
          resEl.textContent = `${pct}% — ${pct>=80?'exam-ready':pct>=60?'almost there':'review this'}`;
          resEl.classList.add(pct>=80?'pass':pct>=60?'mid':'');
        }
      }
      const doCheck = () => {
        if (inp.disabled) return;
        if (answerMatch(inp.value, acceptList(item))) settle(true);
        else { row.classList.add('no'); setTimeout(()=>row.classList.remove('no'), 600); }
      };
      row.querySelector('.t-check').onclick = doCheck;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); doCheck(); } });
      row.querySelector('.t-show').onclick = () => settle(false, true);

      const mcBtn = row.querySelector('.t-mc');
      if (mcBtn) mcBtn.onclick = () => {
        mcBtn.disabled = true;
        inp.disabled = true;
        row.querySelector('.t-check').disabled = true;
        const wrap = document.createElement('div');
        wrap.className = 'opts';
        const ai = item.ai !== undefined ? item.ai : 0;
        const order = item.opts.map((t,i)=>({t,i}));
        shuffleArr(order);
        order.forEach(o => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML = `${o.t}<span class="tick"></span>`;
          b.onclick = () => {
            if (qEl.classList.contains('answered')) return;
            const right = o.i === ai;
            if (right) { b.classList.add('correct'); b.querySelector('.tick').textContent='✓'; }
            else {
              b.classList.add('wrong'); b.querySelector('.tick').textContent='✗';
              [...wrap.children].forEach((btn,idx)=>{
                if (order[idx].i === ai){ btn.classList.add('correct'); btn.querySelector('.tick').textContent='✓'; }
              });
            }
            settle(right);
          };
          wrap.appendChild(b);
        });
        qEl.insertBefore(wrap, ansEl);
      };
    });
  }

  function tfQuiz(sel, title, items, opts) {
    opts = opts || {};
    const root = document.querySelector(sel);
    if (!root) return;
    const qs = opts.shuffle ? shuffleArr(items.slice()) : items.slice();
    root.className = 'quiz tfq';
    root.innerHTML = `<div class="quiz-head"><span class="quiz-title">${title}</span>
      <span class="quiz-score">0 / ${qs.length}</span></div><div class="qlist"></div>
      <div class="quiz-controls"><span class="quiz-result"></span></div>`;
    const list = root.querySelector('.qlist');
    const scoreEl = root.querySelector('.quiz-score');
    const resEl = root.querySelector('.quiz-result');
    let correct = 0, answered = 0;

    qs.forEach((item, qi) => {
      const qEl = document.createElement('div');
      qEl.className = 'q';
      qEl.innerHTML = `<div class="q-stem"><span class="n">${qi+1}.</span>${item.s}</div>`;
      const btns = document.createElement('div');
      btns.className = 'tf-btns';
      const why = document.createElement('div');
      why.className = 'why';
      if (item.why) why.innerHTML = `<b>Why:</b> ${item.why}`;
      [['True', true], ['False', false]].forEach(([txt, val]) => {
        const b = document.createElement('button');
        b.className = 'opt tf-opt';
        b.innerHTML = `${txt}<span class="tick"></span>`;
        b.onclick = () => {
          if (qEl.classList.contains('answered')) return;
          qEl.classList.add('answered');
          answered++;
          const right = val === item.t;
          if (right) { correct++; b.classList.add('correct'); b.querySelector('.tick').textContent='✓'; }
          else {
            b.classList.add('wrong'); b.querySelector('.tick').textContent='✗';
            [...btns.children].forEach((btn,idx)=>{ if ((idx===0)===item.t){ btn.classList.add('correct'); btn.querySelector('.tick').textContent='✓'; } });
          }
          btns.querySelectorAll('.opt').forEach(x=>x.disabled=true);
          if (item.why) why.classList.add('show');
          scoreEl.textContent = `${correct} / ${qs.length}`;
          if (answered === qs.length) {
            const pct = Math.round(correct/qs.length*100);
            resEl.textContent = `${pct}% — ${pct>=80?'exam-ready':pct>=60?'almost there':'review this'}`;
            resEl.classList.add(pct>=80?'pass':pct>=60?'mid':'');
          }
        };
        btns.appendChild(b);
      });
      qEl.appendChild(btns); qEl.appendChild(why);
      list.appendChild(qEl);
    });
  }

  function revealQ(sel, title, items) {
    const root = document.querySelector(sel);
    if (!root) return;
    root.className = 'quiz revq';
    root.innerHTML = `<div class="quiz-head"><span class="quiz-title">${title}</span>
      <span class="quiz-score">0 / ${items.length} self-marked</span></div><div class="qlist"></div>
      <div class="quiz-controls"><span class="quiz-result"></span></div>`;
    const list = root.querySelector('.qlist');
    const scoreEl = root.querySelector('.quiz-score');
    const resEl = root.querySelector('.quiz-result');
    let correct = 0, answered = 0;

    items.forEach((item, qi) => {
      const qEl = document.createElement('div');
      qEl.className = 'q rev';
      qEl.innerHTML = `<div class="q-stem"><span class="n">${qi+1}.</span>${item.q}</div>`;
      const row = document.createElement('div');
      row.className = 'rev-row';
      row.innerHTML = `<button type="button" class="btn rev-show">Show answer</button>`;
      const ans = document.createElement('div');
      ans.className = 'type-ans';
      ans.innerHTML = `<b>Answer:</b> ${item.a}`;
      const grade = document.createElement('div');
      grade.className = 'rev-grade';
      grade.innerHTML = `<span class="rev-ask">Did you have it? (say it out loud <em>before</em> revealing)</span>
        <button type="button" class="btn rev-yes">✓ Knew it</button>
        <button type="button" class="btn rev-no">✗ Missed it</button>`;
      qEl.appendChild(row); qEl.appendChild(ans); qEl.appendChild(grade);
      list.appendChild(qEl);

      row.querySelector('.rev-show').onclick = () => {
        ans.classList.add('show');
        grade.classList.add('show');
        row.querySelector('.rev-show').disabled = true;
      };
      function mark(ok){
        if (qEl.classList.contains('answered')) return;
        qEl.classList.add('answered', ok ? 'got' : 'missed');
        answered++;
        if (ok) correct++;
        grade.querySelectorAll('.btn').forEach(b=>b.disabled=true);
        scoreEl.textContent = `${correct} / ${items.length} self-marked`;
        if (answered === items.length) {
          const pct = Math.round(correct/items.length*100);
          resEl.textContent = `${pct}% — ${pct>=80?'exam-ready':pct>=60?'almost there':'review this'}`;
          resEl.classList.add(pct>=80?'pass':pct>=60?'mid':'');
        }
      }
      grade.querySelector('.rev-yes').onclick = () => mark(true);
      grade.querySelector('.rev-no').onclick = () => mark(false);
    });
  }

  return { mcQuiz, flashcards, grouping, imgReveal, typeQuiz, tfQuiz, revealQ, answerMatch };
})();
