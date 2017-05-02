Swagger to Serverless Converter
==================

- Convert swagger.yml to serverless.yml
- Generate new serverless.yml with old_serverless.yml (create functions)
- Generate handler.js and other js files
- Helper for developing apis quickly

## Usage:
```
./swagger-to-serverless.js swagger.yml old_serverless.yml outputPath
```

## Example:

- In Swagger
```
paths:
  /auth/accessToken:
    get:
      tags:
        - Auth
      summary: Get access tocken
      parameters:
        - in: query
          name: account
          description: account
          type: string
          required: true
        - in: query
          name: password
          description: password
          type: string
          required: true
      responses:
        200:
          description: successful operation
          schema:
            type: object
            properties:
              accessToken:
                type: string
```

- Generate serverless.yml
```
functions:
  e2b4-GetAuthAccessToken:
    handler: handler.getAuthAccessToken
    events:
      - http:
          cors: true
          method: get
          path: /auth/accessToken
          integration: lambda
          request:
            parameters:
              querystrings:
                account: true
                password: true
```

- And generate handler.js and other js files


```
// handler.js
const auth = require('./auth.js');

module.exports = {
  getAuthAccessToken: auth.getAuthAccessToken,
};
```

```
// auth.js
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
```
- For more detail, see example


