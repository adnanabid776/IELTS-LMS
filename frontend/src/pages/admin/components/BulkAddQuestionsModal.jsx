import React, { useState } from 'react';
import { bulkCreateQuestions } from '../../../services/api';
import { toast } from 'react-toastify';

const BulkAddQuestionsModal = ({ sections, onClose, onSuccess }) => {
  const [selectedSection, setSelectedSection] = useState('');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [questions, setQuestions] = useState([
    { questionNumber: '', questionText: '', correctAnswer: '', options: ['', '', '', ''] },
    { questionNumber: '', questionText: '', correctAnswer: '', options: ['', '', '', ''] },
    { questionNumber: '', questionText: '', correctAnswer: '', options: ['', '', '', ''] },
  ]);
  const [loading, setLoading] = useState(false);

  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice', needsOptions: true },
    { value: 'true-false-not-given', label: 'True/False/Not Given', needsOptions: false },
    { value: 'yes-no-not-given', label: 'Yes/No/Not Given', needsOptions: false },
    { value: 'short-answer', label: 'Short Answer', needsOptions: false },
    { value: 'sentence-completion', label: 'Sentence Completion', needsOptions: false },
    { value: 'matching-headings', label: 'Matching Headings', needsOptions: true },
  ];

  const currentType = questionTypes.find(t => t.value === questionType);

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionNumber: '', questionText: '', correctAnswer: '', options: ['', '', '', ''] }
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedSection) {
      toast.error('Please select a section');
      return;
    }

    const validQuestions = questions.filter(q => 
      q.questionNumber && q.questionText.trim() && q.correctAnswer.trim()
    );

    if (validQuestions.length === 0) {
      toast.error('Please fill at least one complete question');
      return;
    }

    try {
      setLoading(true);

      // Format questions for API
      const formattedQuestions = validQuestions.map(q => {
        const question = {
          sectionId: selectedSection,
          questionNumber: parseInt(q.questionNumber),
          questionText: q.questionText,
          questionType: questionType,
          correctAnswer: q.correctAnswer,
          points: 1,
        };

        // Add options if needed
        if (currentType?.needsOptions) {
          question.options = q.options.filter(opt => opt.trim());
        }

        return question;
      });

      await bulkCreateQuestions({ questions: formattedQuestions });
      toast.success(`${formattedQuestions.length} questions created successfully!`);
      onSuccess();
    } catch (error) {
      console.error('Bulk create error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create questions';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold">📋 Bulk Add Questions</h3>
            <p className="text-sm text-green-100">Add multiple questions at once</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl transition"
          >
            ×
          </button>
        </div>

        {/* Settings */}
        <div className="px-6 py-4 bg-gray-50 border-b-2 border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Select Section <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Choose a section...</option>
                {sections.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.testId?.title} - {section.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Question Type <span className="text-red-500">*</span>
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {questionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {questions.map((question, qIndex) => (
              <div key={qIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-green-500 transition">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-800">Question {qIndex + 1}</h4>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(qIndex)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-3">
                  {/* Question Number */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Q# <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={question.questionNumber}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionNumber', e.target.value)}
                      className="w-full px-2 py-2 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="#"
                    />
                  </div>

                  {/* Question Text */}
                  <div className={currentType?.needsOptions ? 'col-span-6' : 'col-span-8'}>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter question..."
                    />
                  </div>

                  {/* Options (if needed) */}
                  {currentType?.needsOptions && (
                    <div className="col-span-3">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Options <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-1">
                        {question.options.slice(0, 4).map((opt, optIndex) => (
                          <input
                            key={optIndex}
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Answer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={question.correctAnswer}
                      onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                      className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Answer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button
            onClick={addQuestion}
            className="mt-4 w-full py-3 border-2 border-dashed border-green-500 text-green-600 rounded-lg hover:bg-green-50 font-semibold transition"
          >
            + Add Another Question
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-between items-center border-t-2 border-gray-200 flex-shrink-0">
          <p className="text-sm text-gray-600">
            {questions.filter(q => q.questionNumber && q.questionText.trim() && q.correctAnswer.trim()).length} questions ready to create
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedSection}
              className={`px-6 py-2.5 rounded-lg font-semibold transition ${
                loading || !selectedSection
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-lg'
              }`}
            >
              {loading ? 'Creating...' : '✓ Create All Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddQuestionsModal;