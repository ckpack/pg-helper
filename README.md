# pg-helper

[English](https://github.com/ckpack/pg-helper/blob/main//README.md)｜[简体中文](https://github.com/ckpack/pg-helper/blob/main//README_CN.md)

A lightweight [node-postgres](https://node-postgres.com/) build query utils.

Since [node-postgres](https://node-postgres.com/) uses ordinal parameter query `($1, $2, etc)`, the variables need to have a clear order. Once too many parameters are used, it will be extremely troublesome. `pg-helper` allows you to build SQL easier, faster and safer.

# Install

```shell
  yarn add @ckpack/pg-helper
  npm install @ckpack/pg-helper
```
## Featrues

+ No need to pay attention to parameter order query

The template parameter `{params}` in `sql` will be replaced by the corresponding `$n`, and the corresponding value is the value corresponding to the `key` in the object parameter. You can use the `{}` template parameter anywhere, and finally execute It will be replaced with the form of `$n`

These two query methods are equivalent:

```js
// in node-postgres
pg.query(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2]);

// in pg-helper 
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = {field1} AND field2 = {field2}`, {field1, field2});
// Still supports the following way
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2])
```

+ easier build sql

insert

```js
/**
SQL: INSERT INTO "public"."users"  (  "user", "email"  )  VALUES  ( $1, $2 ) ,  ( $3, $4 )  ;
values: ["jack","jack@test.com","chen","chen@test.com"]
**/
const result = await pgHelper.insert([{
  user: 'jack',
  email: 'jack@test.com'
},{
  user: 'chen',
  email: 'chen@test.com'
}], {
  tableName: 'users',
});
```

delete

```js
/**
SQL: DELETE FROM "public"."users"
     where  (  "username" ={username}  and "id" >0  or  (  "email" ={email}  )   )   ;
values: {"username":"jack","email":"demo@test.com"}
**/
const result = await pgHelper.delete({
  username: 'jack',
  email: 'demo@test.com'
}, {
  where: {
    username: '={username}',
    id: '>0',
    or: {
      email: '={email}'
    }
  },
  tableName: 'users',
});
```

update

```js
/**
SQL: UPDATE "public"."users"
    SET  "email" = {email} 
     where  (  "username" ={username}  )   ;
values: {"username":"jack","email":"jack@test.com"}
**/
const result = await pgHelper.update({
  username: 'jack',
  email: 'jack@test.com'
}, {
  update: ['email'],
  tableName: 'users',
  where: {
    username: '={username}'
  }
});
```

select

```js
/**
SQL: SELECT  * 
    FROM "public"."users"
     where  (  "username" ={username}  and "id" >0  or  (  "email" ={email}  )   )     ;
values: {"username":"jack","email":"demo@test.com"}
**/
const result = await pgHelper.select({
  username: 'jack',
  email: 'demo@test.com'
}, {
  where: {
    username: '={username}',
    id: '>0',
    or: {
      email: '={email}'
    }
  },
  tableName: 'users',
});

```


+ Simplified operations on transactions

```js
await pgHelper.runTSql([
    {
      sql: `DELETE FROM "public"."users"
      	    where  (  "username" ={username}  and "id" >0  or  (  "email" ={email}  )   )`,
      params: {"username":"jack","email":"jack@test.com"},
    },
    {
      sql: `UPDATE "public"."users"
    				SET  "email" = {email} 
     				where  (  "username" ={username}  ) `,
      params: {"username":"jack","email":"jack@test.com"}
    }
]);

//OR

let transaction;
try {
  transaction = await pgHelper.getTransaction();
 
  await pgHelper.update({
    username: 'jack',
    email: 'jack@test.com'
  }, {
    update: ['email'],
    tableName: 'users',
    where: {
      username: '={username}'
    }
  });
 
  await pgHelper.delete({
    username: 'jack',
  }, {
    where: {
      username: '={username}',
    },
    tableName: 'users',
  });
 
  transaction.commit();
} catch (error) {
  transaction.rollback();
}
```

+ Automatic reconnection

# API

`PgHelper` Class

### new PgHelper(config, options)
+ config `Object` - same as [pg.Pool](https://node-postgres.com/api/pool)
+ options
   + options.autoHump `Boolean` - If `autoHump` is true, the name of the returned field will be formatted as hump
   + options.returning `Boolean` - If `returning` is true, the returned result will contain updated, inserted, and modified data
   + options.logger `Object` - Used to modify the default log, it needs to include two functions `info` and `error`

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
    autoHump: true,
    logger: console,
    returning: true,
  });
```



### pgHelper.insert(params, options)

Function

#### params

+ params `Array<Object>` - insert data into the table, where the key of `Object` needs to correspond to the field in the data table one-to-one
+ options
   + options.autoHump `Boolean` - If `autoHump` is true, the name of the returned field will be formatted as hump
   + options.tableName `String` - table name
   + options.schemaName `String` - table name; default: `public`
   + options.returning `Boolean｜Array` - If `returning` is true, the returned result will contain the inserted data. If it is an array, it will return the fields contained in the array

#### return

