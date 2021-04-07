import type { EmptyObj } from '../types';
import type * as SqlUtilsType from '../types/sql-utils';
import type { SqlTemplate, SqlTempParams } from '../types/pg-helper';

const symbolLiteral = Symbol('literal');

/**
 * sqlTemp to pg query params
 * ```
 * sqlTemp: `select * from ${USERS}  where username = {username}`
 * sqlParams: {username: 'xiaohong'}
 * to
 * sql: `select * from ${USERS}  where username = $1`
 * values: ['xiaohong']
 * ```
 * @param sqlTemp sql
 * @param sqlParams value
 */
function sqlTemplate (sqlTemp: SqlTemplate, sqlParams?: SqlTempParams) {
  sqlParams = sqlParams || {};
  const sqlArr = sqlTemp.split(/[{}]/);
  let sql = '';
  const sqlArrLen = sqlArr.length;
  const values = [];
  for (let index = 0; index < sqlArrLen; index += 1) {
    const item = sqlArr[index];
    if (!item) continue;
    if (index % 2 !== 0) {
      sql += `$${(index + 1) / 2}`;
      if (item in sqlParams) {
        values.push(sqlParams[item]);
      } else {
        throw new Error(`${item} not in params`);
      }
    } else {
      sql += item;
    }
  }
  return {
    sql,
    values
  };
}

/**
 * build fields Sql
 */
function fieldsSql (params: string[]) {
  return ` "${params.join('", "')}" `;
}

function underline2hump (str: string) {
  return str.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
}

function hump2underline (str: string) {
  return str.replace(/([A-Z])/g, (match, p1) => `_${p1.toLowerCase()}`);
}

function objHump2underline (obj: EmptyObj) {
  const formatObj: EmptyObj = {};
  Object.keys(obj).forEach((key) => {
    formatObj[hump2underline(key)] = obj[key];
  });
  return formatObj;
}

function rowsUnderline2hump (rows: EmptyObj[]) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((obj) => {
    const res: EmptyObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[underline2hump(key)] = obj[key];
      }
    }
    return res;
  });
}

/**
 * build order sql
 */
function orderSql (orders: SqlUtilsType.Order[] = []) {
  const orderSql = orders.map((order) => {
    if (Array.isArray(order)) {
      const [field, type] = order;
      return ` "${field}" ${type || ''} `;
    }
    return ` "${order}" `;
  }).join(', ');
  return orderSql ? ` ORDER BY ${orderSql} ` : ' ';
}

function getWhereSql (where: SqlUtilsType.Where| undefined, options?:SqlUtilsType.WhereOptions) {
  if (!where || Object.keys(where).length === 0) return '';
  options = options || {};
  const type = options.type || 'and';

  const fields = Object.keys(where).filter((field) => ['and', 'or'].indexOf(field) === -1);

  let sql = ' ( ';
  if (fields.length > 0) {
    const firstField = fields[0];

    sql += ` "${firstField}" ${where[firstField]} `;
    fields.shift();
    fields.forEach((field) => {
      sql += ` ${type} "${field}" ${where[field]} `;
    });
  }

  if ('and' in where) {
    sql += ` AND ${getWhereSql(where.and, { type: 'and' })} `;
  }
  if ('or' in where) {
    sql += ` OR ${getWhereSql(where.or, { type: 'or' })} `;
  }

  sql += ' ) ';

  return sql;
}

/**
 * build where sql
 */
function whereSql (where?: SqlUtilsType.Where) {
  if (!where) return '';
  let sql = getWhereSql(where);
  if (sql) {
    sql = ` WHERE ${sql} `;
  }
  return sql;
}

/**
 * build limit offset sql
 */
function limitOffsetSql (params: SqlUtilsType.LimitOffset) {
  params = params || {};
  const { limit, offset, page } = params;

  if (!limit || !Number.isInteger(limit)) {
    return '';
  }

  if (offset && Number.isInteger(offset)) {
    return ` LIMIT ${limit} OFFSET ${offset} `;
  }

  if (page && Number.isInteger(page)) {
    return ` LIMIT ${limit} OFFSET ${(page - 1) * limit} `;
  }

  return ` LIMIT ${limit} `;
}

/**
 * build include Sql
 */
function includeSql (params?: SqlUtilsType.Include[]) {
  if (!params || !Array.isArray(params)) {
    return ' * ';
  }

  return params.map((param) => {
    if (Array.isArray(param)) {
      const [field, aliax, type] = param;
      return ` "${field}" ${type ? ` :: ${type} ` : ''} ${aliax ? ` as "${aliax}" ` : ''}`;
    }
    return ` "${param}" `;
  }).join(', ');
}

/**
 * build update sql
 */
function updateSql (params:SqlUtilsType.Update = {}) {
  if (Array.isArray(params)) {
    return params.map((field) => {
      if (typeof field === 'object' && field.value) {
        const fieldValue = typeof field.value === 'string' ? field.value : field.value[symbolLiteral];
        return ` "${field.field}" = ${fieldValue} `;
      }
      return ` "${field}" = {${field}} `;
    }).join(', ');
  }
  const fields = Object.keys(params);
  return fields.filter((field) => params[field] !== undefined)
    .map((field) => {
      if (typeof params[field] === 'object' && symbolLiteral in params[field]) {
        return ` "${field}" = ${params[field][symbolLiteral]} `;
      }
      return ` "${field}" = {${field}} `;
    }).join(', ');
}

/**
 * build insert sql
 */
function insertSql (params: SqlUtilsType.Insert) {
  let fieldSql = ' ( ';
  let valuesSql = ' VALUES ';
  const data: any[] = [];
  if (!Array.isArray(params)) {
    params = [params];
  }

  const fields = Object.keys(params[0]);

  fieldSql += fieldsSql(fields);

  fieldSql += ' ) ';

  const fieldCount = fields.length;
  let ignoreCount = 0;
  valuesSql += params.map((param: SqlUtilsType.InsertItem, index: number) => {
    let valueSql = ' ( ';
    const paramFields = Object.keys(param);
    valueSql += paramFields.map((value, valueIndex) => {
      if (param[value] && typeof param[value] === 'object' && param[value][symbolLiteral]) {
        ignoreCount += 1;
        return param[value][symbolLiteral];
      }
      data.push(param[value]);
      return `$${index * fieldCount + valueIndex + 1 - ignoreCount}`;
    }).join(', ');
    valueSql += ' ) ';
    return valueSql;
  }).join(', ');
  return {
    sql: fieldSql + valuesSql,
    data
  };
}

/**
 * build returning sql
 */
function returningSql (returning?: SqlUtilsType.Returning) {
  if (!Array.isArray(returning)) {
    return returning ? ' RETURNING * ' : '';
  }

  return ` RETURNING ${fieldsSql(returning)} `;
}

/**
 * Functions used internally to build sql,  It is useful to construct some special SQL, the returned sql will not be used as a template for the key
 */
function literalSql (sql: string) {
  return {
    [symbolLiteral]: sql
  };
}

export {
  sqlTemplate,
  fieldsSql,
  rowsUnderline2hump,
  objHump2underline,
  orderSql,
  whereSql,
  limitOffsetSql,
  includeSql,
  updateSql,
  insertSql,
  returningSql,
  literalSql
};
