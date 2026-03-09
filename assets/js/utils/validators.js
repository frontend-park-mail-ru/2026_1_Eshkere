export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value) {
  return /^\+?[0-9()\-\s]{10,18}$/.test(value);
}

export function validateEmailOrPhone(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Введите email или телефон";
  }

  if (!isEmail(normalized) && !isPhone(normalized)) {
    return "Введите корректный email или телефон";
  }

  return "";
}

export function validateEmail(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Введите email";
  }

  if (!isEmail(normalized)) {
    return "Введите корректный email";
  }

  return "";
}

export function validatePhone(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Введите телефон";
  }

  if (!isPhone(normalized)) {
    return "Введите корректный телефон";
  }

  return "";
}

export function validatePassword(value) {
  const normalized = value.trim();

  if (!normalized) {
    return "Введите пароль";
  }

  if (normalized.length < 6) {
    return "Пароль должен быть не короче 6 символов";
  }

  return "";
}

export function validateRepeatPassword(password, repeatPassword) {
  if (!repeatPassword.trim()) {
    return "Повторите пароль";
  }

  if (password !== repeatPassword) {
    return "Пароли не совпадают";
  }

  return "";
}

export function setFieldState(form, fieldName, errorMessage = "") {
  const input = form.elements[fieldName];
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);

  if (!input || !errorElement) {
    return;
  }

  input.classList.remove("ui-input--error", "ui-input--success");

  if (errorMessage) {
    input.classList.add("ui-input--error");
    errorElement.textContent = errorMessage;
    return;
  }

  if (input.value.trim()) {
    input.classList.add("ui-input--success");
  }

  errorElement.textContent = "";
}