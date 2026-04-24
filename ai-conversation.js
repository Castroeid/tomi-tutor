(function attachAiConversation(globalScope) {
  const OPENING_LINES = [
    "איזה כיף לדבר איתך. אני מקשיב.",
    "אני כאן איתך, אפשר לספר לי לאט.",
    "מעולה שבחרת לדבר איתי לפני השיעור."
  ];

  const AFTER_RECORDING_LINES = [
    "תודה ששיתפת אותי. עכשיו נמשיך לשיעור.",
    "שמתי לב למאמץ שלך. בוא נמשיך יחד.",
    "יופי של שיתוף. ממשיכים לתרגיל הבא?"
  ];

  function pickByNumber(list, value) {
    if (!list.length) return "";
    const index = Math.abs(Number(value || 0)) % list.length;
    return list[index];
  }

  function createLeoReply(context) {
    if (context?.type === "recording-saved") {
      const sizeHint = context.recordingSize || 0;
      const line = pickByNumber(AFTER_RECORDING_LINES, sizeHint);
      return `${line} שמרתי את ההקלטה ללוח ההורים.`;
    }

    if (context?.type === "conversation-start") {
      return pickByNumber(OPENING_LINES, Date.now());
    }

    return "אני כאן בשבילך. נמשיך צעד צעד.";
  }

  globalScope.AIConversation = {
    createLeoReply
  };
})(window);
