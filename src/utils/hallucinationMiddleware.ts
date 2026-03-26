export type Degree = 'mild' | 'moderate' | 'severe';
export type HallucinationType = 
  | 'digit_drift' 
  | 'formula_corruption' 
  | 'unit_confusion' 
  | 'confident_wrong_step' 
  | 'theorem_misattribution' 
  | 'off_by_one_sign_error';

export interface HallucinationConfig {
  rate: number;
  frequency: 'random' | 'periodic';
  interval?: number;
  degree: Degree;
  enabled: boolean;
}

const ALL_TYPES: HallucinationType[] = [
  'digit_drift',
  'formula_corruption',
  'unit_confusion',
  'confident_wrong_step',
  'theorem_misattribution',
  'off_by_one_sign_error',
];

const DEFAULT_CONFIG: HallucinationConfig = {
  rate: 0.7,
  frequency: 'random',
  degree: 'moderate',
  enabled: true,
};

let questionCounter = 0;

function getTransformationCount(degree: Degree): { min: number; max: number } {
  switch (degree) {
    case 'mild': return { min: 1, max: 2 };
    case 'moderate': return { min: 3, max: 4 };
    case 'severe': return { min: 5, max: 6 };
  }
}

function shouldHallucinate(config: HallucinationConfig): boolean {
  if (!config.enabled) return false;
  questionCounter++;
  if (config.frequency === 'periodic' && config.interval) {
    return questionCounter % config.interval === 0;
  }
  return Math.random() < config.rate;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function selectTypes(degree: Degree): HallucinationType[] {
  const { min, max } = getTransformationCount(degree);
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return shuffleArray(ALL_TYPES).slice(0, Math.min(count, ALL_TYPES.length));
}

//DIGIT DRIFT
function digitDrift(text: string, degree: Degree): string {
  const driftAmount = degree === 'mild' ? 1 : degree === 'moderate' ? 2 : 3;
  
  const matches = [...text.matchAll(/\d+\.?\d*/g)];
  if (matches.length === 0) return text;
  
  const match = matches[Math.floor(Math.random() * matches.length)];
  const original = match[0];
  const digits = original.split('');
  
  if (digits.length === 0) return text;
  
  const pos = Math.floor(Math.random() * digits.length);
  let digit = parseInt(digits[pos]);
  
  const direction = Math.random() > 0.5 ? 1 : -1;
  const change = Math.floor(Math.random() * driftAmount) + 1;
  digit = Math.max(0, Math.min(9, digit + (direction * change)));
  
  digits[pos] = digit.toString();
  return text.replace(original, digits.join(''));
}

//  FORMULA CORRUPTION 
function formulaCorruption(text: string, degree: Degree): string {
  const count = degree === 'mild' ? 1 : degree === 'moderate' ? 2 : 3;
  let result = text;
  let applied = 0;
  
  const corruptions = [
    // Operator swaps
    () => {
      const ops = ['+', '-', '×', '÷', '±'];
      const replacement = ops[Math.floor(Math.random() * ops.length)];
      const targetOp = ops.filter(o => o !== replacement)[Math.floor(Math.random() * (ops.length - 1))];
      const regex = new RegExp(`\\${targetOp}`, 'g');
      const newResult = result.replace(regex, replacement);
      return newResult !== result && (result = newResult, true);
    },
    // dx/dy notation
    () => {
      const swaps = [
        [/\bdx\b/g, '∂x'],
        [/\bdy\b/g, '∂y'],
        [/\b∂x\b/g, 'dx'],
        [/\b∂y\b/g, 'dy'],
      ];
      const swap = swaps[Math.floor(Math.random() * swaps.length)];
      const newResult = result.replace(swap[0], swap[1] as string);
      return newResult !== result && (result = newResult, true);
    },
    // Integral/sum notation
    () => {
      if (result.includes('∫')) {
        result = result.replace(/∫/g, '∑');
        return true;
      } else if (result.includes('∑')) {
        result = result.replace(/∑/g, '∫');
        return true;
      }
      return false;
    },
    // Exponent manipulation
    () => {
      const newResult = result.replace(/\^(\d+)/g, (_, exp) => {
        const e = parseInt(exp);
        const change = Math.random() > 0.5 ? 1 : -1;
        return `^${Math.max(1, e + change)}`;
      });
      return newResult !== result && (result = newResult, true);
    },
    // Square/cube notation
    () => {
      if (result.includes('x²')) {
        result = result.replace(/x²/g, Math.random() > 0.5 ? 'x³' : 'x²');
        return true;
      }
      if (result.includes('x³')) {
        result = result.replace(/x³/g, Math.random() > 0.5 ? 'x²' : 'x⁴');
        return true;
      }
      return false;
    },
    // Fraction line corruption
    () => {
      const fractionMatch = result.match(/(\d+)\/(\d+)/);
      if (fractionMatch) {
        const [full, num, den] = fractionMatch;
        const wrongDen = parseInt(den) + (Math.random() > 0.5 ? 1 : -1);
        result = result.replace(full, `(${num}/${Math.max(1, wrongDen)})`);
        return true;
      }
      return false;
    },
  ];
  
  const shuffled = shuffleArray(corruptions);
  for (const corruption of shuffled) {
    if (applied >= count) break;
    if (corruption()) applied++;
  }
  
  return result;
}

// UNIT CONFUSION 
function unitConfusion(text: string, _degree: Degree): string {
  const unitPairs = [
    [/(?<![a-zA-Z])m(?![a-zA-Z0-9])/g, 'm²'],
    [/m²/g, 'm³'],
    [/m³/g, 'm'],
    [/(?<![a-zA-Z])cm(?![a-zA-Z])/g, 'mm'],
    [/mm(?![a-zA-Z])/g, 'm'],
    [/(?<![a-zA-Z])km(?![a-zA-Z])/g, 'm'],
    [/(?<![a-zA-Z])kg(?![a-zA-Z])/g, 'g'],
    [/g(?![a-zA-Z])(?=\s*$|[,.;:)]|$)/g, 'mg'],
    [/mg(?![a-zA-Z])/g, 'kg'],
    [/seconds?(?=\s|$|[,.;:)]|$)/gi, 'minutes'],
    [/minutes?(?=\s|$|[,.;:)]|$)/gi, 'hours'],
    [/hours?(?=\s|$|[,.;:)]|$)/gi, 'seconds'],
    [/radians?(?=\s|$|[,.;:)]|$)/gi, 'degrees'],
    [/degrees(?=\s|$|[,.;:)]|$)/gi, 'radians'],
    [/km\/h(?=\s|$|[,.;:)]|$)/gi, 'm/s'],
    [/m\/s(?=\s|$|[,.;:)]|$)/gi, 'km/h'],
    [/m\/s²(?=\s|$|[,.;:)]|$)/gi, 'm/s'],
    [/(?<![a-zA-Z])J(?=\s|$|[,.;:)]|$)/g, 'kJ'],
    [/kJ(?=\s|$|[,.;:)]|$)/g, 'J'],
    [/(?<![a-zA-Z])W(?=\s|$|[,.;:)]|$)/g, 'kW'],
    [/Hz(?=\s|$|[,.;:)]|$)/g, 'kHz'],
    [/Pa(?=\s|$|[,.;:)]|$)/g, 'kPa'],
    [/(?<![a-zA-Z])N(?=\s|$|[,.;:)]|$)/g, 'kN'],
  ];
  
  const pair = unitPairs[Math.floor(Math.random() * unitPairs.length)];
  const newText = text.replace(pair[0] as RegExp, pair[1] as string);
  return newText !== text ? newText : text;
}

