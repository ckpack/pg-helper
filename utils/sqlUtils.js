const symbolLiteral = Symbol('literal');

/**
 * sqlStr: `select * from ${USERS}  where username = {username}`
 * obj: {username: 'xiaohong'}
 * 转换为
 * text: `select * from ${USERS}  where username = $1`
 * value: ['xiaohong']
 * @param {string} sqlStr sql
 * @param {*} obj value
 */
function sqlTemplate(sqlTemp, obj) {
  const sqlArr = sqlTemp.split(/[{}]/);
  let sql = '';
  const sqlArrLen = sqlArr.length;
  const values = [];
  for (let index = 0; index < sqlArrLen; index += 1) {
    const item = sqlArr[index];
    if (!item) continue;
    if (index % 2 !== 0) {
      sql += `$${(index + 1) / 2}`;
      values.push(obj[item]);
    } else {
      sql += item;
    }
  }
  return {
    sql,
    values,
  };
}

function fieldsSql(params) {
  return ` "${params.join('", "')}" `;
}

function underline2hump(str) {
  return str.replace(/_([a-z])/g, (match, p1) => p1.toUpperCase());
}

function hump2underline(str) {
  return str.replace(/([A-Z])/g, (match, p1) => `_${p1.toLowerCase()}`);
}

function objHump2underline(obj) {
  const formatObj = {};
  Object.keys(obj).forEach((key) => {
    formatObj[hump2underline(key)] = obj[key];
  });
  return formatObj;
}

function rowsUnderline2hump(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((obj) => {
    const res = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[underline2hump(key)] = obj[key];
      }
    }
    return res;
  });
}

function orderSql(orders = []) {
  const orderSql = orders.map((order) => {
    if (Array.isArray(order)) {
      const [field, type] = order;
      return ` "${field}" ${type} `;
    }
    return ` "${order}" `;
  }).join(', ');
  return orderSql? ` ORDER BY ${orderSql} ` : ' ';
}

function getWhereSql(where, options = {}) {
  if (!where || Object.keys(where).length === 0) return '';
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
    sql += ` and ${getWhereSql(where.and, { type: 'and' })} `;
  }
  if ('or' in where) {
    sql += ` or ${getWhereSql(where.or, { type: 'or'})} `;
  }

  sql += ' ) ';

  return sql;
}

function whereSql(where) {
  let sql = getWhereSql(where);
  if (sql) {
    sql = ` where ${sql} `;
  }
  return sql;
}

function limitOffsetSql(params) {
  const { limit, offset, page } = params;

  if(!Number.isInteger(limit)){
    return '';
  }

  if(Number.isInteger(offset)) {
    return ` limit ${limit} offset ${offset} `;
  }

  if(Number.isInteger(page)) {
    return ` limit ${limit} offset ${(page - 1) * limit} `;
  }

  return ` limit ${limit} `;
}

function includeSql(params) {
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

function updateSql(params = {}) {
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


function insertSql(params) {
  let fieldSql = ' ( ';
  let valuesSql = ' VALUES ';
  const data = [];
  if (!Array.isArray(params)) {
    params = [params];
  }

  const fields = Object.keys(params[0]);

  fieldSql += fieldsSql(fields);

  fieldSql += ' ) ';

  const fieldCount = fields.length;
  let ignoreCount = 0;
  valuesSql += params.map((param, index) => {
    let valueSql = ' ( ';
    const paramFields = Object.keys(param);
    valueSql += paramFields.map((value, valueIndex) => {
      if (typeof param[value] === 'object' && symbolLiteral in param[value]) {
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
    data,
  };
}

function returningSql(returning) {
  if (!Array.isArray(returning)) {
    return returning ? ' returning * ' : '';
  }

  return ` returning ${fieldsSql(returning)} `;
}

function literalSql(sql) {
  return {
    [symbolLiteral]: sql,
  };
}

module.exports = {
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
  literalSql,
};