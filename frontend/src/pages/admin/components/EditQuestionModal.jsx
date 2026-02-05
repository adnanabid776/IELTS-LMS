import React, { useState, useEffect } from "react";
import { updateQuestion } from "../../../services/api";
import { toast } from "react-toastify";

const EditQuestionModal = ({ question, sections, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "",
    options: [],
    correctAnswer: "",
    alternativeAnswers: [],
    points: 1,
    imageUrl: "",

    explanation: "",
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const questionTypes = [
    { value: "multiple-choice", label: "Multiple Choice", needsOptions: true },
    {
      value: "true-false-not-given",
      label: "True/False/Not Given",
      needsOptions: false,
    },
    {
      value: "yes-no-not-given",
      label: "Yes/No/Not Given",
      needsOptions: false,
    },
    {
      value: "matching-headings",
      label: "Matching Headings",
      needsOptions: true,
    },
    {
      value: "matching-information",
      label: "Matching Information",
      needsOptions: true,
    },
    {
      value: "matching-features",
      label: "Matching Features",
      needsOptions: true,
    },
    {
      value: "sentence-completion",
      label: "Sentence Completion",
      needsOptions: false,
    },
    {
      value: "summary-completion",
      label: "Summary Completion",
      needsOptions: false,
    },
    { value: "note-completion", label: "Note Completion", needsOptions: false },
    {
      value: "table-completion",
      label: "Table Completion",
      needsOptions: false,
    },
    {
      value: "flow-chart-completion",
      label: "Flow Chart Completion",
      needsOptions: false,
    },
    {
      value: "diagram-labeling",
      label: "Diagram Labeling",
      needsOptions: false,
    },
    { value: "short-answer", label: "Short Answer", needsOptions: false },
    {
      value: "writing-task",
      label: "Writing Task / Essay",
      needsOptions: false,
      isSubjective: true,
    },
  ];

  useEffect(() => {
    if (question) {
      setFormData({
        questionText: question.questionText || "",
        questionType: question.questionType || "multiple-choice",
        options:
          question.options && question.options.length > 0
            ? question.options
            : ["", "", "", ""],
        correctAnswer: question.correctAnswer || "",
        alternativeAnswers:
          question.alternativeAnswers && question.alternativeAnswers.length > 0
            ? question.alternativeAnswers
            : [""],
        points: question.points || 1,
        imageUrl: question.imageUrl || "",

        explanation: question.explanation || "",
        items: question.items || [],
      });
    }
  }, [question]);

  const currentType = questionTypes.find(
    (t) => t.value === formData.questionType,
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, options: newOptions }));
    }
  };

  const handleAlternativeAnswerChange = (index, value) => {
    const newAlt = [...formData.alternativeAnswers];
    newAlt[index] = value;
    setFormData((prev) => ({ ...prev, alternativeAnswers: newAlt }));
  };

  const addAlternativeAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      alternativeAnswers: [...prev.alternativeAnswers, ""],
    }));
  };

  const removeAlternativeAnswer = (index) => {
    const newAlt = formData.alternativeAnswers.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, alternativeAnswers: newAlt }));
  };

  // --- Items Management for Matching Headings ---
  // Ensure items exist if switching to matching type (though mostly relevant for new questions, good for robustness)
  useEffect(() => {
    if (
      (formData.questionType === "matching-headings" ||
        formData.questionType === "matching-information") &&
      (!formData.items || formData.items.length === 0)
    ) {
      // Only if we truly have no items (e.g. converting a question type??)
      // Usually we don't convert types deeply, but just in case:
      setFormData((prev) => ({
        ...prev,
        items: [
          { label: "A", text: "", correctAnswer: "" },
          { label: "B", text: "", correctAnswer: "" },
        ],
      }));
    }
  }, [formData.questionType]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    const nextLabel = String.fromCharCode(65 + formData.items.length); // A, B, C...
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { label: nextLabel, text: "", correctAnswer: "" }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 2) {
      const newItems = formData.items.filter((_, i) => i !== index);
      // Re-label items
      const relabeled = newItems.map((item, idx) => ({
        ...item,
        label: String.fromCharCode(65 + idx),
      }));
      setFormData((prev) => ({ ...prev, items: relabeled }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.questionText.trim())
      newErrors.questionText = "Question text is required";

    // Skip correct answer validation for subjective types
    if (!currentType?.isSubjective && !formData.correctAnswer.trim()) {
      newErrors.correctAnswer = "Correct answer is required";
    }

    if (currentType?.needsOptions) {
      const filledOptions = formData.options.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        newErrors.options = "At least 2 options are required";
      }
    }

    if (
      formData.questionType === "matching-headings" ||
      formData.questionType === "matching-information"
    ) {
      const validItems = formData.items.filter(
        (item) => item.text.trim() && item.correctAnswer,
      );
      if (validItems.length < 2) {
        newErrors.items =
          "At least 2 items with text and selected option are required";
      }
      delete newErrors.correctAnswer;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      // Clean up data
      const submitData = {
        questionText: formData.questionText,
        questionType: formData.questionType,
        correctAnswer: formData.correctAnswer,
        points: parseInt(formData.points),
        explanation: formData.explanation,
        imageUrl: formData.imageUrl,
      };

      // Handle Subjective Types (Writing)
      if (currentType?.isSubjective) {
        submitData.correctAnswer = "Manual Grading"; // Placeholder
      }

      if (
        formData.questionType === "matching-headings" ||
        formData.questionType === "matching-information"
      ) {
        submitData.items = formData.items.filter((i) => i.text.trim());
        if (!submitData.correctAnswer) submitData.correctAnswer = "See items";
      }

      // Handle options
      if (currentType?.needsOptions) {
        submitData.options = formData.options.filter((opt) => opt.trim());
      } else {
        submitData.options = [];
      }

      // Handle alternative answers
      submitData.alternativeAnswers = formData.alternativeAnswers.filter(
        (alt) => alt.trim(),
      );

      await updateQuestion(question._id, submitData);
      toast.success("Question updated successfully!");
      onSuccess();
    } catch (error) {
      console.error("Update question error:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to update question";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Edit Question
            </h3>
            <p className="text-sm text-gray-500">
              Question #{question?.questionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-4 max-h-[70vh] overflow-y-auto"
        >
          <div className="space-y-4">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type <span className="text-red-500">*</span>
              </label>
              <select
                name="questionType"
                value={formData.questionType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {questionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                name="questionText"
                value={formData.questionText}
                onChange={handleChange}
                rows="3"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.questionText
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="Enter the question text..."
              />
              {errors.questionText && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.questionText}
                </p>
              )}
            </div>

            {/* Options */}
            {/* Options */}
            {currentType?.needsOptions &&
              formData.questionType !== "matching-headings" &&
              formData.questionType !== "matching-information" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleOptionChange(index, e.target.value)
                          }
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${index + 1}`}
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm font-semibold"
                  >
                    + Add Option
                  </button>
                  {errors.options && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.options}
                    </p>
                  )}
                </div>
              )}

            {/* MATCHING HEADINGS / INFORMATION SPECIFIC UI */}
            {(formData.questionType === "matching-headings" ||
              formData.questionType === "matching-information") && (
              <div className="space-y-6">
                {/* Options List */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    {formData.questionType === "matching-headings"
                      ? "Options (Headings: i, ii, iii...)"
                      : "Options (Paragraphs: A, B, C...)"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <span className="text-sm font-bold w-6 text-gray-500">
                          {formData.questionType === "matching-headings"
                            ? [
                                "i",
                                "ii",
                                "iii",
                                "iv",
                                "v",
                                "vi",
                                "vii",
                                "viii",
                                "ix",
                                "x",
                              ][index] || index + 1
                            : String.fromCharCode(65 + index)}
                          .
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleOptionChange(index, e.target.value)
                          }
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={
                            formData.questionType === "matching-headings"
                              ? "Enter heading text..."
                              : "Enter paragraph description/text..."
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
                  >
                    + Add Option
                  </button>
                </div>

                {/* Items List */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    {formData.questionType === "matching-headings"
                      ? "Questions (Paragraphs) & Correct Headings"
                      : "Questions (Statements) & Correct Paragraphs"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                          {item.label}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) =>
                              handleItemChange(index, "text", e.target.value)
                            }
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={
                              formData.questionType === "matching-headings"
                                ? `Paragraph ${item.label} text/preview...`
                                : `Statement ${item.label}...`
                            }
                          />
                          <select
                            value={item.correctAnswer}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "correctAnswer",
                                e.target.value,
                              )
                            }
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${!item.correctAnswer ? "border-red-300" : "border-gray-300"}`}
                          >
                            <option value="">Select Correct Option...</option>
                            {formData.options.map((opt, idx) => (
                              <option key={idx} value={opt}>
                                {formData.questionType === "matching-headings"
                                  ? ([
                                      "i",
                                      "ii",
                                      "iii",
                                      "iv",
                                      "v",
                                      "vi",
                                      "vii",
                                      "viii",
                                      "ix",
                                      "x",
                                    ][idx] || idx + 1) + ". "
                                  : String.fromCharCode(65 + idx) + ". "}
                                {opt.substring(0, 50)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="bg-red-500 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    + Add Item
                  </button>
                  {errors.items && (
                    <p className="text-red-500 text-xs mt-2 font-semibold">
                      {errors.items}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Correct Answer */}
            {formData.questionType !== "matching-headings" &&
              formData.questionType !== "matching-information" &&
              !currentType?.isSubjective && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.correctAnswer
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Enter correct answer"
                  />
                  {errors.correctAnswer && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.correctAnswer}
                    </p>
                  )}
                </div>
              )}

            {/* Alternative Answers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternative Answers (Optional)
              </label>
              <div className="space-y-2">
                {formData.alternativeAnswers.map((alt, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={alt}
                      onChange={(e) =>
                        handleAlternativeAnswerChange(index, e.target.value)
                      }
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Alternative answer ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAlternativeAnswer(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addAlternativeAnswer}
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-semibold"
              >
                + Add Alternative
              </button>
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                name="points"
                value={formData.points}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Explain why this is the correct answer..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-semibold ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            }`}
          >
            {loading ? "Updating..." : "Update Question"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
