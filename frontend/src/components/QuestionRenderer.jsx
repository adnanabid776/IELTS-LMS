import React from "react";

const QuestionRenderer = ({ question, answers, handleAnswerChange, handleSummaryAnswerChange }) => {
  return (
    <>
                {/* Question Number and Text */}
                <div className="mb-4">
                  <div className="flex items-start gap-4">
                    <span
                      className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-sm shadow ${
                        answers[question._id]
                          ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                          : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      }`}
                    >
                      {question.questionNumber}
                    </span>
                    <div className="flex-1">
                      {/* Inline input for typed summary/sentence/note completion */}
                      {(question.questionType === "sentence-completion" ||
                        question.questionType === "note-completion" ||
                        (question.questionType === "summary-completion" &&
                          question.summaryConfig?.answerMode !== "select")) &&
                      question.questionText.includes("________") ? (
                        <p className="text-gray-800 font-medium text-base leading-relaxed">
                          {(() => {
                            const parts =
                              question.questionText.split(/________+/);
                            return parts.map((part, idx) => (
                              <span key={idx}>
                                {part}
                                {idx < parts.length - 1 && (
                                  <input
                                    type="text"
                                    value={answers[question._id] || ""}
                                    onChange={(e) => {
                                      if (
                                        question.questionType ===
                                          "summary-completion" ||
                                        question.questionType ===
                                          "sentence-completion"
                                      ) {
                                        handleSummaryAnswerChange(
                                          question._id,
                                          e.target.value,
                                          question.summaryConfig,
                                        );
                                      } else {
                                        handleAnswerChange(
                                          question._id,
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    placeholder="..."
                                    className={`inline-block w-40 sm:w-48 mx-1 px-3 py-1 border-b-2 rounded-md text-sm focus:outline-none transition-all duration-200 align-baseline ${
                                      answers[question._id]
                                        ? "border-green-500 bg-green-50 text-green-800"
                                        : "border-blue-400 bg-blue-50/50 text-gray-800 focus:border-blue-600"
                                    }`}
                                  />
                                )}
                              </span>
                            ));
                          })()}
                        </p>
                      ) : (question.questionType === "sentence-completion" ||
                          question.questionType === "note-completion" ||
                          (question.questionType === "summary-completion" &&
                            question.summaryConfig?.answerMode !== "select")) &&
                        !question.questionText.includes("________") ? (
                        <p className="text-gray-800 font-medium text-base leading-relaxed">
                          {question.questionText}{" "}
                          <input
                            type="text"
                            value={answers[question._id] || ""}
                            onChange={(e) => {
                              if (
                                question.questionType ===
                                  "summary-completion" ||
                                question.questionType === "sentence-completion"
                              ) {
                                handleSummaryAnswerChange(
                                  question._id,
                                  e.target.value,
                                  question.summaryConfig,
                                );
                              } else {
                                handleAnswerChange(
                                  question._id,
                                  e.target.value,
                                );
                              }
                            }}
                            placeholder="..."
                            className={`inline-block w-40 sm:w-48 mx-1 px-3 py-1 border-b-2 rounded-md text-sm focus:outline-none transition-all duration-200 align-baseline ${
                              answers[question._id]
                                ? "border-green-500 bg-green-50 text-green-800"
                                : "border-blue-400 bg-blue-50/50 text-gray-800 focus:border-blue-600"
                            }`}
                          />
                        </p>
                      ) : (
                        <p className="text-gray-800 font-medium text-base leading-relaxed">
                          {question.questionText}
                        </p>
                      )}
                      <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                        {question.questionType.replace(/-/g, " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answer Input - Multiple Choice - Enhanced */}
                {question.questionType === "multiple-choice" &&
                  question.options && (
                    <div className="ml-14 space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                            answers[question._id] === option
                              ? "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mr-4 transition-all ${
                              answers[question._id] === option
                                ? "bg-blue-500 text-white shadow"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <input
                            type="radio"
                            name={`question-${question._id}`}
                            value={option}
                            checked={answers[question._id] === option}
                            onChange={(e) =>
                              handleAnswerChange(question._id, e.target.value)
                            }
                            className="hidden"
                          />
                          <span
                            className={`flex-1 ${
                              answers[question._id] === option
                                ? "text-blue-700 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            {option}
                          </span>
                          {answers[question._id] === option && (
                            <span className="text-blue-500 text-lg">✓</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                {/* Answer Input - True/False/Not Given - Enhanced */}
                {(question.questionType === "true-false-not-given" ||
                  question.questionType === "yes-no-not-given") && (
                  <div className="ml-14 flex flex-wrap gap-3">
                    {(question.questionType === "yes-no-not-given"
                      ? ["Yes", "No", "Not Given"]
                      : ["True", "False", "Not Given"]
                    ).map((option, idx) => (
                      <label
                        key={option}
                        className={`flex items-center px-6 py-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                          answers[question._id] === option
                            ? idx === 0
                              ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md"
                              : idx === 1
                                ? "border-red-500 bg-gradient-to-r from-red-50 to-rose-50 shadow-md"
                                : "border-gray-500 bg-gradient-to-r from-gray-50 to-slate-100 shadow-md"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question._id}`}
                          value={option}
                          checked={answers[question._id] === option}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          className="hidden"
                        />
                        <span
                          className={`font-medium ${
                            answers[question._id] === option
                              ? idx === 0
                                ? "text-green-700"
                                : idx === 1
                                  ? "text-red-700"
                                  : "text-gray-700"
                              : "text-gray-600"
                          }`}
                        >
                          {idx === 0 ? "✓ " : idx === 1 ? "✗ " : "— "}
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Answer Input - Multiple Choice Multi (Checkboxes) - NEW */}
                {question.questionType === "multiple-choice-multi" && (
                  <div className="ml-14 space-y-3">
                    <p className="text-sm font-semibold text-gray-500 mb-2">
                      Select all that apply:
                    </p>
                    {question.options.map((option, idx) => {
                      const currentAnswers = answers[question._id] || []; // Should be an array
                      const isSelected = currentAnswers.includes(
                        String.fromCharCode(65 + idx),
                      );

                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/50"
                              : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 group-hover:border-blue-400"
                            }`}
                          >
                            {isSelected && (
                              <span className="text-white text-sm font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            name={`question-${question._id}`}
                            value={String.fromCharCode(65 + idx)}
                            checked={isSelected}
                            onChange={(e) => {
                              const val = e.target.value;
                              let newAnswers = Array.isArray(currentAnswers)
                                ? [...currentAnswers]
                                : [];
                              if (e.target.checked) {
                                newAnswers.push(val);
                              } else {
                                newAnswers = newAnswers.filter(
                                  (v) => v !== val,
                                );
                              }
                              // Sort to keep consistent (A, B, C...)
                              newAnswers.sort();
                              handleAnswerChange(question._id, newAnswers);
                            }}
                            className="hidden"
                          />
                          <div className="flex gap-3">
                            <span
                              className={`font-bold ${
                                isSelected ? "text-blue-600" : "text-gray-500"
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Answer Input - Short Answer ONLY (completion types now have inline inputs above) */}
                {question.questionType === "short-answer" && (
                  <div className="ml-14 space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={answers[question._id] || ""}
                        onChange={(e) =>
                          handleAnswerChange(question._id, e.target.value)
                        }
                        placeholder="Type your answer here..."
                        className={`w-full px-5 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                          answers[question._id]
                            ? "border-green-400 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                            : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        }`}
                      />
                      {answers[question._id] && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-lg">
                          ✓
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Answer Input - Summary/Sentence Completion (Select Mode) */}
                {(question.questionType === "summary-completion" ||
                  question.questionType === "sentence-completion") &&
                  question.summaryConfig?.answerMode === "select" && (
                    <div className="ml-14 space-y-4">
                      {/* Check if options exist */}
                      {question.summaryConfig?.options?.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                          <h5 className="font-bold text-gray-700 mb-2">
                            Options:
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {question.summaryConfig.options.map((opt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-gray-300 text-sm text-gray-700"
                              >
                                <span className="font-bold mr-1.5 text-blue-600">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Instruction */}
                      {question.summaryConfig?.customInstruction && (
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                          {question.summaryConfig.customInstruction}
                        </p>
                      )}

                      <div className="relative">
                        <select
                          value={answers[question._id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          className={`w-full px-5 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 appearance-none bg-white ${
                            answers[question._id]
                              ? "border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          }`}
                        >
                          <option value="">Select an answer...</option>
                          {question.summaryConfig?.options?.map((opt, idx) => (
                            <option
                              key={idx}
                              value={String.fromCharCode(65 + idx)}
                            >
                              {String.fromCharCode(65 + idx)}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          ▼
                        </div>
                      </div>
                    </div>
                  )}

                {/* Answer Input - Matching Headings / Information / Features - NEW */}
                {(question.questionType === "matching-headings" ||
                  question.questionType === "matching-information" ||
                  question.questionType === "matching-features") &&
                  (question.items || question.features) && (
                    <div className="ml-14 space-y-4">
                      {/* Display Headings / Features List for Reference */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h5 className="font-bold text-gray-700 mb-2">
                          {question.questionType === "matching-headings"
                            ? "Options (Headings):"
                            : question.questionType === "matching-features"
                              ? "List of Features:"
                              : "Options (Paragraphs):"}
                        </h5>
                        <ul className="space-y-1">
                          {/* Handle Features (Objects) or Options (Strings) */}
                          {question.features && question.features.length > 0
                            ? question.features.map((feat, idx) => (
                                <li key={idx} className="text-sm text-gray-600">
                                  <span className="font-bold mr-2 text-gray-800">
                                    {feat.label}.
                                  </span>
                                  {feat.text}
                                </li>
                              ))
                            : question.options.map((opt, idx) => (
                                <li key={idx} className="text-sm text-gray-600">
                                  <span className="font-bold mr-2 text-gray-800">
                                    {question.questionType ===
                                    "matching-headings"
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
                                          "xi",
                                          "xii",
                                          "xiii",
                                          "xiv",
                                          "xv",
                                        ][idx] || idx + 1
                                      : String.fromCharCode(65 + idx)}
                                    .
                                  </span>
                                  {opt}
                                </li>
                              ))}
                        </ul>
                      </div>

                      {/* Display Items (Questions) and Inputs */}
                      <div className="space-y-4">
                        {(question.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 border rounded-xl bg-white hover:shadow-sm transition-shadow"
                          >
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                                {item.label || idx + 1}
                              </div>
                              <div className="flex-1 space-y-3">
                                <p className="text-gray-800 leading-relaxed">
                                  {item.text}
                                </p>
                                <div className="flex items-center gap-3">
                                  <label className="text-sm font-semibold text-gray-600">
                                    {question.questionType ===
                                    "matching-headings"
                                      ? "Select Heading:"
                                      : "Select Option:"}
                                  </label>
                                  <select
                                    value={
                                      (answers[question._id] &&
                                        answers[question._id][
                                          item.label || idx + 1
                                        ]) ||
                                      ""
                                    }
                                    onChange={(e) => {
                                      const currentAnswers =
                                        answers[question._id] || {};
                                      // Store as object { "14": "B", "15": "C" }
                                      handleAnswerChange(question._id, {
                                        ...currentAnswers,
                                        [item.label || idx + 1]: e.target.value,
                                      });
                                    }}
                                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Choose...</option>
                                    {question.features &&
                                    question.features.length > 0
                                      ? question.features.map((feat, fIdx) => (
                                          <option key={fIdx} value={feat.label}>
                                            {feat.label}
                                          </option>
                                        ))
                                      : question.options.map((opt, optIdx) => (
                                          <option
                                            key={optIdx}
                                            value={
                                              // ALWAYS send value as Letter (A, B, C...) for consistency with grading engine
                                              // The Display (children) will remain Roman Numerals for UI
                                              String.fromCharCode(65 + optIdx)
                                            }
                                          >
                                            {question.questionType ===
                                            "matching-headings"
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
                                                ][optIdx] || optIdx + 1
                                              : String.fromCharCode(
                                                  65 + optIdx,
                                                )}
                                          </option>
                                        ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Answer Input - Matching Sentence Endings */}
                {question.questionType === "matching-endings" &&
                  question.options &&
                  question.options.length > 0 && (
                    <div className="ml-14 space-y-4">
                      {/* Display Sentence Endings (Options) */}
                      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <h5 className="font-bold text-gray-700 mb-2">
                          Sentence Endings:
                        </h5>
                        <ul className="space-y-1">
                          {question.options.map((opt, idx) => (
                            <li key={idx} className="text-sm text-gray-600">
                              <span className="font-bold mr-2 text-amber-700">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              {opt}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Select Answer */}
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-semibold text-gray-600">
                          Select ending:
                        </label>
                        <select
                          value={answers[question._id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          className={`px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                            answers[question._id]
                              ? "border-green-400 bg-green-50"
                              : "border-gray-300"
                          }`}
                        >
                          <option value="">Choose...</option>
                          {question.options.map((opt, idx) => (
                            <option
                              key={idx}
                              value={String.fromCharCode(65 + idx)}
                            >
                              {String.fromCharCode(65 + idx)}
                            </option>
                          ))}
                        </select>
                        {answers[question._id] && (
                          <span className="text-green-500 text-lg">✓</span>
                        )}
                      </div>
                    </div>
                  )}

                {/* Answer Input - Table Completion - NEW */}
                {question.questionType === "table-completion" &&
                  question.tableStructure && (
                    <div className="ml-14 mt-4 overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300 bg-white text-sm rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            {question.tableStructure.headers.map(
                              (header, idx) => (
                                <th
                                  key={idx}
                                  className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {question.tableStructure.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="border border-gray-300 px-4 py-2"
                                >
                                  {cell
                                    .split(/(\{\{\d+\}\})/g)
                                    .map((part, pIdx) => {
                                      const match = part.match(/\{\{(\d+)\}\}/);
                                      if (match) {
                                        const answerIndex = match[1]; // "1", "2"...
                                        return (
                                          <span
                                            key={pIdx}
                                            className="inline-flex items-center gap-1"
                                          >
                                            <span className="text-xs font-bold text-gray-500 select-none">
                                              ({answerIndex})
                                            </span>
                                            <input
                                              type="text"
                                              className={`w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                                answers[question._id]?.[
                                                  answerIndex
                                                ]
                                                  ? "bg-blue-50 border-blue-400 font-medium text-blue-800"
                                                  : "border-gray-300"
                                              }`}
                                              value={
                                                answers[question._id]?.[
                                                  answerIndex
                                                ] || ""
                                              }
                                              onChange={(e) => {
                                                const currentAnswers =
                                                  answers[question._id] || {};
                                                handleAnswerChange(
                                                  question._id,
                                                  {
                                                    ...currentAnswers,
                                                    [answerIndex]:
                                                      e.target.value,
                                                  },
                                                );
                                              }}
                                            />
                                          </span>
                                        );
                                      }
                                      return <span key={pIdx}>{part}</span>;
                                    })}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
    </>
  );
};

export default QuestionRenderer;
