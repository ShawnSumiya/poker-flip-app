// カード生成とフリップ挙動を提供

export const suits = ['spade', 'heart', 'diamond', 'club'];
export const suitSymbols = { spade: '♠', heart: '♥', diamond: '♦', club: '♣' };

export function getRankText(rank) {
  if (rank === 1 || rank === 14) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function createCardElement(suit, rank) {
  const rankText = getRankText(rank);
  const cardDiv = document.createElement('div');
  cardDiv.className = `cute-card ${suit}`;
  cardDiv.innerHTML = `
    <div class="corner-top"><span class="rank">${rankText}</span></div>
    <div class="center-suit">${suitSymbols[suit]}</div>
    <div class="corner-bottom"><span class="rank">${rankText}</span></div>
  `;
  return cardDiv;
}

export function createFlippableCard(suit, rank, initiallyFaceDown = true) {
  const wrap = document.createElement('div');
  wrap.className = 'flip-wrap';

  const inner = document.createElement('div');
  inner.className = 'flip-inner';
  if (initiallyFaceDown) inner.classList.add('is-back');

  const front = document.createElement('div');
  front.className = 'card-face card-front';
  front.appendChild(createCardElement(suit, rank));

  const back = document.createElement('div');
  back.className = 'card-face card-back';

  inner.appendChild(front);
  inner.appendChild(back);
  wrap.appendChild(inner);

  // タッチ開始位置と時間を記録
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let isScrolling = false;
  
  // クリック/タッチでフリップ
  const handleFlip = (e) => {
    e.preventDefault();
    inner.classList.toggle('is-back');
  };
  
  // タッチ開始
  const handleTouchStart = (e) => {
    touchStartTime = Date.now();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isScrolling = false;
  };
  
  // タッチ移動（スクロール検知）
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // 移動距離が10px以上の場合、スクロールと判定
    if (deltaX > 10 || deltaY > 10) {
      isScrolling = true;
    }
  };
  
  // タッチ終了
  const handleTouchEnd = (e) => {
    const touchDuration = Date.now() - touchStartTime;
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // スクロールではなく、短時間のタップの場合のみフリップ
    if (!isScrolling && touchDuration < 500 && deltaX < 10 && deltaY < 10) {
      e.preventDefault();
      inner.classList.toggle('is-back');
    }
  };
  
  wrap.addEventListener('click', handleFlip);
  wrap.addEventListener('touchstart', handleTouchStart);
  wrap.addEventListener('touchmove', handleTouchMove);
  wrap.addEventListener('touchend', handleTouchEnd);

  return wrap;
}

// （バーン専用カードは削除）

export function dealRandomHand(count = 5) {
  const used = new Set();
  const cards = [];
  while (cards.length < count) {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = Math.floor(Math.random() * 13) + 1;
    const key = `${suit}-${rank}`;
    if (used.has(key)) continue;
    used.add(key);
    cards.push(createFlippableCard(suit, rank, true));
  }
  return cards;
}

export function flipAll(container) {
  container.querySelectorAll('.flip-inner').forEach(el => {
    el.classList.toggle('is-back');
  });
}


// ===== NLH Flipout: 簡易ゲーム進行と評価 =====
let gameState = {
  deck: [],         // [{suit, rank}]
  players: [],      // [{name, hole:[{suit,rank},{..}], seatEl}]
  community: [],    // 同上 5枚まで
  seatsEl: null,
  communityEl: null,
  statusEl: null,
  
};

