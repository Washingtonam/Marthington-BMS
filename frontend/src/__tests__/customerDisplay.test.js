import { describe, expect, it } from 'vitest';
import { buildCustomerDisplayUrl, resolveCustomerDisplayTitle } from '../utils/customerDisplay.js';

describe('resolveCustomerDisplayTitle', () => {
  it('uses the custom display message when one is set', () => {
    expect(resolveCustomerDisplayTitle('Marthington', 'Welcome to Marthington')).toBe('Welcome to Marthington');
  });

  it('falls back to a business-name greeting when no custom message is provided', () => {
    expect(resolveCustomerDisplayTitle('Marthington', '')).toBe('Welcome to Marthington');
  });

  it('falls back to a generic welcome when no business name is available', () => {
    expect(resolveCustomerDisplayTitle('', '   ')).toBe('Welcome');
  });
});

describe('buildCustomerDisplayUrl', () => {
  it('routes to the hash-based customer view page', () => {
    expect(buildCustomerDisplayUrl('https://example.com/app')).toBe('https://example.com/#/app/customer-view');
  });
});
