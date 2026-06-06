import { motion } from 'framer-motion';
import { getScoreColor } from '../utils/constants';

export default function ScoreSlider({
  label,
  value,
  onChange,
  animated = false,
  readOnly = false,
}) {
  const color = getScoreColor(value);
  const pct = (value / 10) * 100;

  const gradientStyle = {
    background: `linear-gradient(to right, #e50914 0%, #ff6b35 30%, #f5c518 60%, #1db954 100%)`,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-muted font-medium">{label}</span>
        <motion.span
          key={value}
          initial={animated ? { scale: 1.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          className="text-lg font-bold tabular-nums text-text-primary"
        >
          {value.toFixed(1)}
        </motion.span>
      </div>

      <div className="relative pt-1 pb-1">
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => { onChange?.(parseFloat(e.target.value)); if (navigator.vibrate) navigator.vibrate(3); }}
          disabled={readOnly}
          className={`relative z-10 w-full ${readOnly ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
          style={{
            background: `var(--color-text-primary)`,
            backgroundSize: `${pct}% 100%`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: 'var(--color-border-subtle)'
          }}
        />
      </div>
    </div>
  );
}
