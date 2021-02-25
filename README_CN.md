# pg-helper

[English](https://github.com/ckpack/pg-helper/blob/main//README.md)｜[简体中文](https://github.com/ckpack/pg-helper/blob/main//README_CN.md)

轻量级的[node-postgres](https://node-postgres.com/)的构建查询助手。

由于[node-postgres](https://node-postgres.com/) 使用序数参数查询`($1, $2, etc)`, 因此变量需要有明确的顺序，一旦参数过多使用起来就异常麻烦，`pg-helper`让你可以更容易、更快速、更安全的构建SQL。

# Install

```shell
  yarn add @c_kai/pg-helper
  npm install @c_kai/pg-helper
```


## Featrues

+ 无需关注参数顺序查询

`sql`中模版参数`{params}`会被对应`$n`替换，对应值为对象参数中对应`key`对应的值，你可以将`{}`模版参数用到任何地方,最终执行时它都会被替换成`$n`的形式

这两种查询方式是等效的

```js
// in node-postgres
pg.query(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2]);

// in pg-helper 
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = {field1} AND field2 = {field2}`, {field1, field2});
// 仍然支持下面这种写法
pgHelper.runSql(`SELECT * FROM ${tablename} WHERE field1 = $1 AND field2 = $2`, [field1, field2])
```

+ 方便的单表查询

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


+ 简便对事务的操作

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

+ 自动的掉线重连

# API

`PgHelper` Class

### new PgHelper(config, options)
+ config `Object` - same as [pg.Pool](https://node-postgres.com/api/pool)
+ options
  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰
  + options.returning `Boolean` - 如果`returning`为true返回结果会包含更新、插入、修改的数据
  + options.logger `Object` - 用于修改默认的日志，需要包含`info`、`error`两个函数
```js
const {PgHelper} = require('@c_kai/pg-helper');  
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

+ params `Array<Object>` - 插入表的数据，其中`Object`的key需要和数据表中的字段一一对应
+ options
  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰
  + options.tableName`String` - 表名称
  + options.schemaName`String` - 表名称;default: `public`
  + options.returning `Boolean｜Array` - 如果`returning`为true,返回结果会包含插入的数据，为数组时返回数组包含的字段

#### return

same as [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.delete(params, options)

Function

#### params

+ params `Object` - 模版参数，其中`Object`的key需要和SQL模版中`{params}`值一一对应

+ options

  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰

  + options.tableName`String` - 表名称

  + options.schemaName`String` - 表名称;default: `public`

  + options.returning `Boolean｜Array` - 如果`returning`为true,返回结果会包含删除的数据，为数组时返回数组包含的字段

  + options.where`Object` - 构建where sql ,你可以使用`and`、`or`嵌套
  
    ```js
    {
    	id: '>10',
    	type: '={type}',
    	or:{
    		id:'= any({ids})'，
        name: '={name}'
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

+ params `Object` - 模版参数，其中`Object`的key需要和SQL模版中`{params}`值一一对应

+ options

  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰

  + options.tableName`String` - 表名称

  + options.schemaName`String` - 表名称;default: `public`

  + options.returning `Boolean｜Array` - 如果`returning`为true,返回结果会包含更新的数据，为数组时返回数组包含的字段

  + options.where`Object` - 构建where sql ,你可以使用`and`、`or`嵌套
  
  + options. update`Array|Object` - 需要更新的字段
  
    ```js
    ['name', 'type']
    //name = {name},type={type}
    
    { name: 'name', type: 'myType'}
    //name = {name},type={myType}
     
    ['name', { field: 'type', updated_at: 'now()'}]
    // name = {name},updated_at=now()
    
    { 'name',updated_at: sqlUtils.literalSql('now()') }
    // name = {name}, updated_at = now()  
    ```

#### return

same as  [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.select(params, options)

Function

#### params

+ params `Object` - 模版参数，其中`Object`的key需要和SQL模版中`{params}`值一一对应

+ options

  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰

  + options.tableName`String` - 表名称

  + options.schemaName`String` - 表名称;default: `public`

  + options.where`Object` -  构建where sql 
  
  + options.limit `int` - limit number
  
  + options.offset `int` - offset number
  
  + options.count `Boolean` - 是否返回查询的行数
  
  + options.include `array` - 返回的字段数组default`*`
  
  + options.order `array` - 构建ordersql
  
  ```js
    ['id', ['type', 'desc'], ['name', 'asc']]
  
    // order by id, type desc, name asc
  ```
  

#### return

same as  [pg.queries](https://node-postgres.com/features/queries)



### pgHelper.runSql(sqlTem, obj, options)

Function

#### params

+ sqlTem `String` - 执行的sql

+ obj `Object` - 模版参数，其中`Object`的key需要和SQL模版中`{params}`值一一对应

+ options `Object` 

  + options.autoHump `Boolean` - 如果`autoHump`为true返回字段的名称会格式化为驼峰

  + options.returning `Boolean` - 如果`returning`为true返回结果会包含更新、插入、修改的数据

  + options.transaction `Client` - `pgHelper.getTransaction()` 返回值

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

获取一个事务`Client`



### pgHelper.runTSql(sqlTemps)

Function

会自动提交会回滚一个事务

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

提交一个事务



### pgHelper.rollback()

Function

回滚一个事务



## sqlUtils

sqlUtils

内部使用的用于构造sql的函数

### sqlUtils.literalSql(str)

#### params 

+ str `String` - 构造某些特殊SQL很有用 ，返回的sql不会在被当作模版中对key

```js
/**
SQL: UPDATE "public"."users"
     SET  "email" = {username}||'email.com' ,  "updated_at" = now() 
     where  (  "username" ={username}  )   ;
values: {"username":"jack"}
**/
const {sqlUtils} = require('@c_kai/pg-helper');

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
