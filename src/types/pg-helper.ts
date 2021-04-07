import type * as PgTypes from 'pg';
import type * as SqlUtilsTypes from './sql-utils';

type SqlTemplate = string

type SqlTempParams = {
  [param:string]: any,
  [param:number]: any,
}

interface PoolConfig extends PgTypes.PoolConfig {
  Client?: any
}

interface QueryResult extends PgTypes.QueryResult {
  count?: number
}

interface TSqlTempParams {
  sql: string,
  params?: SqlTempParams
}

interface Logger {
  info: (...params: any[]) => any,
  error: (...params: any[]) => any,
}

interface Options {
  autoHump?: boolean,
  returning?: boolean,
  logger?: Logger,
}

interface SqlOptions {
  autoHump?: boolean,
  returning?: boolean,
  transaction?: any,
};

interface InsertOptions {
  tableName: string,
  schemaName?: string,
  returning?: boolean,
}

interface UpdateOptions {
  tableName: string,
  schemaName?: string,
  returning?: boolean,
  where?: SqlUtilsTypes.Where,
  update: SqlUtilsTypes.Update,
}

interface SelectOptions extends SqlUtilsTypes.LimitOffset, SqlOptions {
  tableName: string,
  schemaName?: string,
  where?: SqlUtilsTypes.Where,
  include?: SqlUtilsTypes.Include[],
  order?: SqlUtilsTypes.Order[],
  count?: boolean,
}

interface DeleteOptions {
  tableName: string,
  schemaName?: string,
  returning?: boolean,
  where?: SqlUtilsTypes.Where,
}

export {
  Logger,
  SqlTemplate,
  SqlTempParams,
  TSqlTempParams,
  Options,
  SqlOptions,
  PoolConfig,
  DeleteOptions,
  SelectOptions,
  UpdateOptions,
  InsertOptions,
  QueryResult
};
