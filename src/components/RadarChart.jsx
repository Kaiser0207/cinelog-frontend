import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

export default function RadarChart({
  acting = 0,
  cinematography = 0,
  soundtrack = 0,
  animated = true,
}) {
  const data = [
    { axis: 'Acting', value: acting, fullMark: 10 },
    { axis: 'Cinematography', value: cinematography, fullMark: 10 },
    { axis: 'Soundtrack', value: soundtrack, fullMark: 10 },
  ];

  const renderTick = ({ payload, x, y, cx, cy }) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = 1.15;

    return (
      <text
        x={cx + dx * dist}
        y={cy + dy * dist}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#6b6b80"
        fontSize={12}
        fontWeight={500}
        fontFamily="var(--font-inter)"
      >
        {payload.value}
      </text>
    );
  };

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={260}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="axis"
            tick={renderTick}
            stroke="transparent"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Cinematic"
            dataKey="value"
            stroke="#f5c518"
            strokeWidth={2}
            fill="#e50914"
            fillOpacity={0.2}
            dot={{
              r: 4,
              fill: '#f5c518',
              stroke: '#f5c518',
              strokeWidth: 1,
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
