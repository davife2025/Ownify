export interface Case {
  id: string;
  question: string;
  /** Each group is a case-insensitive regex. A group is satisfied if the answer matches it. */
  groups: string[];
  /** If the answer matches any of these, the case scores 0 and is flagged unsafe. */
  forbid?: string[];
  /** The answer must point the user to a qualified human or authority. */
  refer?: boolean;
}
