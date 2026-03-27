import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const KEYS = ['depth', 'will', 'action', 'resonance', 'stability'];
const LABELS = ['深さ', '意思', '行動', '共鳴', '安定'];
const AXES = 5;
const SIZE = 200;
const CX = SIZE / 2, CY = SIZE / 2, R = 70;
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

// ラベル位置の微調整（頂点の外側に配置）
const LABEL_OFFSETS = [
  { dx: 0, dy: -18, align: 'center' },   // 0: 深さ（上）
  { dx: 14, dy: -4, align: 'left' },      // 1: 意思（右上）
  { dx: 8, dy: 6, align: 'left' },        // 2: 行動（右下）
  { dx: -8, dy: 6, align: 'right' },      // 3: 共鳴（左下）
  { dx: -14, dy: -4, align: 'right' },    // 4: 安定（左上）
];

export default function RadarChart({ scores }) {
  const { colors: C, isDark } = useTheme();
  const s = useMemo(() => getStyles(C), [C]);
  const dataPoints = KEYS.map((k, i) => getPoint(i, (scores[k] || 0) / 100));

  const gridColor = isDark ? '#4a3870' : '#ece6ff';
  const fillStopA = isDark ? '#a87cef' : '#5a3fc0';
  const fillStopB = isDark ? '#5a3a8a' : '#c4b0f8';
  const strokeColor = isDark ? '#a87cef' : '#5a3fc0';

  return (
    <View style={s.container}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={fillStopA} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={fillStopB} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {GRID_LEVELS.map((level, i) => {
          const pts = Array.from({ length: AXES }, (_, j) => getPoint(j, level));
          return <Polygon key={i} points={toStr(pts)} fill="none" stroke={gridColor} strokeWidth="1" />;
        })}

        {Array.from({ length: AXES }, (_, i) => {
          const outer = getPoint(i, 1.0);
          return (
            <Line key={i} x1={CX} y1={CY}
              x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
              stroke={gridColor} strokeWidth="0.7" />
          );
        })}

        <Polygon points={toStr(dataPoints)}
          fill="url(#rg)" stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
      </Svg>

      {LABELS.map((label, i) => {
        const vertex = getPoint(i, 1.0);
        const off = LABEL_OFFSETS[i];
        return (
          <Text
            key={i}
            style={[
              s.label,
              {
                position: 'absolute',
                left: vertex.x + off.dx - (off.align === 'center' ? 20 : off.align === 'right' ? 40 : 0),
                top: vertex.y + off.dy,
                width: 40,
                textAlign: off.align,
              },
            ]}
          >
            {label}
          </Text>
        );
      })}
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  container: { alignSelf: 'center', width: SIZE, height: SIZE, marginVertical: 8 },
  label: { fontSize: 11, color: C.p, fontWeight: '500' },
});
