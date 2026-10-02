import test from 'node:test';
import assert from 'node:assert/strict';

import { parseWhatsAppOrderIntent } from '../src/modules/whatsapp/whatsapp.service.js';

test('parseWhatsAppOrderIntent extracts product and quantity from a WhatsApp message', () => {
  assert.deepEqual(parseWhatsAppOrderIntent('I want 3 bags of rice'), {
    productName: 'bags of rice',
    quantity: 3
  });

  assert.deepEqual(parseWhatsAppOrderIntent('2 cement'), {
    productName: 'cement',
    quantity: 2
  });

  assert.deepEqual(parseWhatsAppOrderIntent('Rice'), {
    productName: 'rice',
    quantity: 1
  });

  assert.equal(parseWhatsAppOrderIntent('hello there'), null);
});