function buildDeck() {
  const d = [];
  for (const s of suits) {
    for (let r = 1; r <= 13; r++) d.push({ suit: s, rank: r });
  }
  return d;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function dealCard() {
  return gameState.deck.pop();
}

// （焼き札描画は削除）

function renderCommunity(newFromIndex = 0) {
  const { communityEl } = gameState;
  if (!communityEl) return;
  communityEl.innerHTML = '';
  gameState.community.forEach((c, idx) => {
    // フロップ/ターン/リバーは表で置く（フリップ操作はしない）
    const wrap = document.createElement('div');
    wrap.className = 'flip-wrap';
    if (idx >= newFromIndex) {
      // 新規公開カードにアニメーション用クラス
      wrap.classList.add('newly-dealt');
    }
    const inner = document.createElement('div');
    inner.className = 'flip-inner';
    // 常に表向き
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    front.appendChild(createCardElement(c.suit, c.rank));
    const back = document.createElement('div');
    back.className = 'card-face card-back';
    inner.appendChild(front);
    inner.appendChild(back);
    // 表向き状態
    inner.classList.remove('is-back');
    wrap.appendChild(inner);
    communityEl.appendChild(wrap);
  });
}

function renderSeats() {
  const { seatsEl } = gameState;
  if (!seatsEl) return;
  seatsEl.innerHTML = '';
  
  // 人数に応じてクラスを設定（6人以上でも2列のまま）
  seatsEl.classList.remove('many-players');
  
  const zodiacEmojis = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐐','🐵','🐔','🐶','🐗'];
  const zodiacNames  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  gameState.players.forEach((p, idx) => {
    const seat = document.createElement('div');
    seat.className = 'seat';
    const name = document.createElement('div');
    name.className = 'name';
    const i = idx % zodiacEmojis.length;
    name.textContent = `${zodiacEmojis[i]}（${zodiacNames[i]}）`;
    const hole = document.createElement('div');
    hole.className = 'hole';

    // ホールカードは最初伏せておく
    p.hole.forEach(card => {
      hole.appendChild(createFlippableCard(card.suit, card.rank, true));
    });

    seat.appendChild(name);
    seat.appendChild(hole);
    p.seatEl = seat;
    seatsEl.appendChild(seat);
  });
}

function setStatus(text) {
  if (gameState.statusEl) gameState.statusEl.textContent = text;
}

export function startNewHand({ seatsEl, communityEl, statusEl, numPlayers = 6 }) {
  gameState.seatsEl = seatsEl;
  gameState.communityEl = communityEl;
  gameState.statusEl = statusEl;

  gameState.deck = shuffle(buildDeck());
  gameState.players = Array.from({ length: numPlayers }, () => ({ hole: [dealCard(), dealCard()], seatEl: null }));
  gameState.community = [];

  renderSeats();
  renderCommunity(0);
  setStatus('');
}

// 配り演出つき: ボードは出さず、ホールを1枚ずつ出現させる
export async function startNewHandAnimated({ seatsEl, communityEl, statusEl, numPlayers = 6, onDone } = {}) {
  startNewHand({ seatsEl, communityEl, statusEl, numPlayers });
  // いったんホールの中身を空にして、1枚ずつappendで演出
  const seatEls = Array.from(gameState.seatsEl.querySelectorAll('.seat'));
  seatEls.forEach(seat => {
    const hole = seat.querySelector('.hole');
    hole.innerHTML = '';
  });
  // 2枚×プレイヤー分をラウンドロビンで配る
  const rounds = 2;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      const seat = seatEls[i];
      const hole = seat.querySelector('.hole');
      const card = player.hole[r];
      const el = createFlippableCard(card.suit, card.rank, true);
      el.classList.add('dealing');
      hole.appendChild(el);
      await new Promise(res => setTimeout(res, 120));
    }
  }
  if (typeof onDone === 'function') onDone();
}

export function flipStreet(street) {
  if (!gameState.deck.length) return;
  const prevLen = gameState.community.length;
  if (street === 'flop' && gameState.community.length === 0) {
    // 焼き札省略
    gameState.community.push(dealCard(), dealCard(), dealCard());
  } else if (street === 'turn' && gameState.community.length === 3) {
    // 焼き札省略
    gameState.community.push(dealCard());
  } else if (street === 'river' && gameState.community.length === 4) {
    // 焼き札省略
    gameState.community.push(dealCard());
  }
  renderCommunity(prevLen);
  setStatus(`${street.toUpperCase()} を公開しました。`);
}

