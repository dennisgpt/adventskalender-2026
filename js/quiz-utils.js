(function(window) {
  'use strict';

  function parseQuizBody(body) {
    if (!body) {
      return null;
    }

    if (typeof body === 'object') {
      return body;
    }

    if (typeof body !== 'string') {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      return null;
    }
  }

  function textWert(wert) {
    return typeof wert === 'string' ? wert.trim() : '';
  }

  function normalisiereQuizFrage(frage) {
    if (!frage || typeof frage !== 'object') {
      return null;
    }

    const question = textWert(frage.question);
    const options = Array.isArray(frage.options)
      ? frage.options.map(textWert)
      : [];
    const correct = Number.parseInt(frage.correct, 10);

    if (!question || options.length === 0 || !options.every(Boolean) || Number.isNaN(correct) || correct < 0 || correct >= options.length) {
      return null;
    }

    return {
      question: question,
      options: options,
      correct: correct
    };
  }

  function normalisiereQuizFragen(quiz) {
    if (!quiz || typeof quiz !== 'object') {
      return [];
    }

    const fragen = Array.isArray(quiz.questions)
      ? quiz.questions
      : [quiz];

    return fragen
      .map(normalisiereQuizFrage)
      .filter(Boolean);
  }

  function quizBodyZuFragen(body) {
    return normalisiereQuizFragen(parseQuizBody(body));
  }

  function baueQuizBodyAusFragen(fragen) {
    return JSON.stringify({
      questions: (Array.isArray(fragen) ? fragen : [])
        .map(normalisiereQuizFrage)
        .filter(Boolean)
    });
  }

  function quizVorschau(body) {
    const fragen = quizBodyZuFragen(body);

    if (fragen.length === 0) {
      return 'Quiz ohne Frage';
    }

    if (fragen.length === 1) {
      return fragen[0].question;
    }

    return `${fragen[0].question} (+${fragen.length - 1} weitere Fragen)`;
  }

  window.AdventskalenderQuiz = {
    parseQuizBody: parseQuizBody,
    normalisiereQuizFrage: normalisiereQuizFrage,
    normalisiereQuizFragen: normalisiereQuizFragen,
    quizBodyZuFragen: quizBodyZuFragen,
    baueQuizBodyAusFragen: baueQuizBodyAusFragen,
    quizVorschau: quizVorschau
  };
})(window);
