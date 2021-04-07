# pg-helper

A lightweight [node-postgres](https://node-postgres.com/) build query utils.

Since [node-postgres](https://node-postgres.com/) uses ordinal parameter query `($1, $2, etc)`, the variables need to have a clear order. Once too many parameters are used, it will be extremely troublesome. `pg-helper` allows you to build SQL easier, faster and safer.

# Example

```js
const {PgHelper} = require('@ckpack/pg-helper');  
const pgHelper = new PgHelper({
    host,
    user,
    password,
    database,
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },{
    logger: console,
    returning: true,
});

// in node-postgres
// pg.query(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2]);

// in pg-helper 
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = {field1} AND field2 = {field2}`, {field1, field2});
// Still supports the following way
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2])
```

# [Demos](_test/)

# [Documentation](https://ckpack.github.io/pg-helper/)