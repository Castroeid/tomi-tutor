(function attachAiConversation(globalScope) {
  function createLeoReply(context) {
    const childText = String(context?.recognizedText || "").trim();
    if (context?.type === "pre_lesson" && childText) {
      if (childText.includes("לא רוצה") || childText.includes("עזוב") || childText.includes("די")) {
        return {
          reply: "אֲנִי מֵבִין. לֹא חַיָּבִים הַרְבֵּה. נַעֲשֶׂה רַק כַּרְטִיס אֶחָד אוֹ מִשְׂחָק קָטָן?",
          emotion: "resistant",
          nextAction: "offer_choice",
        };
      }
      if (childText.includes("אני יודע")) {
        return {
          reply: "מְעוּלֶּה, אֲנִי שָׂמֵחַ שֶׁאַתָּה יוֹדֵעַ. בּוֹא תַּרְאֶה לִי רַק דֻּגְמָה קְטַנָּה אַחַת.",
          emotion: "proud",
          nextAction: "continue",
        };
      }
      if (childText.includes("קשה") || childText.includes("מעצבן")) {
        return {
          reply: "זֶה מוּבָן לְגַמְרֵי. נְפַשֵּׁט לְצַעַד קָטָן וְאִם תִּרְצֶה נַעֲשֶׂה הַפְסָקָה קְצָרָה.",
          emotion: "frustrated",
          nextAction: "simplify",
        };
      }
      return {
        reply: `שָׁמַעְתִּי אוֹתְךָ: ${childText}. בּוֹא נַעֲשֶׂה עַכְשָׁיו צַעַד קָטָן יַחַד.`,
        emotion: "ready",
        nextAction: "encourage",
      };
    }

    if (context?.type === "conversation-start") {
      return {
        reply: "מְעוּלֶּה, אֲנִי מַקְשִׁיב לְךָ.",
        emotion: "ready",
        nextAction: "continue",
      };
    }

    return {
      reply: "אֲנִי כָּאן בִּשְׁבִילְךָ. נַעֲשֶׂה צַעַד קָטָן יַחַד.",
      emotion: "unknown",
      nextAction: "encourage",
    };
  }

  globalScope.AIConversation = {
    createLeoReply
  };
})(window);
