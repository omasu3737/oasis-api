// 共鳴スコア計算（5軸ベース）
// 2つのユーザーの5軸スコアからユークリッド距離を計算し、0-100%に変換
export function calcResonanceScore(myPersona, otherPersona) {
  if (!myPersona || !otherPersona) return null;

  const axes = ['depth', 'will', 'action', 'resonance', 'stability'];

  // ユークリッド距離（各軸0-100なので最大距離 = sqrt(5 * 100^2) ≈ 223.6）
  let sumSq = 0;
  for (const axis of axes) {
    const diff = (myPersona[axis] ?? 50) - (otherPersona[axis] ?? 50);
    sumSq += diff * diff;
  }
  const distance = Math.sqrt(sumSq);
  const maxDistance = Math.sqrt(5 * 100 * 100); // ≈ 223.6

  // 距離を0-100%のスコアに変換（近いほど高い）
  const rawScore = (1 - distance / maxDistance) * 100;

  // 補完性ボーナス: 対照的な軸がある場合に少しボーナス
  // （例：一方がaction高・他方が低い → 補完し合える）
  let complementBonus = 0;
  for (const axis of axes) {
    const a = myPersona[axis] ?? 50;
    const b = otherPersona[axis] ?? 50;
    // 片方が70以上・片方が30以下なら補完的
    if ((a >= 70 && b <= 30) || (a <= 30 && b >= 70)) {
      complementBonus += 2;
    }
  }

  // 最終スコア: 類似性ベース + 補完性ボーナス（最大10%）
  const finalScore = Math.min(99, Math.max(1, Math.round(rawScore + complementBonus)));
  return finalScore;
}

// カテゴリ別適性スコア（友人 / 恋愛 / 仕事）
// 5軸の重み付けを変え、類似性 or 補完性どちらを重視するか変える
export function calcCategoryScores(myPersona, otherPersona) {
  if (!myPersona || !otherPersona) return null;

  const get = (p, k) => p[k] ?? 50;

  // 類似度（0-100、近いほど高い）
  function similarity(axis) {
    return 100 - Math.abs(get(myPersona, axis) - get(otherPersona, axis));
  }
  // 補完度（差が大きく、かつ両方が極端なほど高い）
  function complement(axis) {
    const a = get(myPersona, axis), b = get(otherPersona, axis);
    const diff = Math.abs(a - b);
    const extremity = (Math.abs(a - 50) + Math.abs(b - 50)) / 100;
    return diff * extremity;
  }

  // 友人: 共鳴の類似 + 安定の類似 + 深さの類似（居心地の良さ重視）
  const friend = Math.round(
    similarity('resonance') * 0.35 +
    similarity('stability') * 0.30 +
    similarity('depth') * 0.20 +
    similarity('action') * 0.10 +
    similarity('will') * 0.05
  );

  // 恋愛: 深さの類似 + 意思の補完 + 共鳴の高さ（感情的つながり重視）
  const bothDepth = (get(myPersona, 'depth') + get(otherPersona, 'depth')) / 200 * 100;
  const bothResonance = (get(myPersona, 'resonance') + get(otherPersona, 'resonance')) / 200 * 100;
  const romance = Math.round(
    similarity('depth') * 0.25 +
    bothDepth * 0.20 +
    complement('will') * 0.20 +
    bothResonance * 0.20 +
    similarity('stability') * 0.15
  );

  // 仕事: 行動+意思の高さ + 安定の類似（生産性重視）
  const bothAction = (get(myPersona, 'action') + get(otherPersona, 'action')) / 200 * 100;
  const bothWill = (get(myPersona, 'will') + get(otherPersona, 'will')) / 200 * 100;
  const work = Math.round(
    bothAction * 0.30 +
    bothWill * 0.25 +
    similarity('stability') * 0.25 +
    similarity('resonance') * 0.10 +
    similarity('depth') * 0.10
  );

  return {
    friend: Math.min(99, Math.max(1, friend)),
    romance: Math.min(99, Math.max(1, romance)),
    work: Math.min(99, Math.max(1, work)),
  };
}

// 最も適性が高いカテゴリを返す
export function getBestCategory(categoryScores) {
  if (!categoryScores) return null;
  const { friend, romance, work } = categoryScores;
  if (friend >= romance && friend >= work) return '友人';
  if (romance >= friend && romance >= work) return '恋愛';
  return '仕事';
}
