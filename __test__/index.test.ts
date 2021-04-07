/* eslint-env jest */
import { PgHelper } from '../src';

describe('test pg-helper', () => {
  const poolConfig = {
    host: '127.0.0.1',
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    port: 5432
  };
  const pgHelper = new PgHelper(poolConfig, {
    returning: true
  });

  test('runSql', async () => {
    const client = await pgHelper.runSql('select 1 + 1 as res');
    expect(client.rows[0].res).toBe(2);

    const client2 = await pgHelper.runSql('select $1::int + $2::int as res', [1, 2]);
    expect(client2.rows[0].res).toBe(3);

    const client3 = await pgHelper.runSql('select {num1}::int + {num2}::int as res', {
      num1: 2,
      num2: 3
    });
    expect(client3.rows[0].res).toBe(5);
  });
  test('runTSql', async () => {
    const result = await pgHelper.runTSql([{
      sql: 'select 1 + 1 as res'
    }, {
      sql: 'select $1::int + $2::int as res',
      params: [1, 2]
    }, {
      sql: 'select {num1}::int + {num2}::int as res',
      params: { num1: 2, num2: 3 }
    }]);
    expect(result.length).toBe(3);
  });
  test('getTransaction', async () => {
    let transaction;
    try {
      transaction = await pgHelper.getTransaction();
      await pgHelper.runSql('select 1 + 1 as res', {
        transaction: transaction
      });
      await pgHelper.runSql('select 1 + 1 as res', {
        transaction: transaction
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }

    try {
      transaction = await pgHelper.getTransaction();
      await pgHelper.runSql('errselect 1 + 1 as res', {
        transaction: transaction
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }
  });

  test('insert', async () => {
    const result = await pgHelper.insert({
      username: 'chenkai',
      passwrod: 'test'
    }, {
      tableName: 'users'
    });
    console.log(result.rows[0].username === 'chenkai');

    const result2 = await pgHelper.insert({
      username: 'chenkai',
      passwrod: 'test'
    }, {
      returning: false,
      tableName: 'users'
    });
    console.log(result2.rows.length === 0);
  });

  test('update', async () => {
    await pgHelper.update({
      username: 'chenkai2',
      updated_at: new Date()
    }, {
      tableName: 'users',
      update: ['username', 'updated_at']
    });

    await pgHelper.update({
      updated_at: new Date()
    }, {
      tableName: 'users',
      update: [{
        field: 'username',
        value: "'chenkai3'"
      }, {
        field: 'updated_at',
        value: '{updated_at}'
      }]
    });
  });

  test('select', async () => {
    const users = await pgHelper.select({
      username: 'chenkai3'
    }, {
      autoHump: true,
      tableName: 'users',
      where: {
        username: '={username}',
        or: {
          id: ' < 3'
        }
      },
      count: true,
      limit: 10,
      page: 9,
      order: [['id', 'desc'], ['username']],
      include: ['id', ['username', '用户名']]
    });
    console.log(users.count);
  });

  test('delete', async () => {
    await pgHelper.delete({
      username: 'chenkai3'
    }, {
      tableName: 'users',
      where: {
        username: '={username}',
        or: {
          id: ' < 3'
        }
      }
    });
    await pgHelper.delete({}, {
      tableName: 'users'
    });
  });
});
