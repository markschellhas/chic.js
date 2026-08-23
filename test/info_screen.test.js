import { renderInfoScreen, supportsColor } from '../ui/infoScreen.js';

describe('default info screen', () => {
  it('renders the Chic wordmark, tagline, quote, and version', () => {
    const output = renderInfoScreen('2.0.0', { color: false });

    expect(output).toContain(' ██████╗██╗  ██╗██╗ ██████╗');
    expect(output).toContain('SvelteKit for agents.');
    expect(output).toContain('Crafted by Mark Schellhas · Inspired by Rails');
    expect(output).toContain('“Work is love made visible.”');
    expect(output).toContain('— Kahlil Gibran');
    expect(output).toContain('CHIC v2.0.0  //  Run chic --help to begin');
    expect(output).not.toContain('\u001B[');
  });

  it('uses truecolor ANSI styling when color is enabled', () => {
    const output = renderInfoScreen('2.0.0', { color: true });

    expect(output).toContain('\u001B[38;2;187;154;247m');
    expect(output).toContain('\u001B[38;2;247;118;142m');
    expect(output).toContain('\u001B[0m');
  });

  it('honors terminal color preferences', () => {
    expect(supportsColor({ isTTY: true }, {})).toBe(true);
    expect(supportsColor({ isTTY: true }, { NO_COLOR: '' })).toBe(false);
    expect(supportsColor({ isTTY: false }, { FORCE_COLOR: '1' })).toBe(true);
    expect(supportsColor({ isTTY: true }, { FORCE_COLOR: '0' })).toBe(false);
  });
});
