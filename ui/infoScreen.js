const ESC = '\u001B[';

const palette = {
  violet: [187, 154, 247],
  blue: [122, 162, 247],
  cyan: [125, 207, 255],
  turquoise: [42, 195, 222],
  pink: [247, 118, 142],
  foreground: [192, 202, 245],
  muted: [86, 95, 137]
};

const logo = [
  ' ██████╗██╗  ██╗██╗ ██████╗',
  '██╔════╝██║  ██║██║██╔════╝',
  '██║     ███████║██║██║     ',
  '██║     ██╔══██║██║██║     ',
  '╚██████╗██║  ██║██║╚██████╗',
  ' ╚═════╝╚═╝  ╚═╝╚═╝ ╚═════╝'
];

function ansi(rgb, text, { bold = false, dim = false } = {}) {
  const weight = bold ? `${ESC}1m` : dim ? `${ESC}2m` : '';
  return `${weight}${ESC}38;2;${rgb.join(';')}m${text}${ESC}0m`;
}

export function supportsColor(stream = process.stdout, env = process.env) {
  if (Object.hasOwn(env, 'NO_COLOR')) return false;
  if (Object.hasOwn(env, 'FORCE_COLOR')) return env.FORCE_COLOR !== '0';
  return Boolean(stream?.isTTY);
}

export function renderInfoScreen(version, { color = supportsColor() } = {}) {
  const paint = color ? ansi : (_rgb, text) => text;
  const logoColors = [
    palette.violet,
    palette.violet,
    palette.blue,
    palette.cyan,
    palette.turquoise,
    palette.pink
  ];
  const wordmark = logo
    .map((line, index) => paint(logoColors[index], line, { bold: true }))
    .join('\n');

  return [
    '',
    wordmark,
    '',
    `  ${paint(palette.pink, '◆', { bold: true })}  ${paint(palette.foreground, 'SvelteKit for agents.', { bold: true })}`,
    `     ${paint(palette.cyan, 'Crafted by Mark Schellhas · Inspired by Rails')}`,
    '',
    `  ${paint(palette.muted, '“Work is love made visible.”', { dim: true })}`,
    `  ${paint(palette.violet, '— Kahlil Gibran')}`,
    '',
    `  ${paint(palette.muted, `CHIC v${version}  //  Run chic --help to begin`)}`,
    ''
  ].join('\n');
}