// CONFIDENT WRONG STEP
function confidentWrongStep(text: string, degree: Degree): string {
  const wrongStepTemplates = [
    'First, we can simplify this to x = 0.',
    'Notice that this is equivalent to the previous step.',
    'By inspection, the answer is clearly visible.',
    'We can safely assume this holds for all cases.',
    'This follows directly from the definition.',
    'A quick calculation shows this equals zero.',
    'Since both sides are equal, we have shown this.',
    'This step is trivial and follows immediately.',
    'We observe that the limit approaches infinity.',
    'By symmetry, this must be true.',
    'Dividing both sides by 2 gives the result.',
    'Taking the square root of both sides.',
    'Factoring out the common term.',
    'Rearranging the equation.',
    'Substituting the known value.',
    'Applying the standard identity.',
    'Using the commutative property.',
    'Since the function is even.',
    'Because the series converges absolutely.',
    'From the triangle inequality.',
  ];
  
  const count = degree === 'mild' ? 1 : degree === 'moderate' ? 2 : 3;
  let result = text;
  
  for (let i = 0; i < count; i++) {
    const template = wrongStepTemplates[Math.floor(Math.random() * wrongStepTemplates.length)];
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const insertPos = Math.floor(Math.random() * (sentences.length - 1)) + 1;
      sentences.splice(insertPos, 0, template);
      result = sentences.join(' ');
    } else {
      result = `${template} ${result}`;
    }
  }
  
  return result;
}

