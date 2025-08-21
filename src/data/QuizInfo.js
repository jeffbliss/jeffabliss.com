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
    {
      id: 5,
      question:
        "This has nothing to do with the AT, but how many times has Greg unsubscribed himself from nemac@unca.edu?",
      options: [
        { id: "a", text: "Once", isCorrect: false },
        { id: "b", text: "Twice", isCorrect: false },
        { id: "c", text: "Three Times", isCorrect: false },
        { id: "d", text: "Five times or more", isCorrect: true },
      ],
    },
    {
      id: 6,
      question:
        "Follow up to the previous question, when was the last time Greg did this?",
      options: [
        { id: "a", text: "July 21st, 2025", isCorrect: false },
        { id: "b", text: "August 20th, 2025", isCorrect: true },
        { id: "c", text: "Over a year ago", isCorrect: false },
        { id: "d", text: "January 6th, 2025", isCorrect: false },
      ],
    },
  ],
};

// Helper functions for quiz functionality
export const getQuizById = (id) => {
  return quizData.questions.find((question) => question.id === id);
};
