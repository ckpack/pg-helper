const pg = require('pg');
const sqlUtils = require('./utils/sqlUtils');

const { Pool, Client } = pg;
const {
  sqlTemplate,
  rowsUnderline2hump,
  whereSql,
  orderSql,
  limitOffsetSql,
  updateSql,
  insertSql,
  includeSql,
  returningSql,
} = sqlUtils;

class MyClient extends Client {
  async runSql(sqlTem, obj = {}, options = {}) {
    const pgClient = options.transaction || this;

    let result;
    if (!Array.isArray(obj)) {
      const { sql, values } = sqlTemplate(sqlTem, obj);
      result = await pgClient.query(sql, values);
    } else {
      result = await pgClient.query(sqlTem, obj);
    }
    if (!options.transaction) {
      await pgClient.release();
    }
    return result;
  }

  async begin() {
    await this.query('BEGIN');
  }

  async commit() {
    await this.query('COMMIT');
    await this.release();
  }

  async rollback() {
    await this.query('ROLLBACK');
    await this.release();
  }
}

class PgHelper {
  constructor(pooConfig, options = {}) {
    pooConfig.Client = MyClient;
    this.pooConfig = pooConfig;
    this.autoHump = options.autoHump;
    this.returning = options.returning;
    this.logger = options.logger || console;

    this.initPool();
  }

  initPool() {
    this.pool = new Pool(this.pooConfig);
    this.pool.on('error', (err) => {
      this.logger.error('数据库连接异常', err, this.dbConfig);
      this.pool.connect();
    });
    this.pool.on('connect', () => {
      this.logger.info('已连接数据库');
    });
  }

  async getClient() {
    const client = await this.pool.connect();
    return client;
  }

  async getTransaction() {
    const client = await this.getClient();

    this.logger.info('BEGIN TRANSACTION');
    await client.begin();

    return client;
  }

  async runSql(sqlTem, obj = {}, options = {}) {
    const pgClient = options.transaction || await this.getClient();
    const autoHump = 'autoHump' in options ? options.autoHump : this.autoHump;
    try {
      const result = await pgClient.runSql(sqlTem, obj, options);
      if (autoHump) {
        result.rows = rowsUnderline2hump(result.rows);
      }
      return result;
    } catch (err) {
      this.logger.error(err);
      throw err;
    } finally {
      this.logger.info(`sql: ${sqlTem};\nvalues: ${JSON.stringify(obj)}`);
    }
  }

  /**
   * 事务
   * @param {Array<any>} sqlAndParams 参数
   * @returns { boolean } res
   */
  async runTSql(sqlTemps) {
    if (!sqlTemps || !Array.isArray(sqlTemps)) return false;

    // 对事务中的所有语句使用相同的实例
    const pgClient = await this.getClient();
    try {
      await pgClient.begin();

      const result = await Promise.all(
        sqlTemps.map((sqlTemp) => this.runSql(sqlTemp.sql, sqlTemp.parmas, {
          transaction: pgClient,
        })),
      );

      await pgClient.commit();

      return result;
    } catch (err) {
      this.logger.error(err);
      await pgClient.rollback();
      throw err;
    } finally {
      this.logger.info(`TRANSACTION：${sqlTemps.map((item) => item.sql)}`);
      await pgClient.release();
    }
  }

  async insert(params, options) {
    const { tableName } = options;
    const schemaName = 'schemaName' in options ? options.schemaName : 'public';
    const returning = 'returning' in options ? options.returning : this.returning;

    const { sql: _sql, data } = insertSql(params);
    const sql = `INSERT INTO "${schemaName}"."${tableName}" ${_sql} ${returningSql(returning)}`;
    return this.runSql(sql, data, options);
  }

  async delete(params, options) {
    const { tableName, where } = options;
    const schemaName = 'schemaName' in options ? options.schemaName : 'public';
    const returning = 'returning' in options ? options.returning : this.returning;

    const sql = `DELETE FROM "${schemaName}"."${tableName}"
    ${whereSql(where)} ${returningSql(returning)}`;
    return this.runSql(sql, params, options);
  }

  async update(params, options) {
    const { update, tableName, where } = options;
    const schemaName = 'schemaName' in options ? options.schemaName : 'public';
    const returning = 'returning' in options ? options.returning : this.returning;

    const sql = `UPDATE "${schemaName}"."${tableName}"
    SET ${updateSql(update)}
    ${whereSql(where)} ${returningSql(returning)}`;
    return this.runSql(sql, params, options);
  }

  async select(params, options) {
    const {
      tableName, include, where, order, limit, offset, count, page,
    } = options;
    const schemaName = 'schemaName' in options ? options.schemaName : 'public';

    const sql = `SELECT ${includeSql(include)}
    FROM "${schemaName}"."${tableName}"
    ${whereSql(where)} ${orderSql(order)} ${limitOffsetSql({ limit, offset, page })} `;
    const result = await this.runSql(sql, params, options);

    if (count) {
      const countRes = await this.runSql(`SELECT count(*) as count
        FROM "${schemaName}"."${tableName}"
        ${whereSql(where)}`, params, options);
      result.count = parseInt(countRes.rows[0].count, 10);
    }
    return result;
  }
}

module.exports = {
  PgHelper,
  sqlUtils,
};