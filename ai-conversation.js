(function attachAiConversation(globalScope) {
  const OPENING_LINES = [
    "אֵיזֶה כֵּיף לְדַבֵּר אִתְּךָ. אֲנִי מַקְשִׁיב.",
    "אֲנִי כָּאן אִתְּךָ, אֶפְשָׁר לְסַפֵּר לִי לְאַט.",
    "מְעוּלֶּה שֶׁבָּחַרְתָּ לְדַבֵּר אִתִּי לִפְנֵי הַשִּׁעוּר."
  ];

  const AFTER_RECORDING_LINES = [
    "תּוֹדָה שֶׁשִּׁתַּפְתָּ אוֹתִי. עַכְשָׁיו נַמְשִׁיךְ לַשִּׁעוּר.",
    "שַׂמְתִּי לֵב לַמַּאֲמָץ שֶׁלְּךָ. בּוֹא נַמְשִׁיךְ יַחַד.",
    "יוֹפִי שֶׁל שִׁתּוּף. נַעֲבוֹר לַתַּרְגִּיל הַבָּא?"
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
      return `${line} שָׁמַרְתִּי אֶת הַהַקְלָטָה לְלוּחַ הַהוֹרִים.`;
    }

    if (context?.type === "conversation-start") {
      return pickByNumber(OPENING_LINES, Date.now());
    }

    return "אֲנִי כָּאן בִּשְׁבִילְךָ. נַמְשִׁיךְ צַעַד־צַעַד.";
  }

  globalScope.AIConversation = {
    createLeoReply
  };
})(window);
