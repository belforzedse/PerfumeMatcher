export const toPersianNumbers = (value: string): string => {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return value.replace(/[0-9]/g, (digit) => persianDigits[Number(digit)]);
};

