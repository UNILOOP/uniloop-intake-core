import React, { useState } from 'react';
import { SurveyForm } from './src/renderer/SurveyForm';

// Example demo component showing how to save and resume survey forms
export const SurveyResumeDemo: React.FC = () => {
  const [savedAnswers, setSavedAnswers] = useState<Record<string, any>>({});
  const [savedPage, setSavedPage] = useState<number>(0);
  const [isResuming, setIsResuming] = useState(false);

  // Example survey data
  const surveyData = {
    rootNode: {
      type: 'set',
      uuid: 'root',
      items: [
        // Your survey pages/blocks here
      ]
    }
  };

  // Handle onChange to save answers
  const handleChange = (data: Record<string, any>) => {
    console.log('Survey data changed:', data);
    // Save to local storage or your backend
    localStorage.setItem('surveyAnswers', JSON.stringify(data));
    setSavedAnswers(data);
  };

  // Handle page change to save current page
  const handlePageChange = (pageIndex: number, totalPages: number) => {
    console.log(`Page changed to ${pageIndex + 1} of ${totalPages}`);
    localStorage.setItem('surveyPage', pageIndex.toString());
    setSavedPage(pageIndex);
  };

  // Load saved data
  const loadSavedData = () => {
    const savedAnswersStr = localStorage.getItem('surveyAnswers');
    const savedPageStr = localStorage.getItem('surveyPage');

    if (savedAnswersStr) {
      const answers = JSON.parse(savedAnswersStr);
      setSavedAnswers(answers);
      setSavedPage(savedPageStr ? parseInt(savedPageStr, 10) : 0);
      setIsResuming(true);
    }
  };

  // Clear saved data
  const clearSavedData = () => {
    localStorage.removeItem('surveyAnswers');
    localStorage.removeItem('surveyPage');
    setSavedAnswers({});
    setSavedPage(0);
    setIsResuming(false);
  };

  const handleSubmit = (data: Record<string, any>) => {
    console.log('Survey submitted:', data);
    // Clear saved data after successful submission
    clearSavedData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Survey Resume Demo</h1>

        {/* Control buttons */}
        <div className="mb-6 space-x-4">
          <button
            onClick={loadSavedData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Load Saved Progress
          </button>
          <button
            onClick={clearSavedData}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear Saved Data
          </button>
          {savedAnswers && (
            <span className="text-sm text-gray-600">
              Saved answers: {Object.keys(savedAnswers).length} fields, Page: {savedPage + 1}
            </span>
          )}
        </div>

        {/* Survey Form with resume functionality */}
        <SurveyForm
          survey={surveyData}
          onSubmit={handleSubmit}
          onChange={handleChange}
          onPageChange={handlePageChange}
          // Use initialValues to load saved answers
          initialValues={isResuming ? savedAnswers : undefined}
          // Use startPage to resume from specific page
          startPage={isResuming ? savedPage : 0}
          // You can still use defaultValues for pre-populated fields
          defaultValues={{
            // Any default values you want to set
          }}
        />
      </div>
    </div>
  );
};

/*
Usage Example:

1. User fills out survey partially:
   - onChange saves answers to localStorage/backend
   - onPageChange saves current page index

2. User returns later and clicks "Load Saved Progress":
   - initialValues prop loads all saved answers
   - startPage prop resumes from the saved page

3. Key differences:
   - defaultValues: Used for pre-populating specific fields (e.g., user profile data)
   - initialValues: Used for loading previously saved answers (resume functionality)
   - Both can be used together, with initialValues taking precedence

4. Backend integration:
   - Replace localStorage with API calls to save/load survey state
   - Consider adding user authentication for secure saving
   - Add auto-save functionality with debouncing
*/