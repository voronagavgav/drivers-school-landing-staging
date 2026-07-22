export const OFFICIAL_CONTENT = {
  authority: "ГСЦ МВС",
  orderNumber: "225",
  orderDate: "29.10.2025",
  sourcePage:
    "https://hsc.gov.ua/index/poslugi/vidacha-posvidchennya-vodiya/pitannya-ta-ispit-z-pdr/",
  questionsUrl:
    "https://hsc.gov.ua/wp-content/uploads/2025/11/POLOTNO-NAKAZ_04_09_2025%20%281%29.pdf",
  answersUrl:
    "https://hsc.gov.ua/wp-content/uploads/2025/11/Numer_-vidpovidej-do-nakazu.pdf",
} as const;

export const OFFICIAL_CONTENT_LABEL =
  `база тестових питань ГСЦ МВС, наказ №${OFFICIAL_CONTENT.orderNumber} від ${OFFICIAL_CONTENT.orderDate}`;

export const OFFICIAL_CONTENT_VERSION_NAME =
  `Офіційна база тестових питань ПДР (ГСЦ МВС, наказ №${OFFICIAL_CONTENT.orderNumber} від ${OFFICIAL_CONTENT.orderDate})`;

export const OFFICIAL_CONTENT_REFERENCE =
  `Офіційна база тестових питань для теоретичного іспиту (ГСЦ МВС, наказ №${OFFICIAL_CONTENT.orderNumber} від ${OFFICIAL_CONTENT.orderDate})`;

export const LEGACY_OFFICIAL_CONTENT_VERSION_NAMES = [
  "Офіційна база тестових питань ПДР (ГСЦ МВС, наказ від 04.09.2025)",
] as const;

const LEGACY_REFERENCES = new Set([
  "Офіційна база тестових питань для теоретичного іспиту (ГСЦ МВС, наказ від 04.09.2025)",
  "Офіційна база тестових питань для теоретичного іспиту (ГСЦ МВС, наказ №190 від 04.09.2025)",
]);

/** Corrects the former filename-derived label without altering specific ПДР references. */
export function normalizeOfficialContentReference(reference: string | null | undefined) {
  if (!reference) return OFFICIAL_CONTENT_REFERENCE;
  return LEGACY_REFERENCES.has(reference) ? OFFICIAL_CONTENT_REFERENCE : reference;
}
