/* eslint-env jest */
import * as SqlUtils from '../../src/utils/sql-utils';

const { sqlTemplate, objHump2underline, rowsUnderline2hump, limitOffsetSql, updateSql, includeSql, whereSql, literalSql, returningSql, insertSql } = SqlUtils;
describe('test SqlUtils', () => {
  test('sqlTemplate', () => {
    const tableName = 'users';
    const sqls = sqlTemplate(`select * from ${tableName}  where username = {username}`, {
      username: 'xiaohong'
    });
    expect(sqls.sql).toBe('select * from users  where username = $1');
    expect(sqls.values).toContain('xiaohong');

    expect(() => sqlTemplate(`select * from ${tableName}  where username = {username}`, {
      username1: 'xiaohong'
    })).toThrow();
  });

  test('objHump2underline', () => {
    expect('updated_at' in objHump2underline({
      updatedAt: new Date()
    })).toBe(true);
  });

  test('rowsUnderline2hump', () => {
    expect('updatedAt' in rowsUnderline2hump([{
      updated_at: new Date()
    }])[0]).toBe(true);
  });

  test('limitOffsetSql', () => {
    expect(limitOffsetSql({})).toBe('');
    expect(limitOffsetSql({
      limit: 100
    })).toBe(' LIMIT 100 ');

    expect(limitOffsetSql({
      limit: 100,
      offset: 60
    })).toBe(' LIMIT 100 OFFSET 60 ');
    expect(limitOffsetSql({
      limit: 100,
      page: 10
    })).toBe(' LIMIT 100 OFFSET 900 ');
  });

  test('updateSql', () => {
    expect(updateSql(['username', 'password'])).toBe(' "username" = {username} ,  "password" = {password} ');
    expect(updateSql({
      username: 'not work',
      password: '123456'
    })).toBe(' "username" = {username} ,  "password" = {password} ');
    expect(updateSql({
      username: 'not work',
      password: literalSql('123456')
    })).toBe(' "username" = {username} ,  "password" = 123456 ');
    expect(updateSql(['username', {
      field: 'password',
      value: '123456'
    }])).toBe(' "username" = {username} ,  "password" = 123456 ');
  });

  test('includeSql', () => {
    expect(includeSql()).toBe(' * ');
    expect(includeSql(['username', 'passwrod'])).toBe(' "username" ,  "passwrod" ');
  });

  test('whereSql', () => {
    expect(whereSql({
      username: '=jack',
      or: {
        username: '=tom',
        and: {
          id: '>10'
        }
      }
    })).toBe(' WHERE  (  "username" =jack  OR  (  "username" =tom  AND  (  "id" >10  )   )   )  ');
  });

  test('returningSql', () => {
    expect(returningSql(['username', 'passwrod'])).toBe(' RETURNING  "username", "passwrod"  ');
    expect(returningSql()).toBe('');
  });

  test('insertSql', () => {
    expect(insertSql({
      username: 'jack',
      password: '123456'
    })).toEqual({ data: ['jack', '123456'], sql: ' (  "username", "password"  )  VALUES  ( $1, $2 ) ' });
    expect(insertSql([{
      username: 'jack',
      password: '123456'
    }, {
      username: 'chen',
      password: '123456'
    }])).toEqual({ data: ['jack', '123456', 'chen', '123456'], sql: ' (  "username", "password"  )  VALUES  ( $1, $2 ) ,  ( $3, $4 ) ' });
  });
});