same as [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.delete(params, options)

Function

#### params

+ params `Object` - template parameters, the key of `Object` needs to correspond to the value of `{params}` in the SQL template one-to-one

+ options

   + options.autoHump `Boolean` - If `autoHump` is true, the name of the returned field will be formatted as hump

   + options.tableName `String` - table name

   + options.schemaName `String` - table name; default: `public`

   + options.returning `Boolean｜Array`- If `returning` is true, the returned result will include the deleted data. If it is an array, it will return the fields contained in the array

   + options.where `Object` - to construct where sql, you can use `and`, `or` nesting
   
    ```js
    {
    	id: '>10',
    	type: '={type}',
    	or:{
    		id: '= any({ids})'，
        name: '={name}',
    	}
    }
    
    	// sql
    //where (id > 0 and type={type} or (id = any({ids} or name ={name} ) )
    ```

#### return

same as  [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.update(params, options)

Function

#### params

+ params `Object`- template parameters, the key of `Object` needs to correspond to the value of `{params}` in the SQL template one-to-one

+ options

   + options.autoHump `Boolean`- If `autoHump` is true, the name of the returned field will be formatted as hump

   + options.tableName `String` - table name

   + options.schemaName `String` - table name; default: `public`

   + options.returning `Boolean｜Array` - If `returning` is true, the returned result will contain updated data. If it is an array, return the fields contained in the array

   + options.where `Object` - to construct where sql, you can use `and`, `or` nesting
   
   + options. update `Array|Object` - the field to be updated
   
    ```js
    ['name', 'type']
    //name = {name},type={type}
    
    { name: 'name', type: 'myType'}
    //name = {name},type={myType}
     
    ['name', { field: 'type', updated_at: 'now()'}]
    // name = {name},updated_at=now()
    ```


    { 'name',updated_at: sqlUtils.literalSql('now()') }
    // name = {name}, updated_at = now()
    ```

#### return

same as  [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.select(params, options)

Function

#### params

+ params `Object`-template parameters, the key of `Object` needs to correspond to the value of `{params}` in the SQL template one-to-one

+ options

   + options.autoHump `Boolean` - If `autoHump` is true, the name of the returned field will be formatted as hump

   + options.tableName `String` - table name

   + options.schemaName `String` - table name; default: `public`

   + options.where `Object` - build where sql
   
   + options.limit `int` - limit number
   
   + options.offset `int` - offset number
   
   + options.count `Boolean` - Whether to return the number of rows in the query
   
   + options.include `array` - returned field array default`*`
   
   + options.order `array`- build ordersql
   
  ```js
    ['id', ['type', 'desc'], ['name', 'asc']]
  
    // order by id, type desc, name asc
  ```
  

#### return

same as  [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.runSql(sqlTem, obj, options)

Function

#### params

+ sqlTem `String` - the executed sql template

+ obj `Object` - template parameters, the key of `Object` needs to correspond to the value of `{params}` in the SQL template one-to-one

+ options `Object`

   + options.autoHump `Boolean` - If `autoHump` is true, the name of the returned field will be formatted as hump

   + options.returning `Boolean` - If `returning` is true, the returned result will contain updated, inserted, and modified data

   + options.transaction `Client` - `pgHelper.getTransaction()` return value

    ```js
    let transaction;
    try {
      transaction = await pgHelper.getTransaction();
      await pgHelper.runSql('select now()', {
        transaction,
      });
      await pgHelper.runSql('select power({a}, {b})', { a: 2, b: 4}, {
        transaction,
      });
      transaction.commit();
    
    } catch (error) {
      transaction.rollback();
    }
    ```

#### return

same as [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.getTransaction()

Function

Get a transaction `Client`



### pgHelper.runTSql(sqlTemps)

Function

will auto commit or rollback

#### params

+ sqlTemps `Array<object>`

  ```js
  [
    {
      sql: 'select power({a}, {b})',
      params: { a: 2, b: 4}
    },
    {
      sql: 'any sql',
      params: '<any params>'
    }
  ]
  ```

#### return

same as [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.commit()

Function

commit a transaction



### pgHelper.rollback()

Function

rollback a transaction



## sqlUtils

sqlUtils

Functions used internally to build sql

### sqlUtils.literalSql(str)

#### params 

+ str `String` - It is useful to construct some special SQL, the returned sql will not be used as a template for the key

```js
/**
SQL: UPDATE "public"."users"
       SET  "email" = {username}||'email.com' ,  "updated_at" = now() 
       where  (  "username" ={username}  )   ;
values: {"username":"jack"}
**/
const {sqlUtils} = require('@ckpack/pg-helper');
const result = await pgHelper.update({
  username: 'jack',
}, {
  update: {
    email: sqlUtils.literalSql("{username}||'email.com'"),
    updated_at: sqlUtils.literalSql('now()')
  },
  tableName: 'users',
  where: {
    username: '={username}'
  }
});
```



### sqlUtils.updateSql(update)


### sqlUtils.insertSql(rows)


### sqlUtils.orderSql(order)


### sqlUtils.includeSql(include)


### sqlUtils.whereSql(where)


### sqlUtils.returningSql(returning)


### sqlUtils.fieldsSql(fields)


### sqlUtils.limitOffsetSql(option)


### sqlUtils.sqlTemplate(str, obj)


### sqlUtils.rowsUnderline2hump(rows)