// 7枚(2+5)中ベスト5枚の強さを評価
function evaluateSeven(holes, community) {
  const cards = [...holes, ...community];
  
  // 7枚から5枚を選ぶ全組み合わせを生成して最強の手を探す
  function findBestHand() {
    const combinations = [];
    
    // 7枚から5枚を選ぶ組み合わせ生成
    function generateCombos(arr, start, current) {
      if (current.length === 5) {
        combinations.push([...current]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        generateCombos(arr, i + 1, current);
        current.pop();
      }
    }
    
    generateCombos(cards, 0, []);
    
    let best = null;
    let bestScore = -1;
    
    for (const combo of combinations) {
      const handEval = evaluateFiveCards(combo);
      const score = handEval.category * 1000 + (handEval.kickerRanks[0] || 0);
      if (score > bestScore) {
        bestScore = score;
        best = combo;
      } else if (score === bestScore && best) {
        // 同じスコアの場合、より詳細な比較
        const currentEval = evaluateFiveCards(best);
        if (compareHands(handEval, currentEval) > 0) {
          best = combo;
        }
      }
    }
    
    if (!best) {
      // フォールバック: 最初の5枚を使用
      best = cards.slice(0, 5);
    }
    return evaluateFiveCards(best);
  }
  
  // 5枚のカードを評価してスコアを返す
  function evaluateFiveCards(fiveCards) {
    const ranks = fiveCards.map(c => c.rank === 1 ? 14 : c.rank);
    const suits = fiveCards.map(c => c.suit);
    
    // ランクカウント
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    
    // スートカウント
    const suitCounts = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Math.max(...Object.values(suitCounts)) === 5;
    
    // ストレート判定
    const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
    let isStraight = false;
    if (sortedRanks.length === 5) {
      if (sortedRanks[4] - sortedRanks[0] === 4) {
        isStraight = true;
      } else if (sortedRanks[0] === 2 && sortedRanks[4] === 14 && 
                 sortedRanks[1] === 3 && sortedRanks[2] === 4 && sortedRanks[3] === 5) {
        // A-2-3-4-5（正確な判定）
        isStraight = true;
      }
    }
    
    // 役の判定
    let category = 0;
    if (isFlush && isStraight) {
      category = 8; // ストレートフラッシュ
    } else if (counts[0] === 4) {
      category = 7; // フォーカード
    } else if (counts[0] === 3 && counts[1] === 2) {
      category = 6; // フルハウス
    } else if (isFlush) {
      category = 5; // フラッシュ
    } else if (isStraight) {
      category = 4; // ストレート
    } else if (counts[0] === 3) {
      category = 3; // スリーカード
    } else if (counts[0] === 2 && counts[1] === 2) {
      category = 2; // ツーペア
    } else if (counts[0] === 2) {
      category = 1; // ワンペア
    } else {
      category = 0; // ハイカード
    }
    
    // キッカーランク（比較用）
    let kickerRanks;
    
    if (category === 4) {
      // ストレート: ハイカードで比較
      if (sortedRanks[0] === 2 && sortedRanks[4] === 14) {
        kickerRanks = [5]; // A-2-3-4-5のハイは5
      } else {
        kickerRanks = [sortedRanks[4]]; // 通常のストレートのハイ
      }
    } else if (category === 2) {
      // ツーペア: 高いペア、低いペア、キッカーの順
      const pairs = Object.entries(rankCounts).filter(([, count]) => count === 2)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      const kickers = Object.entries(rankCounts).filter(([, count]) => count === 1)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      kickerRanks = [...pairs, ...kickers];
    } else if (category === 1) {
      // ワンペア: ペア、キッカー3枚の順
      const pair = Object.entries(rankCounts).find(([, count]) => count === 2);
      const kickers = Object.entries(rankCounts).filter(([, count]) => count === 1)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      kickerRanks = [parseInt(pair[0]), ...kickers];
    } else {
      // その他: ランクの降順
      kickerRanks = [...ranks].sort((a, b) => b - a);
    }
    
    return { category, kickerRanks };
  }
  
  return findBestHand();
}

function compareHands(aEval, bEval) {
  if (aEval.category !== bEval.category) return bEval.category - aEval.category; // 降順（強い役が前）
  // 同カテゴリーならキッカー順比較（高いランクが強い）
  const len = Math.max(aEval.kickerRanks.length, bEval.kickerRanks.length);
  for (let i = 0; i < len; i++) {
    const av = aEval.kickerRanks[i] || 0;
    const bv = bEval.kickerRanks[i] || 0;
    if (av !== bv) return bv - av; // 降順（高いランクが前）
  }
  return 0;
}

function rankNumToText(n) {
  const v = n === 1 ? 14 : n; // 1はA扱い
  if (v === 14) return 'A';
  if (v === 13) return 'K';
  if (v === 12) return 'Q';
  if (v === 11) return 'J';
  return String(v);
}

function describeBestHand(holes, community) {
  // evaluateSevenと同じロジックを使用して最強の5枚を特定
  const cards = [...holes, ...community];
  
  function findBestFiveCards() {
    const combinations = [];
    
    function generateCombos(arr, start, current) {
      if (current.length === 5) {
        combinations.push([...current]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        generateCombos(arr, i + 1, current);
        current.pop();
      }
    }
    
    generateCombos(cards, 0, []);
    
    let best = null;
    let bestScore = -1;
    
    for (const combo of combinations) {
      const handEval = evaluateFiveCards(combo);
      const score = handEval.category * 1000 + (handEval.kickerRanks[0] || 0);
      if (score > bestScore) {
        bestScore = score;
        best = combo;
      } else if (score === bestScore && best) {
        // 同じスコアの場合、より詳細な比較
        const currentEval = evaluateFiveCards(best);
        if (compareHands(handEval, currentEval) > 0) {
          best = combo;
        }
      }
    }
    
    return best || cards.slice(0, 5);
  }
  
  function evaluateFiveCards(fiveCards) {
    const ranks = fiveCards.map(c => c.rank === 1 ? 14 : c.rank);
    const suits = fiveCards.map(c => c.suit);
    
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    
    const suitCounts = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Math.max(...Object.values(suitCounts)) === 5;
    
    const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
    let isStraight = false;
    if (sortedRanks.length === 5) {
      if (sortedRanks[4] - sortedRanks[0] === 4) {
        isStraight = true;
      } else if (sortedRanks[0] === 2 && sortedRanks[4] === 14 && 
                 sortedRanks[1] === 3 && sortedRanks[2] === 4 && sortedRanks[3] === 5) {
        // A-2-3-4-5（正確な判定）
        isStraight = true;
      }
    }
    
    let category = 0;
    if (isFlush && isStraight) {
      category = 8;
    } else if (counts[0] === 4) {
      category = 7;
    } else if (counts[0] === 3 && counts[1] === 2) {
      category = 6;
    } else if (isFlush) {
      category = 5;
    } else if (isStraight) {
      category = 4;
    } else if (counts[0] === 3) {
      category = 3;
    } else if (counts[0] === 2 && counts[1] === 2) {
      category = 2;
    } else if (counts[0] === 2) {
      category = 1;
    } else {
      category = 0;
    }
    
    // キッカーランク（比較用）
    let kickerRanks;
    
    if (category === 4) {
      // ストレート: ハイカードで比較
      if (sortedRanks[0] === 2 && sortedRanks[4] === 14) {
        kickerRanks = [5]; // A-2-3-4-5のハイは5
      } else {
        kickerRanks = [sortedRanks[4]]; // 通常のストレートのハイ
      }
    } else if (category === 2) {
      // ツーペア: 高いペア、低いペア、キッカーの順
      const pairs = Object.entries(rankCounts).filter(([, count]) => count === 2)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      const kickers = Object.entries(rankCounts).filter(([, count]) => count === 1)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      kickerRanks = [...pairs, ...kickers];
    } else if (category === 1) {
      // ワンペア: ペア、キッカー3枚の順
      const pair = Object.entries(rankCounts).find(([, count]) => count === 2);
      const kickers = Object.entries(rankCounts).filter(([, count]) => count === 1)
        .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
      kickerRanks = [parseInt(pair[0]), ...kickers];
    } else {
      // その他: ランクの降順
      kickerRanks = [...ranks].sort((a, b) => b - a);
    }
    
    return { category, rankCounts, sortedRanks, isStraight, kickerRanks };
  }
  
  const bestFive = findBestFiveCards();
  const handEval = evaluateFiveCards(bestFive);
  const rankCounts = handEval.rankCounts;
  const sortedRanks = handEval.sortedRanks;
  const isStraight = handEval.isStraight;

  // 役名を生成
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (handEval.category === 8) {
    return 'ロイヤルフラッシュ';
  } else if (handEval.category === 7) {
    const fourOf = Object.entries(rankCounts).find(([, count]) => count === 4);
    return `フォーカード（${rankNumToText(parseInt(fourOf[0]))}）`;
  } else if (handEval.category === 6) {
    const threeOf = Object.entries(rankCounts).find(([, count]) => count === 3);
    const pair = Object.entries(rankCounts).find(([, count]) => count === 2);
    return `フルハウス（${rankNumToText(parseInt(threeOf[0]))} と ${rankNumToText(parseInt(pair[0]))}）`;
  } else if (handEval.category === 5) {
    return 'フラッシュ';
  } else if (handEval.category === 4) {
    const high = sortedRanks[0] === 2 && sortedRanks[4] === 14 ? 5 : sortedRanks[4];
    return `ストレート（ハイ ${rankNumToText(high)}）`;
  } else if (handEval.category === 3) {
    const threeOf = Object.entries(rankCounts).find(([, count]) => count === 3);
    return `スリーカード（${rankNumToText(parseInt(threeOf[0]))}）`;
  } else if (handEval.category === 2) {
    const pairs = Object.entries(rankCounts).filter(([, count]) => count === 2)
      .map(([rank]) => parseInt(rank)).sort((a, b) => b - a);
    return `ツーペア（${rankNumToText(pairs[0])} と ${rankNumToText(pairs[1])}）`;
  } else if (handEval.category === 1) {
    const pair = Object.entries(rankCounts).find(([, count]) => count === 2);
    return `ワンペア（${rankNumToText(parseInt(pair[0]))}）`;
  } else {
    // ハイカード: ホール2枚の高い方をそのままハイとして表示
    const holeVals = holes.map(c => (c.rank === 1 ? 14 : c.rank)).sort((a, b) => b - a);
    return `${rankNumToText(holeVals[0])}ハイ`;
  }
}

export function showdown() {
  if (gameState.community.length < 5) {
    setStatus('まだ全てのコミュニティカードが公開されていません。');
    return;
  }

  // 全員のホールカードを表にする
  gameState.seatsEl.querySelectorAll('.flip-inner').forEach(el => el.classList.remove('is-back'));

  const evals = gameState.players.map((p, idx) => ({
    idx,
    eval: evaluateSeven(p.hole, gameState.community)
  }));

  evals.sort((a,b)=>compareHands(a.eval,b.eval));
  const best = evals[0];

  // チョップ検出
  const winners = evals.filter(e => compareHands(e.eval, best.eval) === 0);

  // ハイライト
  gameState.players.forEach((p, i) => {
    p.seatEl.classList.toggle('winner', winners.some(w => w.idx === i));
  });

  // 勝者名を干支表記で表示
  const zodiacEmojis = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐐','🐵','🐔','🐶','🐗'];
  const zodiacNames  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  
  if (winners.length === 1) {
    const zi = best.idx % zodiacEmojis.length;
    const bestPlayer = gameState.players[best.idx];
    const desc = describeBestHand(bestPlayer.hole, gameState.community);
    setStatus(`${zodiacEmojis[zi]}（${zodiacNames[zi]}）の勝ち！ ${desc}`);
  } else {
    // チョップ
    const desc = describeBestHand(gameState.players[best.idx].hole, gameState.community);
    const winnerNames = winners.map(w => {
      const zi = w.idx % zodiacEmojis.length;
      return `${zodiacEmojis[zi]}（${zodiacNames[zi]}）`;
    }).join('と');
    setStatus(`${winnerNames}のチョップ！ ${desc}`);
  }
}

export function nextHand(numPlayers) {
  startNewHand({
    seatsEl: gameState.seatsEl,
    communityEl: gameState.communityEl,
    statusEl: gameState.statusEl,
    numPlayers: numPlayers || gameState.players.length
  });
}

// 自動進行: フロップ→ターン→リバー（→任意でショーダウン）
export function autoReveal({
  flopDelayMs = 800,
  turnDelayMs = 1200,
  riverDelayMs = 1200,
  showdownDelayMs = 800,
  autoShowdown = false
} = {}) {
  // 既に進行中でも段階に応じて続行
  const stage = gameState.community.length; // 0,3,4,5
  const doFlop = () => flipStreet('flop');
  const doTurn = () => flipStreet('turn');
  const doRiver = () => flipStreet('river');

  if (stage <= 0) {
    setTimeout(() => {
      doFlop();
      setTimeout(() => {
        doTurn();
        setTimeout(() => {
          doRiver();
          if (autoShowdown) {
            setTimeout(() => showdown(), showdownDelayMs);
          }
        }, riverDelayMs);
      }, turnDelayMs);
    }, flopDelayMs);
    return;
  }

  if (stage === 3) {
    setTimeout(() => {
      doTurn();
      setTimeout(() => {
        doRiver();
        if (autoShowdown) {
          setTimeout(() => showdown(), showdownDelayMs);
        }
      }, riverDelayMs);
    }, turnDelayMs);
    return;
  }

  if (stage === 4) {
    setTimeout(() => {
      doRiver();
      if (autoShowdown) {
        setTimeout(() => showdown(), showdownDelayMs);
      }
    }, riverDelayMs);
    return;
  }

  // すでに5枚公開済み
  if (autoShowdown) showdown();
}


