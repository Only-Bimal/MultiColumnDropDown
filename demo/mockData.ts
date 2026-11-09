export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const CATEGORIES = [
  'Electronics', 'Computers', 'Hardware', 'Industrial', 'Office Supplies',
  'Automotive', 'Network Gear', 'Sensors', 'Instruments', 'Machinery'
];

const ADJECTIVES = [
  'Pro', 'Ultra', 'Precision', 'Enterprise', 'Quantum', 'Dynamic', 'Turbo',
  'Hyper', 'Micro', 'Heavy-Duty', 'Industrial', 'Omni', 'Compact', 'Smart'
];

const NOUNS = [
  'Controller', 'Sensor', 'Transceiver', 'Processor', 'Actuator', 'Switch',
  'Oscillator', 'Converter', 'Module', 'Regulator', 'Valve', 'Amplifier'
];

export function generate5000Products(): Product[] {
  const products: Product[] = [];
  const count = 5000;

  for (let i = 1; i <= count; i++) {
    const adj = ADJECTIVES[i % ADJECTIVES.length];
    const noun = NOUNS[(i * 3) % NOUNS.length];
    const cat = CATEGORIES[(i * 7) % CATEGORIES.length];
    const price = +(10 + (i * 1.37) % 990).toFixed(2);
    const stock = (i * 17) % 500;
    const status = stock === 0 ? 'Out of Stock' : stock < 25 ? 'Low Stock' : 'In Stock';

    products.push({
      id: i,
      sku: `SKU-${10000 + i}`,
      name: `${adj} ${noun} ${i}`,
      category: cat,
      price,
      stock,
      status
    });
  }

  return products;
}

export const COUNTRIES = [
  { code: 'US', name: 'United States', continent: 'North America', capital: 'Washington, D.C.', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe', capital: 'London', dial: '+44' },
  { code: 'CA', name: 'Canada', continent: 'North America', capital: 'Ottawa', dial: '+1' },
  { code: 'AU', name: 'Australia', continent: 'Oceania', capital: 'Canberra', dial: '+61' },
  { code: 'DE', name: 'Germany', continent: 'Europe', capital: 'Berlin', dial: '+49' },
  { code: 'FR', name: 'France', continent: 'Europe', capital: 'Paris', dial: '+33' },
  { code: 'JP', name: 'Japan', continent: 'Asia', capital: 'Tokyo', dial: '+81' },
  { code: 'IN', name: 'India', continent: 'Asia', capital: 'New Delhi', dial: '+91' },
  { code: 'BR', name: 'Brazil', continent: 'South America', capital: 'Brasília', dial: '+55' },
  { code: 'ZA', name: 'South Africa', continent: 'Africa', capital: 'Pretoria', dial: '+27' },
  { code: 'SG', name: 'Singapore', continent: 'Asia', capital: 'Singapore', dial: '+65' },
  { code: 'CH', name: 'Switzerland', continent: 'Europe', capital: 'Bern', dial: '+41' },
  { code: 'SE', name: 'Sweden', continent: 'Europe', capital: 'Stockholm', dial: '+46' },
  { code: 'NL', name: 'Netherlands', continent: 'Europe', capital: 'Amsterdam', dial: '+31' },
  { code: 'IT', name: 'Italy', continent: 'Europe', capital: 'Rome', dial: '+39' },
  { code: 'ES', name: 'Spain', continent: 'Europe', capital: 'Madrid', dial: '+34' },
  { code: 'KR', name: 'South Korea', continent: 'Asia', capital: 'Seoul', dial: '+82' },
  { code: 'MX', name: 'Mexico', continent: 'North America', capital: 'Mexico City', dial: '+52' },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania', capital: 'Wellington', dial: '+64' },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Asia', capital: 'Abu Dhabi', dial: '+971' }
];

