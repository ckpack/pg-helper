
type Order = string[] | [string, 'desc'|'asc'| undefined ][];

interface Where {
  [index: string]: Where | string | undefined,
  and?: Where,
  or?: Where,
};

interface WhereOptions {
  [index: string]: any,
};

interface LimitOffset {
  limit?: number,
  offset?: number,
  page?: number
}

type Returning = string[] | boolean;

type Include = string | [string, string] | [string, string, string];

type Update = {
  [index: string]: any,
  [index: number]: any,
} | any [];

interface InsertItem {
  [filed: string]: any,
  [field: number]: any,
};

type Insert = InsertItem[]| InsertItem;

export {
  Order,
  Where,
  WhereOptions,
  LimitOffset,
  Returning,
  Include,
  Update,
  Insert,
  InsertItem
};
