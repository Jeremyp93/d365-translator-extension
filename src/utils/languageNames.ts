/**
 * Map of LCID to language name
 * Based on common Dynamics 365 language codes
 */
export const languageNames: Record<number, string> = {
  1025: 'Arabic (Saudi Arabia)',
  1026: 'Bulgarian (Bulgaria)',
  1027: 'Catalan (Catalan)',
  1028: 'Chinese (Traditional)',
  1029: 'Czech (Czech Republic)',
  1030: 'Danish (Denmark)',
  1031: 'German (Germany)',
  1032: 'Greek (Greece)',
  1033: 'English (United States)',
  1035: 'Finnish (Finland)',
  1036: 'French (France)',
  1037: 'Hebrew (Israel)',
  1038: 'Hungarian (Hungary)',
  1040: 'Italian (Italy)',
  1041: 'Japanese (Japan)',
  1042: 'Korean (Korea)',
  1043: 'Dutch (Netherlands)',
  1044: 'Norwegian (Bokmål)',
  1045: 'Polish (Poland)',
  1046: 'Portuguese (Brazil)',
  1048: 'Romanian (Romania)',
  1049: 'Russian (Russia)',
  1050: 'Croatian (Croatia)',
  1051: 'Slovak (Slovakia)',
  1053: 'Swedish (Sweden)',
  1054: 'Thai (Thailand)',
  1055: 'Turkish (Turkey)',
  1057: 'Indonesian (Indonesia)',
  1058: 'Ukrainian (Ukraine)',
  1060: 'Slovenian (Slovenia)',
  1061: 'Estonian (Estonia)',
  1062: 'Latvian (Latvia)',
  1063: 'Lithuanian (Lithuania)',
  1066: 'Vietnamese (Vietnam)',
  1069: 'Basque (Basque)',
  1081: 'Hindi (India)',
  1086: 'Malay (Malaysia)',
  1087: 'Kazakh (Kazakhstan)',
  1110: 'Galician (Galician)',
  2052: 'Chinese (Simplified)',
  2070: 'Portuguese (Portugal)',
  2074: 'Serbian (Latin)',
  3076: 'Chinese (Hong Kong SAR)',
  3082: 'Spanish (Spain)',
  3084: 'French (Canada)',
  5146: 'Bosnian (Bosnia and Herzegovina)',
};

/**
 * Get display name for a language code
 * @param lcid - The language code identifier
 * @returns Formatted string like "French (France) (1036)" or just "(1036)" if unknown
 */
export function getLanguageDisplayName(lcid: number): string {
  const name = languageNames[lcid];
  return name ? `${name} (${lcid})` : `(${lcid})`;
}

/**
 * Get display name for a language code
 * @param lcid - The language code identifier
 * @returns Formatted string like "French (France)" or just "1036" if unknown
 */
export function getLanguageDisplayNameWithoutLcid(lcid: number): string {
  const name = languageNames[lcid];
  return name ? `${name}` : `${lcid}`;
}