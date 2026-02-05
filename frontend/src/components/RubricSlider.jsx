import React from "react";

const RubricSlider = ({ criterion, value, onChange, description }) => {
  const handleChange = (e) => {
    onChange(parseFloat(e.target.value));
  };

  const getColorClass = () => {
    if (value >= 7) {
      return "bg-green-500";
    } else if (value >= 5) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  const getTextColorClass = () => {
    if (value >= 7) {
      return "bg-green-600";
    } else if (value >= 5) {
      return "bg-yellow-600";
    } else {
      return "bg-red-600";
    }
  };

  return (
    <div className="mb-6">
      {/* Criterion Name and Score */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">{criterion}</h4>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <div className={`text-3xl font-bold ${getTextColorClass()}`}>
            {value.toFixed(1)}
        </div>
      </div>
       {/* Slider */}
      <input
        type="range"
        min="0"
        max="9"
        step="0.5"
        value={value}
        onChange={handleChange}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, ${
            value >= 7 ? '#10b981' : value >= 5 ? '#eab308' : '#ef4444'
          } 0%, ${
            value >= 7 ? '#10b981' : value >= 5 ? '#eab308' : '#ef4444'
          } ${(value / 9) * 100}%, #e5e7eb ${(value / 9) * 100}%, #e5e7eb 100%)`
        }}
      />

      {/* Visual Progress Bar */}
      <div className="flex items-center gap-1 mt-2">
        {[...Array(9)].map((_, index) => {
          const barValue = index + 1;
          const isActive = value >= barValue;
          return (
            <div
              key={index}
              className={`h-8 flex-1 rounded transition-all ${
                isActive ? getColorClass() : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
        <span>7</span>
        <span>8</span>
        <span>9</span>
      </div>
    </div>
  );
};

export default RubricSlider;
