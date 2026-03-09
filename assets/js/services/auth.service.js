const USERS_KEY = "ads_users";
const AUTH_KEY = "ads_auth";

function readUsers() {
  const raw = localStorage.getItem(USERS_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUsers() {
  return readUsers();
}

export function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  // Раскоментить эту строку, когда будет реализован сервис авторизации
  //return Boolean(getCurrentUser());

  // Заглушка: как будто пользователь авторизован
  return true;
}

export function registerUser({ email, phone, password }) {
  const users = readUsers();

  const exists = users.some((user) => user.email === email.trim().toLowerCase());

  if (exists) {
    return {
      ok: false,
      message: "Пользователь с таким email уже существует"
    };
  }

  const newUser = {
    id: Date.now().toString(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    password: password.trim()
  };

  users.push(newUser);
  writeUsers(users);

  return {
    ok: true,
    user: newUser
  };
}

export function loginUser({ login, password }) {
  const users = readUsers();
  const normalizedLogin = login.trim().toLowerCase();
  const normalizedPassword = password.trim();

  const user = users.find((item) => {
    return (
      (item.email === normalizedLogin || item.phone === login.trim()) &&
      item.password === normalizedPassword
    );
  });

  if (!user) {
    return {
      ok: false,
      message: "Неверный логин или пароль"
    };
  }

  const authUser = {
    id: user.id,
    email: user.email,
    phone: user.phone
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));

  return {
    ok: true,
    user: authUser
  };
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
}