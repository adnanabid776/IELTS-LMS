import React, { useState, useEffect } from 'react';

const EssayEditor = ({ value, onChange, minWords, placeholder }) => {
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    // Calculate word count
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    
    // Calculate character count
    setCharCount(value.length);
  }, [value]);

  const isUnderMinimum = wordCount < minWords && wordCount > 0;
  const isAtMinimum = wordCount >= minWords;

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-96 p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-base leading-relaxed"
        style={{ fontFamily: 'Georgia, serif' }}
      />

      {/* Stats Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        {/* Word Count */}
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-sm text-gray-600">Words</p>
            <p className={`text-2xl font-bold ${
              isUnderMinimum ? 'text-red-600' : 
              isAtMinimum ? 'text-green-600' : 
              'text-gray-800'
            }`}>
              {wordCount}
            </p>
          </div>
          
          <div className="h-12 w-px bg-gray-300"></div>
          
          <div>
            <p className="text-sm text-gray-600">Minimum</p>
            <p className="text-2xl font-bold text-gray-600">{minWords}</p>
          </div>
          
          <div className="h-12 w-px bg-gray-300"></div>
          
          <div>
            <p className="text-sm text-gray-600">Characters</p>
            <p className="text-2xl font-bold text-gray-800">{charCount}</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div>
          {wordCount === 0 ? (
            <div className="flex items-center text-gray-500">
              <span className="text-2xl mr-2">✏️</span>
              <span className="font-semibold">Start writing...</span>
            </div>
          ) : isUnderMinimum ? (
            <div className="flex items-center text-red-600">
              <span className="text-2xl mr-2">⚠️</span>
              <span className="font-semibold">
                {minWords - wordCount} more words needed
              </span>
            </div>
          ) : (
            <div className="flex items-center text-green-600">
              <span className="text-2xl mr-2">✅</span>
              <span className="font-semibold">Meets minimum requirement</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all ${
            wordCount >= minWords ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ 
            width: `${Math.min((wordCount / minWords) * 100, 100)}%` 
          }}
        ></div>
      </div>

      {/* Tips */}
      {wordCount === 0 && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Start by introducing the main topic, then develop your ideas in separate paragraphs.
          </p>
        </div>
      )}
    </div>
  );
};

export default EssayEditor;