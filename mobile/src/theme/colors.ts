export const colors = {
  label: '#17211D',
  secondaryLabel: '#66706A',
  separator: '#DDE3DE',
  background: '#F7F5EF',
  groupedBackground: '#F1EFE8',
  surface: '#FFFFFF',
  destructive: '#C93434',
  destructiveBackground: '#FFF0F0',
  success: '#26734D',
  successBackground: '#EDF8F1',
  onBrand: '#FFFFFF',
} as const;

const brand = { primary: '#17211D', secondary: '#DCEAD8', accent: '#F6D25F' } as const;

export function useBrandColors() {
  return brand;
}
