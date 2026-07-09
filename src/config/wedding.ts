/**
 * Wedding 2026 + gift obligations (§6.8, optional).
 * Seeded from the "Nunti & Botezuri" sheet. All amounts in RON.
 * Edit here if the budget changes (this view is read-only by design).
 */
export interface WeddingItem {
  vendor: string;
  paid: number; // Arvună (deposit) + items marked Total/paid
  remaining: number; // Restant
}

export const WEDDING_ITEMS: WeddingItem[] = [
  { vendor: "Formație", paid: 2500, remaining: 22500 },
  { vendor: "Biserică", paid: 0, remaining: 500 },
  { vendor: "Restaurant", paid: 3000, remaining: 79500 },
  { vendor: "Fotograf (Save the Date)", paid: 400, remaining: 0 },
  { vendor: "Fotograf", paid: 2000, remaining: 0 },
  { vendor: "Țărăbană", paid: 400, remaining: 1600 },
  { vendor: "Mr Saxobeat", paid: 0, remaining: 3500 },
  { vendor: "Alcohol Test", paid: 2250, remaining: 0 },
  { vendor: "Parfum Bar", paid: 500, remaining: 0 },
  { vendor: "Restaurant Reyn", paid: 1350, remaining: 0 },
  { vendor: "Rochie", paid: 0, remaining: 0 },
  { vendor: "Costum", paid: 0, remaining: 0 },
  { vendor: "Verighete", paid: 0, remaining: 0 },
  { vendor: "Photobooth", paid: 0, remaining: 1500 },
];

export const WEDDING_TOTALS = { paid: 9250, remaining: 105600, total: 117500 };

export interface Gift {
  name: string;
  type: "Nuntă" | "Botez";
  amount: number;
}

export const GIFT_OBLIGATIONS: Gift[] = [
  { name: "Andreea Rizoiu", type: "Nuntă", amount: 2500 },
  { name: "Andrei Ghiorghiță", type: "Botez", amount: 2000 },
  { name: "Irina Frângulă", type: "Nuntă", amount: 1000 },
  { name: "Nuntă Diana", type: "Nuntă", amount: 10000 },
  { name: "Vintilă Ana Maria", type: "Nuntă", amount: 1500 },
  { name: "Verișoară Bianca", type: "Nuntă", amount: 2000 },
  { name: "Andreea Rizoiu", type: "Nuntă", amount: 2000 },
  { name: "Petro", type: "Nuntă", amount: 2000 },
  { name: "Mary", type: "Nuntă", amount: 4000 },
  { name: "Botez Diana", type: "Botez", amount: 3000 },
  { name: "Botez Petro", type: "Botez", amount: 1300 },
  { name: "Vlad Botezatu", type: "Nuntă", amount: 1500 },
  { name: "Botez Bianca", type: "Botez", amount: 1000 },
];

export const GIFTS_TOTAL = 33800;
