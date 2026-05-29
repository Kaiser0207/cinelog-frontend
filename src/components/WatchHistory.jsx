import { motion } from 'framer-motion';

export default function WatchHistory({ dates = [], onChange }) {
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  const addDate = () => {
    const today = new Date().toISOString().split('T')[0];
    onChange([...dates, today]);
  };

  const removeDate = () => {
    if (dates.length > 0) {
      onChange(dates.slice(0, -1));
    }
  };

  const updateDate = (index, value) => {
    const updated = [...dates];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm text-text-muted font-medium">觀影紀錄</label>
        <div className="flex items-center gap-2">
          {dates.length > 0 && (
            <button
              type="button"
              onClick={removeDate}
              className="w-7 h-7 rounded-lg bg-bg-card border border-border-subtle text-text-muted hover:text-red-400 hover:border-red-400/30 transition-colors text-sm flex items-center justify-center"
            >
              −
            </button>
          )}
          <button
            type="button"
            onClick={addDate}
            className="w-7 h-7 rounded-lg bg-bg-card border border-border-subtle text-text-muted hover:text-accent-blue hover:border-green-400/30 transition-colors text-sm flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {dates.length === 0 && (
          <p className="text-text-dim text-xs italic">尚未新增觀影日期</p>
        )}
        {dates.map((date, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs text-text-muted w-16 flex-shrink-0">
              第 {i + 1} 次
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => updateDate(i, e.target.value)}
              className="flex-1 text-sm"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