// THEOREM MISATTRIBUTION 
function theoremMisattribution(text: string, degree: Degree): string {
  const theoremPairs = [
    ['chain rule', 'product rule'],
    ['product rule', 'chain rule'],
    ['quotient rule', 'product rule'],
    ['integration by parts', 'u-substitution'],
    ['u-substitution', 'integration by parts'],
    ["L'Hôpital's rule", 'Taylor series expansion'],
    ['Taylor series', "L'Hôpital's rule"],
    ['Gauss\'s theorem', 'Green\'s theorem'],
    ['Green\'s theorem', 'Stokes\' theorem'],
    ['Stokes\' theorem', 'divergence theorem'],
    ['Pythagorean theorem', 'law of cosines'],
    ['Rolle\'s theorem', 'mean value theorem'],
    ['intermediate value theorem', 'extreme value theorem'],
    ['Fermat\'s principle', 'Hamilton\'s principle'],
    ['Bayes\' theorem', 'conditional probability'],
    ['central limit theorem', 'law of large numbers'],
    ['Cauchy-Schwarz inequality', 'triangle inequality'],
    ['AM-GM inequality', 'Cauchy-Schwarz'],
    ['Euler\'s formula', 'De Moivre\'s theorem'],
    ['Newton-Raphson method', 'bisection method'],
  ];
  
  const count = degree === 'mild' ? 1 : degree === 'moderate' ? 2 : 3;
  let result = text;
  let applied = 0;
  const shuffled = shuffleArray(theoremPairs);
  
  for (const [correct, wrong] of shuffled) {
    if (applied >= count) break;
    const regex = new RegExp(`\\b${correct}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, wrong);
      applied++;
    }
  }
  
  return result;
}

// OFF BY ONE / SIGN ERROR 
function offByOneSignError(text: string, degree: Degree): string {
  const count = degree === 'mild' ? 1 : degree === 'moderate' ? 2 : 3;
  let result = text;
  let applied = 0;
  
  const errors = [
    // Sign flips
    () => {
      const signPatterns: [RegExp, (m: string) => string][] = [
        [/-(\d+)/g, (m) => m.replace('-', '+')],
        [/\+(\d+)/g, (m) => m.replace('+', '-')],
        [/±(\d+)/g, (m) => m.replace('±', '∓')],
      ];
      const [pattern, transform] = signPatterns[Math.floor(Math.random() * signPatterns.length)];
      const match = result.match(pattern);
      if (match) {
        result = result.replace(match[0], transform(match[0]));
        return true;
      }
      return false;
    },
    // Greater/less than
    () => {
      const comparisons: [RegExp, string][] = [
        [/>/g, '≥'],
        [/</g, '≤'],
        [/≥/g, '>'],
        [/≤/g, '<'],
      ];
      const [pattern, replacement] = comparisons[Math.floor(Math.random() * comparisons.length)];
      const newResult = result.replace(pattern, replacement);
      return newResult !== result && (result = newResult, true);
    },
    // Summation indices
    () => {
      const indexPatterns: [RegExp, (m: string) => string][] = [
        [/\bi=\d+/g, (m) => m.replace(/=\d+/, (n) => `=${parseInt(n.slice(1)) + 1}`)],
        [/∑_\d+/g, (m) => m.replace(/_\d+/, (n) => `_${parseInt(n.slice(1)) + 1}`)],
        [/∑_\{[^}]*(\d+)\}/g, (m) => m.replace(/(\d+)(?=\})/, (n) => String(parseInt(n) + 1))],
      ];
      const [pattern, transform] = indexPatterns[Math.floor(Math.random() * indexPatterns.length)];
      const match = result.match(pattern);
      if (match) {
        result = result.replace(match[0], transform(match[0]));
        return true;
      }
      return false;
    },
    // Floor/ceiling
    () => {
      if (result.includes('⌊')) {
        result = result.replace('⌊', '⌈').replace('⌋', '⌉');
        return true;
      } else if (result.includes('⌈')) {
        result = result.replace('⌈', '⌊').replace('⌉', '⌋');
        return true;
      }
      return false;
    },
    // Plus-minus to minus-plus
    () => {
      if (result.includes('±')) {
        result = result.replace('±', '∓');
        return true;
      }
      return false;
    },
  ];
  
  const shuffled = shuffleArray(errors);
  for (const error of shuffled) {
    if (applied >= count) break;
    if (error()) applied++;
  }
  
  return result;
}

export function applyHallucination(text: string, config?: Partial<HallucinationConfig>): string {
  const finalConfig: HallucinationConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!shouldHallucinate(finalConfig)) {
    return text;
  }
  
  const selectedTypes = selectTypes(finalConfig.degree);
  let result = text;
  
  for (const type of selectedTypes) {
    switch (type) {
      case 'digit_drift':
        result = digitDrift(result, finalConfig.degree);
        break;
      case 'formula_corruption':
        result = formulaCorruption(result, finalConfig.degree);
        break;
      case 'unit_confusion':
        result = unitConfusion(result, finalConfig.degree);
        break;
      case 'confident_wrong_step':
        result = confidentWrongStep(result, finalConfig.degree);
        break;
      case 'theorem_misattribution':
        result = theoremMisattribution(result, finalConfig.degree);
        break;
      case 'off_by_one_sign_error':
        result = offByOneSignError(result, finalConfig.degree);
        break;
    }
  }
  
  return result;
}

export function hallucinationMiddleware(text: string, config?: Partial<HallucinationConfig>): string {
  return applyHallucination(text, config);
}

export function resetCounter(): void {
  questionCounter = 0;
}

export function getCounter(): number {
  return questionCounter;
}

export function setCounter(value: number): void {
  questionCounter = value;
}
