import * as pg from 'pg';
import type * as PgTypes from 'pg';
import type * as PHTypes from './types/pg-helper';
import * as sqlUtils from './utils/sql-utils';
import type * as SqlUtilsType from './types/sql-utils';

const {
  sqlTemplate,
  rowsUnderline2hump,
  whereSql,
  orderSql,
  limitOffsetSql,
  updateSql,
  insertSql,
  includeSql,
  returningSql
} = sqlUtils;

const { Client, Pool } = pg;

class MyClient extends Client {
  release: any;
  async runSql (sqlTemp: PHTypes.SqlTemplate, sqlParams?:PHTypes.SqlTempParams, options?: PHTypes.SqlOptions) {
    options = options || {};
    const pgClient: PgTypes.PoolClient = options.transaction || this;

    let result;
    if (!Array.isArray(sqlParams)) {
      const { sql, values } = sqlTemplate(sqlTemp, sqlParams);
      result = await pgClient.query(sql, values);
    } else {
      result = await pgClient.query(sqlTemp, sqlParams);
    }
    if (!options.transaction) {
      await pgClient.release();
    }
    return result;
  }

  /**
   * start a transaction
   */
  async begin () {
    await this.query('BEGIN');
  }

  /**
   * commit a transaction
   */
  async commit () {
    await this.query('COMMIT');
    await this.release();
  }

  /**
   * rollback a transaction
   */
  async rollback () {
    await this.query('ROLLBACK');
    await this.release();
  }
}

class PgHelper {
  private logger: PHTypes.Logger;
  private pooConfig: PHTypes.PoolConfig;
  private autoHump: boolean;
  private returning: boolean;
  private pool!: PgTypes.Pool;
  constructor (pooConfig: PHTypes.PoolConfig, options?:PHTypes.Options) {
    options = options || {};
    pooConfig.Client = MyClient;
    this.pooConfig = pooConfig;
    this.autoHump = options.autoHump || false;
    this.returning = options.returning || true;
    this.logger = options.logger || console;

    this.initPool();
  }

  private initPool () {
    this.pool = new Pool(this.pooConfig);
    this.pool.on('error', (err) => {
      this.logger.error('数据库连接异常', err, this.pooConfig);
      this.pool.connect();
    });
    this.pool.on('connect', () => {
      this.logger.info('已连接数据库');
    });
  }

  /**
   * get a poolClient
   * @returns
   */
  async getClient () {
    const client:any = await this.pool.connect();
    return client;
  }

  /**
   * get a transaction poolClient
   * @returns
   */
  async getTransaction () {
    const client = await this.getClient();

    this.logger.info('BEGIN TRANSACTION');
    await client.begin();

    return client;
  }

  /**
   *
   * @param sqlTemp the executed sql template
   * @param sqlParams template parameters, the key of Object needs to correspond to the value of {params} in the SQL template one-to-one
   * @param options
   * @returns
   */
  async runSql (sqlTemp:PHTypes.SqlTemplate, sqlParams?:PHTypes.SqlTempParams, options?:PHTypes.SqlOptions) :Promise<PHTypes.QueryResult> {
    options = options || {};
    const pgClient = options.transaction || await this.getClient();
    const autoHump = options.autoHump || this.autoHump;
    try {
      const result = await pgClient.runSql(sqlTemp, sqlParams, options);
      if (autoHump) {
        result.rows = rowsUnderline2hump(result.rows);
      }
      return result;
    } catch (err) {
      this.logger.error(err);
      throw err;
    } finally {
      this.logger.info(`sql: ${sqlTemp};\nvalues: ${JSON.stringify(sqlParams)}`);
    }
  }

  /**
   * will auto commit or rollback
   */
  async runTSql (sqlTemps: PHTypes.TSqlTempParams[], options?:PHTypes.SqlOptions) :Promise<PHTypes.QueryResult[]> {
    options = options || {};
    // 对事务中的所有语句使用相同的实例
    const pgClient = await this.getClient();
    options.transaction = pgClient;

    try {
      await pgClient.begin();

      const result = await Promise.all(
        sqlTemps.map((sqlTemp) => this.runSql(sqlTemp.sql, sqlTemp.params, options))
      );

      await pgClient.commit();

      return result;
    } catch (err) {
      this.logger.error(err);
      await pgClient.rollback();
      throw err;
    } finally {
      this.logger.info(`TRANSACTION: ${sqlTemps.map((item) => item.sql)}`);
    }
  }

  /**
   * build insert sql
   */
  async insert (params: SqlUtilsType.Insert, options: PHTypes.InsertOptions) {
    const { tableName } = options;
    const schemaName = options.schemaName || 'public';
    const returning = options.returning || this.returning;

    const { sql: _sql, data } = insertSql(params);
    const sql = `INSERT INTO "${schemaName}"."${tableName}" ${_sql} ${returningSql(returning)}`;
    return this.runSql(sql, data, options);
  }

  /**
   * build delete sql
   */
  async delete (params:PHTypes.SqlTempParams, options: PHTypes.DeleteOptions) {
    const { tableName, where } = options;
    const schemaName = options.schemaName || 'public';
    const returning = options.returning || this.returning;

    const sql = `DELETE FROM "${schemaName}"."${tableName}"
    ${whereSql(where)} ${returningSql(returning)}`;
    return this.runSql(sql, params, options);
  }

  /**
   * build update sql
   */
  async update (params: PHTypes.SqlTempParams, options: PHTypes.UpdateOptions) {
    const { update, tableName, where } = options;
    const schemaName = options.schemaName || 'public';
    const returning = options.returning || this.returning;

    const sql = `UPDATE "${schemaName}"."${tableName}"
    SET ${updateSql(update)}
    ${whereSql(where)} ${returningSql(returning)}`;
    return this.runSql(sql, params, options);
  }

  /**
   * build select sql
   */
  async select (params: PHTypes.SqlTempParams, options: PHTypes.SelectOptions) {
    const {
      tableName, include, where, order, limit, offset, count, page
    } = options;
    const schemaName = options.schemaName || 'public';

    const sql = `SELECT ${includeSql(include)}
    FROM "${schemaName}"."${tableName}"
    ${whereSql(where)} ${orderSql(order)} ${limitOffsetSql({ limit, offset, page })} `;
    const result = await this.runSql(sql, params, options);

    if (count) {
      const countRes = await this.runSql(`SELECT COUNT(*) AS COUNT
        FROM "${schemaName}"."${tableName}"
        ${whereSql(where)}`, params, options);
      result.count = parseInt(countRes.rows[0].count, 10);
    }
    return result;
  }
}

export {
  PgHelper,
  sqlUtils
};
