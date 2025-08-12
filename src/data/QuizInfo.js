// Quiz data for Appalachian Trail presentation
export const quizData = {
  title: "Appalachian Trail Quiz",
  questions: [
    {
      id: 1,
      question: "How many states does the Appalachian Trail pass through?",
      options: [
        { id: "a", text: "11", isCorrect: false },
        { id: "b", text: "14", isCorrect: true },
        { id: "c", text: "7", isCorrect: false },
        { id: "d", text: "12", isCorrect: false },
      ],
    },
    {
      id: 2,
      question: "What state has the most miles on the Appalachian Trail?",
      options: [
        { id: "a", text: "North Carolina", isCorrect: false },
        { id: "b", text: "Virginia", isCorrect: true },
        { id: "c", text: "Pennsylvania", isCorrect: false },
        { id: "d", text: "Maine", isCorrect: false },
      ],
    },
    {
      id: 3,
      question:
        'How many times did Jeff use the word "fuck" in his Appalachian Trail journal?',
      options: [
        { id: "a", text: "54", isCorrect: true },
        { id: "b", text: "0", isCorrect: false },
        { id: "c", text: "111", isCorrect: false },
        { id: "d", text: "529", isCorrect: false },
      ],
    },
    {
      id: 4,
      question:
        "True or False: Jeff drank water from the French Broad River in Hot Springs, NC",
      options: [
        { id: "a", text: "True", isCorrect: true },
        { id: "b", text: "False", isCorrect: false },
        { id: "c", text: "Ew, Why?", isCorrect: true },
      ],
    },
  ],
};

// Helper functions for quiz functionality
export const getQuizById = (id) => {
  return quizData.questions.find((question) => question.id === id);
};
