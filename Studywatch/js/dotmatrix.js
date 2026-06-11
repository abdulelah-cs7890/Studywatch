/* Dot-matrix countdown — Apple-StandBy style dotted digits */
(function () {
  // 5 wide x 7 tall bitmaps
  const FONT = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100']
  };

  function buildDigit(parent) {
    const slot = document.createElement('div');
    slot.className = 'dm-digit';
    const dots = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        const d = document.createElement('span');
        d.className = 'dm-dot';
        slot.appendChild(d);
        dots.push(d);
      }
    }
    parent.appendChild(slot);
    return dots;
  }

  function buildColon(parent) {
    const slot = document.createElement('div');
    slot.className = 'dm-colon';
    const top = document.createElement('span');
    const bot = document.createElement('span');
    top.className = 'dm-dot';
    bot.className = 'dm-dot';
    slot.appendChild(top);
    slot.appendChild(bot);
    parent.appendChild(slot);
    return [top, bot];
  }

  function setDigit(dots, ch) {
    const map = FONT[ch] || FONT['0'];
    for (let r = 0; r < 7; r++) {
      const row = map[r];
      for (let c = 0; c < 5; c++) {
        const i = r * 5 + c;
        dots[i].classList.toggle('on', row[c] === '1');
      }
    }
  }

  function createClock(container) {
    container.innerHTML = '';
    const d0 = buildDigit(container);
    const d1 = buildDigit(container);
    const colon = buildColon(container);
    const d2 = buildDigit(container);
    const d3 = buildDigit(container);

    return {
      setTime(totalSeconds) {
        totalSeconds = Math.max(0, Math.round(totalSeconds));
        const m = Math.min(99, Math.floor(totalSeconds / 60));
        const s = totalSeconds % 60;
        const mm = String(m).padStart(2, '0');
        const ss = String(s).padStart(2, '0');
        setDigit(d0, mm[0]);
        setDigit(d1, mm[1]);
        setDigit(d2, ss[0]);
        setDigit(d3, ss[1]);
      },
      setColon(on) {
        colon[0].classList.toggle('on', on);
        colon[1].classList.toggle('on', on);
      }
    };
  }

  window.DotMatrix = { createClock };
})();
