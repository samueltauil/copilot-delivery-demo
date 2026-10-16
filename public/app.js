const form = document.querySelector('#request-form');
const nameInput = document.querySelector('#requesterName');
const descriptionInput = document.querySelector('#description');
const status = document.querySelector('#status');
const errorOutput = document.querySelector('#error');
const list = document.querySelector('#requests');
const empty = document.querySelector('#empty');
const button = form.querySelector('button');
const nameError = document.querySelector('#name-error');

function setNameError(message) {
  nameError.textContent = message;
  if (message) {
    nameInput.setAttribute('aria-invalid', 'true');
    nameInput.setAttribute('aria-describedby', 'name-error');
    nameInput.focus();
  } else {
    nameInput.removeAttribute('aria-invalid');
    nameInput.removeAttribute('aria-describedby');
  }
}

nameInput.addEventListener('input', () => {
  if (nameInput.value.trim()) setNameError('');
});

function requestItem(request) {
  const item = document.createElement('li');
  const name = document.createElement('strong');
  const description = document.createElement('span');
  name.textContent = request.requesterName ?? '(unnamed request)';
  description.textContent = request.description;
  item.append(name, description);
  return item;
}

function render(requests) {
  list.replaceChildren(...requests.map(requestItem));
  empty.hidden = requests.length > 0;
}

async function readResponse(response) {
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.error?.message ?? `Request failed (${response.status}).`);
    error.field = body.error?.field;
    throw error;
  }
  return body;
}

try {
  render((await readResponse(await fetch('/api/requests'))).requests);
} catch (error) {
  errorOutput.textContent = `Could not load requests: ${error.message}`;
}
button.disabled = false;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  errorOutput.textContent = '';
  if (!nameInput.value.trim()) {
    setNameError('Requester name is required.');
    return;
  }
  setNameError('');
  button.disabled = true;
  try {
    const body = await readResponse(await fetch('/api/requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requesterName: nameInput.value, description: descriptionInput.value })
    }));
    list.append(requestItem(body.request));
    empty.hidden = true;
    form.reset();
    status.textContent = 'Request submitted.';
  } catch (error) {
    if (error.field === 'requesterName') {
      setNameError(error.message);
    } else {
      errorOutput.textContent = `Could not submit request: ${error.message}`;
    }
  } finally {
    button.disabled = false;
  }
});
