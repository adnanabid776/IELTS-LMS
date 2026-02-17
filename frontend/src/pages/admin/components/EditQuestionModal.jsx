import React, { useState, useEffect } from "react";
import { updateQuestion } from "../../../services/api";
import { toast } from "react-toastify";

const EditQuestionModal = ({ question, onClose, onSuccess }) => {
  // ✅ REMOVED sections

  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "",
    options: [],
    correctAnswer: "",
    alternativeAnswers: [],
    points: 1,
    imageUrl: "",
    wordLimit: "", // ✅ ADDED
    allowNumber: true,

    explanation: "",
    items: [],
    features: [], // ✅ ADDED
    summaryConfig: {
      answerMode: "typed",
      wordLimitType: "no-more-than",
      maxWords: 1,
      customInstruction: "",
      options: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const questionTypes = [
    {
      value: "multiple-choice",
      label: "Multiple Choice (Single)",
      needsOptions: true,
    },
    {
      value: "multiple-choice-multi",
      label: "Multiple Choice (Multi-Select)",
      needsOptions: true,
    }, // ✅ ADDED
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
      needsOptions: false,
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
    {
      value: "map-labeling", // ✅ ADDED
      label: "Map / Diagram Labeling",
      needsOptions: true, // Reuse matching options logic
    },
    {
      value: "form-completion", // ✅ ADDED
      label: "Form Completion",
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
        features: question.features || [], // ✅ ADDED
        wordLimit: question.wordLimit || "", // ✅ ADDED
        allowNumber:
          question.allowNumber !== undefined ? question.allowNumber : true, // ✅ ADDED
        tableStructure: question.tableStructure || {
          headers: ["", ""],
          rows: [
            ["", ""],
            ["", ""],
          ],
        }, // ✅ ADDED
        summaryConfig: question.summaryConfig || {
          answerMode: "typed",
          wordLimitType: "no-more-than",
          maxWords: 1,
          customInstruction: "",
          options: [],
        },
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
        formData.questionType === "matching-information" ||
        formData.questionType === "map-labeling") && // ✅ ADDED
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
  }, [formData.questionType, formData.items.length]);

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
    if (
      formData.questionType !== "table-completion" &&
      formData.items.length <= 2
    ) {
      return;
    }

    const newItems = formData.items.filter((_, i) => i !== index);
    // Re-label items
    const relabeled = newItems.map((item, idx) => ({
      ...item,
      label:
        formData.questionType === "table-completion"
          ? String(idx + 1)
          : String.fromCharCode(65 + idx),
    }));
    setFormData((prev) => ({ ...prev, items: relabeled }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.questionText.trim())
      newErrors.questionText = "Question text is required";

    // Skip correct answer validation for subjective types and matching types that use items
    if (
      !currentType?.isSubjective &&
      formData.questionType !== "matching-features" &&
      !formData.correctAnswer.trim()
    ) {
      newErrors.correctAnswer = "Correct answer is required";
    }

    if (currentType?.needsOptions) {
      const filledOptions = formData.options.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        newErrors.options = "At least 2 options are required";
      }
    }

    if (formData.questionType === "matching-features") {
      const filledFeatures = formData.features.filter((f) =>
        typeof f === "string" ? f.trim() : f.text?.trim(),
      );
      if (filledFeatures.length < 2) {
        newErrors.options = "At least 2 features are required";
      }
    }

    if (
      formData.questionType === "matching-headings" ||
      formData.questionType === "matching-information" ||
      formData.questionType === "map-labeling" ||
      formData.questionType === "matching-features"
    ) {
      const validItems = formData.items.filter(
        (item) => item.text.trim() && item.correctAnswer,
      );
      if (validItems.length < 1) {
        // Changed to 1 to match AddModal logic, or keep 2? matching usually needs pairs but 1 is min tech requirement
        newErrors.items =
          "At least one item with text and selected option is required";
      }
      delete newErrors.correctAnswer;
    } else if (formData.questionType === "table-completion") {
      const validItems = formData.items.filter((item) => item.correctAnswer);
      if (validItems.length < 1) {
        newErrors.items = "At least 1 answer is required";
      }
      delete newErrors.correctAnswer;
    }

    if (formData.questionType === "summary-completion") {
      if (formData.summaryConfig.answerMode === "select") {
        const filledOptions = formData.summaryConfig.options.filter((o) =>
          o.trim(),
        );
        if (filledOptions.length < 2) {
          newErrors.summaryOptions =
            "At least 2 options are required for Select mode";
        }
      }
      if (formData.summaryConfig.maxWords < 1) {
        newErrors.maxWords = "Max words must be at least 1";
      }
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
        wordLimit: formData.wordLimit || null, // ✅ ADDED
        allowNumber: formData.allowNumber, // ✅ ADDED
        tableStructure: formData.tableStructure, // ✅ ADDED
        summaryConfig: formData.summaryConfig, // ✅ ADDED
      };

      if (formData.questionType === "summary-completion") {
        if (formData.summaryConfig.answerMode === "typed") {
          submitData.summaryConfig.options = [];
        } else {
          submitData.summaryConfig.options =
            formData.summaryConfig.options.filter((o) => o.trim());
        }
      }

      // Handle Subjective Types (Writing)
      if (currentType?.isSubjective) {
        submitData.correctAnswer = "Manual Grading"; // Placeholder
      }

      // Handle Matching Headings/Information/Features specific data structure
      if (
        formData.questionType === "matching-headings" ||
        formData.questionType === "matching-information" ||
        formData.questionType === "map-labeling" ||
        formData.questionType === "matching-features" ||
        formData.questionType === "table-completion"
      ) {
        submitData.items = formData.items.filter((i) => i.text.trim());
        submitData.features = formData.features.filter((f) =>
          typeof f === "string" ? f.trim() : f.text?.trim(),
        ); // ✅ ADDED
        // Allow empty correctAnswer at root level if backend requires it, or set a dummy one
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

            {/* Correct Answer (Hidden for Matching types, Table Completion and Subjective types) */}
            {formData.questionType !== "matching-headings" &&
              formData.questionType !== "matching-information" &&
              formData.questionType !== "map-labeling" &&
              formData.questionType !== "table-completion" &&
              formData.questionType !== "matching-features" &&
              !currentType?.isSubjective && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Word Limit (Optional)
                    </label>
                    <input
                      type="number"
                      name="wordLimit"
                      value={formData.wordLimit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="e.g. 2 (No more than 2 words)"
                    />
                  </div>
                  <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="allowNumber"
                        checked={formData.allowNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            allowNumber: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-sm font-bold text-gray-700">
                        Allow Numbers?
                      </span>
                    </label>
                  </div>
                </div>
              )}

            {/* Image URL (For Map Labeling or Visual Questions) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Image URL (Optional - for Maps/Diagrams)
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/map.png"
              />
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
            {currentType?.needsOptions &&
              formData.questionType !== "matching-headings" &&
              formData.questionType !== "matching-information" &&
              formData.questionType !== "map-labeling" && (
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

            {/* MATCHING FEATURES SPECIFIC UI */}
            {formData.questionType === "matching-features" && (
              <div className="space-y-6">
                {/* 1. Define Features (The Options A, B, C...) */}
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    List of Features (Options){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add the list of items to match against (e.g., Researchers,
                    Cities, Dates). Labels (A, B, C...) are auto-generated.
                  </p>

                  <div className="space-y-3">
                    {(formData.features || []).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-purple-200 text-purple-800 font-bold rounded">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <input
                          type="text"
                          value={feature.text || ""}
                          onChange={(e) => {
                            const newFeatures = [...(formData.features || [])];
                            newFeatures[index] = {
                              ...newFeatures[index],
                              label: String.fromCharCode(65 + index),
                              text: e.target.value,
                            };
                            setFormData({ ...formData, features: newFeatures });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          placeholder={`Feature ${String.fromCharCode(65 + index)}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newFeatures = (
                              formData.features || []
                            ).filter((_, i) => i !== index);
                            setFormData({ ...formData, features: newFeatures });
                          }}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        features: [
                          ...(formData.features || []),
                          {
                            label: String.fromCharCode(
                              65 + (formData.features || []).length,
                            ),
                            text: "",
                          },
                        ],
                      })
                    }
                    className="mt-3 px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-semibold"
                  >
                    + Add Feature
                  </button>
                </div>

                {/* 2. Define Items (The Questions) */}
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Questions to Match <span className="text-red-500">*</span>
                  </label>

                  <div className="space-y-4">
                    {(formData.items || []).map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white border rounded shadow-sm"
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-600">
                            Question {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = (formData.items || []).filter(
                                (_, i) => i !== index,
                              );
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Question Prompt
                            </label>
                            <input
                              type="text"
                              value={item.text || ""}
                              onChange={(e) => {
                                const newItems = [...(formData.items || [])];
                                newItems[index] = {
                                  ...newItems[index],
                                  text: e.target.value,
                                };
                                setFormData({ ...formData, items: newItems });
                              }}
                              className="w-full px-3 py-2 border rounded"
                              placeholder="e.g., The importance of adults..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              Correct Answer
                            </label>
                            <select
                              value={item.correctAnswer || ""}
                              onChange={(e) => {
                                const newItems = [...(formData.items || [])];
                                newItems[index] = {
                                  ...newItems[index],
                                  correctAnswer: e.target.value,
                                };
                                setFormData({ ...formData, items: newItems });
                              }}
                              className="w-full px-3 py-2 border rounded"
                            >
                              <option value="">Select...</option>
                              {(formData.features || []).map((feat, i) => (
                                <option
                                  key={i}
                                  value={String.fromCharCode(65 + i)}
                                >
                                  {String.fromCharCode(65 + i)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        items: [
                          ...(formData.items || []),
                          {
                            label: String((formData.items || []).length + 1),
                            text: "",
                            correctAnswer: "",
                          },
                        ],
                      })
                    }
                    className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-semibold"
                  >
                    + Add Question Item
                  </button>
                </div>
              </div>
            )}

            {/* SUMMARY COMPLETION SPECIFIC UI */}
            {formData.questionType === "summary-completion" && (
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200 space-y-4 mb-6">
                <h4 className="font-bold text-orange-800 flex items-center gap-2">
                  <span>📝</span> Summary Configuration (Optional)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Answer Mode */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Answer Mode
                    </label>
                    <div className="flex bg-white rounded-lg border p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            summaryConfig: {
                              ...formData.summaryConfig,
                              answerMode: "typed",
                            },
                          })
                        }
                        className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition ${
                          formData.summaryConfig.answerMode === "typed"
                            ? "bg-orange-500 text-white shadow"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Only Typed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            summaryConfig: {
                              ...formData.summaryConfig,
                              answerMode: "select",
                            },
                          })
                        }
                        className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition ${
                          formData.summaryConfig.answerMode === "select"
                            ? "bg-orange-500 text-white shadow"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Select from List
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      "Select" mode requires providing options below.
                    </p>
                  </div>

                  {/* Word Limit Type */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Word Restriction
                    </label>
                    <select
                      value={formData.summaryConfig.wordLimitType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          summaryConfig: {
                            ...formData.summaryConfig,
                            wordLimitType: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="no-more-than">No more than X words</option>
                      <option value="one-word">One Word Only</option>
                      <option value="two-words">Two Words Only</option>
                      <option value="three-words">Three Words Only</option>
                      <option value="number-only">Number Only</option>
                      <option value="word-or-number">
                        One Word and/or A Number
                      </option>
                    </select>
                  </div>

                  {/* Custom Instruction */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Custom Instruction (Overrides default)
                    </label>
                    <input
                      type="text"
                      value={formData.summaryConfig.customInstruction || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          summaryConfig: {
                            ...formData.summaryConfig,
                            customInstruction: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. Write NO MORE THAN TWO WORDS for each answer"
                    />
                  </div>

                  {/* Max Words (only if relevant) */}
                  {formData.summaryConfig.wordLimitType === "no-more-than" && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Max Words (X)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.summaryConfig.maxWords}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            summaryConfig: {
                              ...formData.summaryConfig,
                              maxWords: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Summary Options (Only if Select Mode) */}
                {formData.summaryConfig.answerMode === "select" && (
                  <div className="mt-4 border-t pt-4 border-orange-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Options for Selection{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {formData.summaryConfig.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="w-8 h-9 bg-orange-200 text-orange-800 rounded flex items-center justify-center font-bold text-sm">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [
                                ...formData.summaryConfig.options,
                              ];
                              newOptions[idx] = e.target.value;
                              setFormData({
                                ...formData,
                                summaryConfig: {
                                  ...formData.summaryConfig,
                                  options: newOptions,
                                },
                              });
                            }}
                            className="flex-1 px-3 py-1.5 border rounded focus:ring-2 focus:ring-orange-400"
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions =
                                formData.summaryConfig.options.filter(
                                  (_, i) => i !== idx,
                                );
                              setFormData({
                                ...formData,
                                summaryConfig: {
                                  ...formData.summaryConfig,
                                  options: newOptions,
                                },
                              });
                            }}
                            className="text-red-500 font-bold px-2 hover:bg-red-50 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          summaryConfig: {
                            ...formData.summaryConfig,
                            options: [...formData.summaryConfig.options, ""],
                          },
                        })
                      }
                      className="mt-2 text-sm text-orange-700 font-bold hover:underline"
                    >
                      + Add Option
                    </button>
                    {errors.summaryOptions && (
                      <p className="text-red-500 text-xs mt-2 font-bold">
                        {errors.summaryOptions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TABLE COMPLETION SPECIFIC UI */}
            {formData.questionType === "table-completion" && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Table Structure <span className="text-red-500">*</span>
                  </label>

                  {/* Grid Controls */}
                  <div className="flex gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Columns
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.tableStructure?.headers?.length || 2}
                        onChange={(e) => {
                          const cols = parseInt(e.target.value) || 1;
                          const currentHeaders =
                            formData.tableStructure?.headers || [];
                          const currentRows =
                            formData.tableStructure?.rows || [];

                          // Resize headers
                          const newHeaders = [...currentHeaders];
                          if (cols > newHeaders.length) {
                            // Add columns
                            for (let i = newHeaders.length; i < cols; i++)
                              newHeaders.push("");
                          } else {
                            // Remove columns
                            newHeaders.length = cols;
                          }

                          // Resize rows
                          const newRows = currentRows.map((row) => {
                            const newRow = [...row];
                            if (cols > newRow.length) {
                              for (let i = newRow.length; i < cols; i++)
                                newRow.push("");
                            } else {
                              newRow.length = cols;
                            }
                            return newRow;
                          });

                          setFormData((prev) => ({
                            ...prev,
                            tableStructure: {
                              ...prev.tableStructure,
                              headers: newHeaders,
                              rows: newRows,
                            },
                          }));
                        }}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Rows
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.tableStructure?.rows?.length || 2}
                        onChange={(e) => {
                          const rows = parseInt(e.target.value) || 1;
                          const cols =
                            formData.tableStructure?.headers?.length || 2;
                          const currentRows =
                            formData.tableStructure?.rows || [];

                          const newRows = [...currentRows];
                          if (rows > newRows.length) {
                            // Add rows
                            for (let i = newRows.length; i < rows; i++) {
                              newRows.push(new Array(cols).fill(""));
                            }
                          } else {
                            // Remove rows
                            newRows.length = rows;
                          }

                          setFormData((prev) => ({
                            ...prev,
                            tableStructure: {
                              ...prev.tableStructure,
                              rows: newRows,
                            },
                          }));
                        }}
                        className="w-20 px-2 py-1 border rounded"
                      />
                    </div>
                  </div>

                  {/* Header Editor */}
                  <div className="mb-4 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                      {formData.tableStructure?.headers?.map((header, idx) => (
                        <input
                          key={`h-${idx}`}
                          type="text"
                          value={header}
                          onChange={(e) => {
                            const newHeaders = [
                              ...formData.tableStructure.headers,
                            ];
                            newHeaders[idx] = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              tableStructure: {
                                ...prev.tableStructure,
                                headers: newHeaders,
                              },
                            }));
                          }}
                          placeholder={`Header ${idx + 1}`}
                          className="w-40 px-2 py-1 bg-gray-200 font-bold border rounded text-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Body Editor */}
                  <div className="overflow-x-auto">
                    <div
                      className="grid gap-2 min-w-max"
                      style={{
                        gridTemplateColumns: `repeat(${formData.tableStructure?.headers?.length || 1}, 10rem)`,
                      }}
                    >
                      {formData.tableStructure?.rows?.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <textarea
                            key={`c-${rIdx}-${cIdx}`}
                            value={cell}
                            onChange={(e) => {
                              const newRows = [...formData.tableStructure.rows];
                              newRows[rIdx][cIdx] = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                tableStructure: {
                                  ...prev.tableStructure,
                                  rows: newRows,
                                },
                              }));
                            }}
                            rows={3}
                            className="w-full px-2 py-1 border rounded text-sm resize-y"
                            placeholder="Content..."
                          />
                        )),
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Use <b>{`{{1}}`}</b>, <b>{`{{2}}`}</b> etc. in cells to
                    create blanks corresponding to Question 1, 2... Make sure
                    these match your correct answers below.
                  </p>
                </div>
              </div>
            )}

            {/* TABLE COMPLETION ANSWER KEY */}
            {formData.questionType === "table-completion" && (
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-gray-700">
                    Answer Key <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Auto-detect placeholders
                      const placeholders = new Set();
                      const regex = /\{\{(\d+)\}\}/g;
                      formData.tableStructure.rows.forEach((row) => {
                        row.forEach((cell) => {
                          let match;
                          while ((match = regex.exec(cell)) !== null) {
                            placeholders.add(match[1]);
                          }
                        });
                      });

                      const existingLabels = new Set(
                        formData.items.map((i) => i.label),
                      );
                      const newItems = [...formData.items];

                      Array.from(placeholders)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .forEach((p) => {
                          if (!existingLabels.has(p)) {
                            newItems.push({
                              label: p,
                              text: `Answer for {{${p}}}`,
                              correctAnswer: "",
                            });
                          }
                        });

                      setFormData((prev) => ({ ...prev, items: newItems }));
                    }}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition"
                  >
                    Auto-Generate from Table
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      No answers defined. Click "Auto-Generate" after adding
                      placeholders like {"{{1}}"} to the table.
                    </p>
                  )}
                  {formData.items
                    .sort((a, b) => parseInt(a.label) - parseInt(b.label))
                    .map((item, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {item.label}
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.correctAnswer}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "correctAnswer",
                                e.target.value,
                              )
                            }
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                              !item.correctAnswer
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                            placeholder={`Correct Answer for {{${item.label}}}...`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextLabel = String(formData.items.length + 1);
                    setFormData((prev) => ({
                      ...prev,
                      items: [
                        ...prev.items,
                        { label: nextLabel, text: "", correctAnswer: "" },
                      ],
                    }));
                  }}
                  className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold"
                >
                  + Add Manual Answer
                </button>
                {errors.items && (
                  <p className="text-red-500 text-xs mt-2 font-semibold">
                    {errors.items}
                  </p>
                )}
              </div>
            )}

            {/* MATCHING FEATURES SPECIFIC UI (List of Features) */}
            {formData.questionType === "matching-features" && (
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  List of Features (Options){" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Add the list of items to match against (e.g., Researchers,
                    Cities, Dates). Labels (A, B, C...) are auto-generated.
                  </p>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-sm font-bold w-6 text-gray-500">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <input
                        type="text"
                        value={
                          typeof feature === "string" ? feature : feature.text
                        } // Handle object or string
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          if (typeof newFeatures[index] === "string") {
                            newFeatures[index] = e.target.value;
                          } else {
                            newFeatures[index] = {
                              ...newFeatures[index],
                              text: e.target.value,
                            };
                          }
                          setFormData((prev) => ({
                            ...prev,
                            features: newFeatures,
                          }));
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter feature text..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFeatures = formData.features.filter(
                            (_, i) => i !== index,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            features: newFeatures,
                          }));
                        }}
                        className="text-red-500 hover:text-red-700 font-bold px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      features: [
                        ...prev.features,
                        {
                          label: String.fromCharCode(65 + prev.features.length),
                          text: "",
                        },
                      ],
                    }));
                  }}
                  className="mt-3 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm"
                >
                  + Add Feature
                </button>
                {errors.options && (
                  <p className="text-red-500 text-xs mt-2 font-semibold">
                    {errors.options}
                  </p>
                )}
              </div>
            )}

            {/* MATCHING HEADINGS / INFORMATION / MAP LABELING SPECIFIC UI */}
            {(formData.questionType === "matching-headings" ||
              formData.questionType === "matching-information" ||
              formData.questionType === "map-labeling") && ( // ✅ ADDED
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
                      : formData.questionType === "map-labeling"
                        ? "Labels on Map & Correct Option"
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
              formData.questionType !== "map-labeling" &&
              formData.questionType !== "matching-features" &&
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
