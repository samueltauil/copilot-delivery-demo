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

test('requires a nonblank requester name, trims valid names, and does not create invalid requests', () => {
  const store = createRequestStore();
  for (const requesterName of [undefined, null, 7, {}, '', ' \t\n ']) {
    assert.throws(
      () => store.create({ requesterName }),
      (error) => error.message === 'Requester name is required.' && error.field === 'requesterName'
    );
    assert.equal(store.list().length, 0);
  }
  assert.equal(store.create({ requesterName: '  Demo Analyst \n' }).requesterName, 'Demo Analyst');
});
