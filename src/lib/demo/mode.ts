/**
 * Whether this build talks to a real backend or to the in-browser demo.
 *
 * Decided at build time so the demo store and its seed data are tree-shaken
 * out of a normal build entirely — a production bundle should not carry a fake
 * pharmacy around, and there should be no runtime switch that could put a real
 * deployment into demo mode by accident.
 */
export const isDemo = import.meta.env.VITE_DEMO === 'true';
