import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequestStore } from '../src/requests.js';

test('creates, lists, and isolates requests without exposing stored objects', () => {
  const store = createRequestStore();
  const first = store.create({ requesterName: 'Demo Analyst' });
  const second = store.create({ requesterName: 'Demo Developer', description: 'Synthetic request' });
  assert.notEqual(first.id, second.id);
  assert.equal(first.description, '');
  first.description = 'changed';
  const listed = store.list();
  listed[0].description = 'also changed';
  assert.equal(store.list()[0].description, '');
  assert.equal(createRequestStore().list().length, 0);
});

test('rejects invalid objects and descriptions without creating a request', () => {
  const store = createRequestStore();
  for (const value of [null, true, 7, 'text', []]) {
    assert.throws(() => store.create(value), /JSON object/);
  }
  for (const description of [null, 0, false, [], {}]) {
    assert.throws(() => store.create({ requesterName: 'Demo', description }), /Description must be text/);
  }
  assert.equal(store.list().length, 0);
});

test('rejects every invalid name without mutation and trims valid Unicode names', () => {
  const store = createRequestStore();
  for (const requesterName of [undefined, null, 0, true, [], {}, '', ' ', '\t\n']) {
    assert.throws(() => store.create({ requesterName }), {
      message: 'Requester name is required.', field: 'requesterName'
    });
    assert.deepEqual(store.list(), []);
  }
  assert.equal(store.create({ requesterName: '  Jos\u00e9  ' }).requesterName, 'Jos\u00e9');
});
