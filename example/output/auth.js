var Auth = {
  getAuthAccessToken: (event, context, callback) => {
    const data = {};
    const response = {
      statusCode: 200,
      headers: {'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify(data),
    };
    callback(null, response);
  },
};

module.exports = Auth;