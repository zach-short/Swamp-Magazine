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
  issue: "THE THIRD ISSUE",
  /**
   * Issue number and season corrected by Zach on 2026-09-08 -- the drop is the
   * THIRD issue, dated FALL 2026; the site had shipped "FIRST"/"FALL 2025".
   * The dateline itself is still ours, not his: Direction A dates the issue the
   * way a film's title card does, and that placement still wants founder sign-off.
   */
  issueDate: "THE THIRD ISSUE — FALL 2026",
  /** LIFTED, adapted at P2 and still flagged: the Thames-style ticker line. */
  ticker: "SWAMP MAGAZINE * THE THIRD ISSUE * ",
  /** LIFTED -- the order mockups' way back, verbatim. */
  back: "BACK",
} as const;
