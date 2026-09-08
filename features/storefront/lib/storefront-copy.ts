// The storefront's words, apart from the markup, so the founder can review the
// voice without reading a component -- same register and the same LIFTED /
// INVENTED flagging as features/checkout/lib/order-copy.ts.
//
// Direction A ("the store as an A24 film page") added one line that is not yet
// his: see `issueDate`.

export const storefrontCopy = {
  /** LIFTED -- the masthead, verbatim off every mockup. */
  wordmark: "SWAMP MAGAZINE",
  /** LIFTED -- the byline under it, verbatim. */
  byline: "FROM LALO FARRO",
  /** LIFTED -- his own name for the drop; already shipped on coming-soon. */
  issue: "THE FIRST ISSUE",
  /**
   * NEEDS FOUNDER SIGN-OFF. "FALL 2025" is printed on the crewneck in his own
   * photographs but has never been site copy; Direction A dates the issue the
   * way a film's title card does. The words are his, the placement is ours.
   */
  issueDate: "THE FIRST ISSUE — FALL 2025",
  /** LIFTED, adapted at P2 and still flagged: the Thames-style ticker line. */
  ticker: "SWAMP MAGAZINE * THE FIRST ISSUE * ",
  /** LIFTED -- the order mockups' way back, verbatim. */
  back: "BACK",
} as const;
