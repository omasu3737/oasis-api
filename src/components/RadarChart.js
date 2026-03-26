import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { C } from '../theme';

const KEYS = ['depth', 'will', 'action', 'resonance', 'stability'];
const LABELS = ['深さ', '意思', '行動', '共鳴', '安定'];
const AXES = 5;
const CX = 100, CY = 95, R = 75;
const ANGLE_OFFSET = -Math.PI / 2;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0];

function getPoint(index, ratio) {
  const angle = ANGLE_OFFSET + (2 * Math.PI * index) / AXES;
  return {
    x: CX + Math.cos(angle) * R * ratio,
    y: CY + Math.sin(angle) * R * ratio,
  };
}

function toStr(points) {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

export default function RadarChart({ scores }) {
  const dataPoints = KEYS.map((k, i) => getPoint(i, (scores[k] || 0) / 100));
  const labelPositions = LABELS.map((label, i) => {
    const p = getPoint(i, 1.28);
    return { label, x: p.x, y: p.y };
  });

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Svg width={200} height={210} viewBox="0 0 200 210">
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#5a3fc0" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#c4b0f8" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {GRID_LEVELS.map((level, i) => {
          const pts = Array.from({ length: AXES }, (_, j) => getPoint(j, level));
          return <Polygon key={i} points={toStr(pts)} fill="none" stroke="#ece6ff" strokeWidth="1" />;
        })}

        {Array.from({ length: AXES }, (_, i) => {
          const outer = getPoint(i, 1.0);
          return (
            <Line key={i} x1={CX} y1={CY}
              x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
              stroke="#ece6ff" strokeWidth="0.7" />
          );
        })}

        <Polygon points={toStr(dataPoints)}
          fill="url(#rg)" stroke="#5a3fc0" strokeWidth="1.8" strokeLinejoin="round" />
      </Svg>

      {labelPositions.map((lp, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: 100 + (lp.x - 100) - 18,
          top: 8 + (lp.y - 95) + 95 - 7,
        }}>
          <Text style={s.label}>{lp.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 10, color: C.p, textAlign: 'center' },
});
