const auth = require('./auth.js');
const users = require('./users.js');
const books = require('./books.js');

module.exports = {
  getAuthAccessToken: auth.getAuthAccessToken,
  postUsers: users.postUsers,
  patchUsers: users.patchUsers,
  getUsers: users.getUsers,
  getUsersBooks: users.getUsersBooks,
  getBooks: books.getBooks,
  postBooksLike: books.postBooksLike,
};
