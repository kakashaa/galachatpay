export interface FormatGroup {
  digits: number;
  patterns: string[];
}

export interface LevelFormats {
  minLevel: number;
  maxLevel: number;
  label: string;
  groups: FormatGroup[];
}

/** Gift patterns – available from level 70+ for gifting IDs to other users */
export interface GiftLevelFormats {
  minLevel: number;
  label: string;
  groups: FormatGroup[];
}

export const giftLevelFormats: GiftLevelFormats[] = [
  {
    minLevel: 70, label: "إهداء ID (لفل 70+)",
    groups: [
      { digits: 5, patterns: ["ABCDD", "ABCBA", "ADDDA"] },
      { digits: 6, patterns: ["ABBBBC", "AAAABC", "ABCCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["ABCDDDD", "ABAAAAD", "BBAACCD", "ABDDDDD"] },
    ],
  },
];

export const levelFormats: LevelFormats[] = [
  {
    minLevel: 20, maxLevel: 29, label: "Level 20-29",
    groups: [
      { digits: 7, patterns: ["ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 30, maxLevel: 39, label: "Level 30-39",
    groups: [
      { digits: 6, patterns: ["AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 40, maxLevel: 49, label: "Level 40-49",
    groups: [
      { digits: 5, patterns: ["ABCDD", "ABCBA", "ACBBB"] },
      { digits: 6, patterns: ["ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 50, maxLevel: 59, label: "Level 50-59",
    groups: [
      { digits: 5, patterns: ["AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"] },
      { digits: 6, patterns: ["ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 60, maxLevel: 69, label: "Level 60-69",
    groups: [
      { digits: 5, patterns: ["ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"] },
      { digits: 6, patterns: ["AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 70, maxLevel: 79, label: "Level 70-79",
    groups: [
      { digits: 4, patterns: ["ABCD", "AABC", "ABBC", "XXAB", "XABX"] },
      { digits: 5, patterns: ["XXXAA", "AAXXX", "AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDA", "AABBC"] },
      { digits: 6, patterns: ["XABABX", "AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 80, maxLevel: 89, label: "Level 80-89",
    groups: [
      { digits: 4, patterns: ["ABBB", "AAAA", "XAAA", "XXAA", "XXXA", "AAAB", "ABCD", "AABC", "ABBC", "XABX"] },
      { digits: 5, patterns: ["XXXXX", "XAAAA", "XXAXX", "XXXXA", "XXXAA", "AAXXX", "AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "AABBC"] },
      { digits: 6, patterns: ["XXXXXX", "XAAAAX", "XXXAAA", "XXXXXA", "XXAABB", "XABABX", "AAAAAA", "ABBBBB", "ABCDEF", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["XXXXAAA", "XAAAAAA", "ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
  {
    minLevel: 90, maxLevel: 100, label: "Level 90-100",
    groups: [
      { digits: 3, patterns: ["ABB", "ABA"] },
      { digits: 4, patterns: ["XXXX", "ABBB", "AAAA", "XAAA", "XXAA", "XXXA", "AAAB", "ABCD", "AABC", "ABBC", "XXAB", "XABX"] },
      { digits: 5, patterns: ["XXXXX", "XXAXX", "XXXXA", "XXXAA", "AAXXX", "AAAAA", "XXABA", "XABAX", "ABBBB", "ABCDE", "ABBBA", "AAAAB", "AABAA", "ABABA", "ABCDD", "ABCBA", "AABBC"] },
      { digits: 6, patterns: ["XXXXXX", "XAAAAX", "XXXAAA", "XXXXXA", "XXAABB", "XABABX", "AAAAAA", "ABBBBB", "ABCDEP", "AAAAAB", "ABBBBA", "AAABBB", "ABBABB", "ABBBBC", "ABABAB", "AAAABC", "AABCCC", "ABACCC", "AAABBC"] },
      { digits: 7, patterns: ["XXXXAAA", "XAAAAAA", "ABBBBBB", "AAAAAAA", "ABCDEFG", "ABCCCCC", "ABBABBA", "ABBBBBA", "AABBBAA", "AAAABBB", "ABCDDDD", "ABABABA", "AAAAABC", "ABCAAAA", "AABBCCD", "AAAABCD"] },
    ],
  },
];
